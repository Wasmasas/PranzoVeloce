import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { kv } from '@vercel/kv';

// --- CONFIGURATION ---
// If KV_REST_API_URL is defined, we use Vercel KV (Cloud).
// Otherwise, we use local JSON file (Local Dev).
const USE_CLOUD_DB = !!process.env.KV_REST_API_URL;
const DB_KEY = 'LUNCH_APP_DB'; // Key for Redis

// Path to our local JSON "database" (Fallback)
const dbPath = path.join(process.cwd(), 'data', 'db.json');

export const dynamic = 'force-dynamic';

// --- HELPERS ---

async function readDb() {
    // 1. Cloud Mode
    if (USE_CLOUD_DB) {
        try {
            const data = await kv.get(DB_KEY);
            const defaultData = { activeMenu: [], allDishes: [], orders: [], feedbacks: [], config: { disableCutoff: false } };
            if (!data) return defaultData;

            // Ensure compatibility if fields are missing
            if (!data.feedbacks) data.feedbacks = [];
            if (!data.config) data.config = { disableCutoff: false };
            if (!data.tables) data.tables = [
                { id: 't1', name: 'Tavolo 1', capacity: 10 },
                { id: 't2', name: 'Tavolo 2', capacity: 10 },
                { id: 't3', name: 'Tavolo 3', capacity: 10 }
            ];
            return data;
        } catch (error) {
            console.error('KV Read Error:', error);
            return { activeMenu: [], allDishes: [], orders: [], feedbacks: [], config: { disableCutoff: false }, tables: [] };
        }
    }

    // 2. Local File Mode (Legacy)
    if (!fs.existsSync(dbPath)) {
        return { activeMenu: [], allDishes: [], orders: [], feedbacks: [], config: { disableCutoff: false }, tables: [] };
    }
    const data = fs.readFileSync(dbPath, 'utf8');
    try {
        const parsed = JSON.parse(data);
        if (!parsed.feedbacks) parsed.feedbacks = [];
        if (!parsed.config) parsed.config = { disableCutoff: false };
        if (!parsed.tables) parsed.tables = [
            { id: 't1', name: 'Tavolo 1', capacity: 10 },
            { id: 't2', name: 'Tavolo 2', capacity: 10 },
            { id: 't3', name: 'Tavolo 3', capacity: 10 }
        ];
        return parsed;
    } catch (err) {
        return { activeMenu: [], allDishes: [], orders: [], feedbacks: [], config: { disableCutoff: false }, tables: [] };
    }
}

async function writeDb(data) {
    // 1. Cloud Mode
    if (USE_CLOUD_DB) {
        await kv.set(DB_KEY, data);
        return;
    }

    // 2. Local File Mode
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// --- API ROUTES ---

export async function GET() {
    // Always dynamic to prevent Next.js from caching the DB state statistically
    const data = await readDb();
    // Inject storage mode info for client debugging
    data._storageMode = USE_CLOUD_DB ? 'KV (Cloud)' : 'File (Local)';
    return NextResponse.json(data);
}

export async function POST(req) {
    const body = await req.json();
    const { action, payload } = body;

    // Read current state
    const db = await readDb();

    // Reducer Logic
    switch (action) {
        case 'ADD_DISH_TO_ARCHIVE':
            db.allDishes.push(payload);
            break;

        case 'REMOVE_DISH_FROM_ARCHIVE':
            db.allDishes = db.allDishes.filter(d => d.id !== payload.id);
            break;

        case 'SET_ACTIVE_MENU':
            db.activeMenu = payload;
            break;

        case 'PLACE_ORDER':
            const newOrder = payload;

            // Stock Validation & Decrement
            let stockError = null;

            // We need to update activeMenu quantities
            const updatedMenu = db.activeMenu.map(dish => {
                const orderedItem = newOrder.items.find(i => i.id === dish.id);
                if (orderedItem) {
                    // Check availability
                    if (dish.isSoldOut) {
                        stockError = `${dish.name} è esaurito!`;
                        return dish;
                    }
                    if (dish.quantity !== undefined && dish.quantity < orderedItem.quantity) {
                        stockError = `Quantità non sufficiente per ${dish.name}`;
                        return dish;
                    }

                    // Decrement logic (only if quantity is tracked, not infinity)
                    // If quantity is undefined or null, we treat it as infinite for now unless we set default.
                    // But user wants to set it. Let's assume if it's set, we use it.
                    if (dish.quantity !== undefined && dish.quantity !== null) {
                        return { ...dish, quantity: dish.quantity - orderedItem.quantity };
                    }
                }
                return dish;
            });

            if (stockError) {
                // We return a special error response? 
                // Since this is a simple reducer-like API, we can't easily throw 400 without breaking the pattern 
                // unless we change return type.
                // For now, let's just NOT add the order.
                // But the client expects success. 
                // Ideally we should return { error: ... }
                // Let's rely on standard logic: if db didn't change, client won't see new order?
                // No, we need to signal error.
                // Let's write a "error" property to the response?
                // Or just fail silently for MVP? No, that's bad.
                // Let's assume valid checks were done on client, but race condition might happen.
                // I'll add logic to return error status if possible, but the `route.js` structure is:
                // `await writeDb(db); return NextResponse.json(db);`
                // I will modify the return to include `error`.
                return NextResponse.json({ ...db, error: stockError }, { status: 409 });
            }

            db.activeMenu = updatedMenu;
            db.orders.push(newOrder);
            break;

        case 'UPDATE_DISH_STOCK':
            // Payload: { id, quantity, isSoldOut }
            db.activeMenu = db.activeMenu.map(d => {
                if (d.id === payload.id) {
                    return { ...d, ...payload };
                }
                return d;
            });
            break;

        case 'TOGGLE_CONFIG':
            // Payload: { key: 'disableCutoff' }
            if (!db.config) db.config = {};
            // Toggle boolean value
            db.config[payload.key] = !db.config[payload.key];
            break;

        case 'CANCEL_ORDER':
            const orderToCancel = db.orders.find(o => o.id === payload.orderId);
            if (orderToCancel) {
                // Restore Stock
                db.activeMenu = db.activeMenu.map(dish => {
                    const itemInOrder = orderToCancel.items.find(i => i.id === dish.id);
                    if (itemInOrder && dish.quantity !== undefined && dish.quantity !== null) {
                        // Only restore if it's not unlimited
                        return { ...dish, quantity: dish.quantity + itemInOrder.quantity };
                    }
                    return dish;
                });

                db.orders = db.orders.filter(o => o.id !== payload.orderId);
            }
            break;

        case 'DELETE_ALL_ORDERS':
            db.orders = [];
            break;

        case 'SUBMIT_FEEDBACK':
            db.feedbacks.push(payload);
            break;

        case 'DELETE_FEEDBACK':
            db.feedbacks = db.feedbacks.filter(fb => fb.id !== payload.id);
            break;

        case 'RESET_DAY':
            db.activeMenu = [];
            db.orders = [];
            break;

        case 'ADD_TABLE':
            if (!db.tables) db.tables = [];
            db.tables.push(payload);
            break;

        case 'REMOVE_TABLE':
            if (db.tables) {
                db.tables = db.tables.filter(t => t.id !== payload.id);
            }
            break;

        case 'UPDATE_TABLE':
            // Payload: { id, name, capacity }
            if (db.tables) {
                db.tables = db.tables.map(t => {
                    if (t.id === payload.id) {
                        return { ...t, ...payload };
                    }
                    return t;
                });
            }
            break;

        default:
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Persist new state
    await writeDb(db);

    return NextResponse.json(db);
}
