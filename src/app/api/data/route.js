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

// --- HELPERS ---

async function readDb() {
    // 1. Cloud Mode
    if (USE_CLOUD_DB) {
        try {
            const data = await kv.get(DB_KEY);
            if (!data) return { activeMenu: [], allDishes: [], orders: [], feedbacks: [] };

            // Ensure compatibility if fields are missing
            if (!data.feedbacks) data.feedbacks = [];
            return data;
        } catch (error) {
            console.error('KV Read Error:', error);
            // Fallback to empty structure on error to prevent unnecessary crashes, 
            // though in prod this implies DB failure.
            return { activeMenu: [], allDishes: [], orders: [], feedbacks: [] };
        }
    }

    // 2. Local File Mode (Legacy)
    if (!fs.existsSync(dbPath)) {
        return { activeMenu: [], allDishes: [], orders: [], feedbacks: [] };
    }
    const data = fs.readFileSync(dbPath, 'utf8');
    try {
        const parsed = JSON.parse(data);
        if (!parsed.feedbacks) parsed.feedbacks = [];
        return parsed;
    } catch (err) {
        return { activeMenu: [], allDishes: [], orders: [], feedbacks: [] };
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
            db.orders.push(payload);
            break;

        case 'CANCEL_ORDER':
            db.orders = db.orders.filter(o => o.id !== payload.orderId);
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

        default:
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Persist new state
    await writeDb(db);

    return NextResponse.json(db);
}
