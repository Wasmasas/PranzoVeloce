'use client';

import React, { useState } from 'react';
import { useMenu } from '../../context/MenuContext';
import { useToast } from '../../context/ToastContext';
import styles from './menu.module.css';
import Link from 'next/link';

export default function MenuPage() {
    const {
        activeMenu,
        placeOrder,
        orders,
        allDishes,
        loading,
        cancelOrder,
        isOrderingOpen,
        tables
    } = useMenu();

    const { addToast } = useToast();

    // Fallback if tables are empty (shouldn't happen with new defaults but safe)
    const availableTables = tables && tables.length > 0 ? tables : [
        { id: 't1', name: 'Tavolo 1', capacity: 10 },
        { id: 't2', name: 'Tavolo 2', capacity: 10 },
        { id: 't3', name: 'Tavolo 3', capacity: 10 }
    ];

    const [cart, setCart] = useState({});
    const [employeeName, setEmployeeName] = useState('');
    const [matricola, setMatricola] = useState('');
    const [selectedTable, setSelectedTable] = useState(availableTables[0]?.name || 'Tavolo 1');
    const [step, setStep] = useState('login'); // 'login' or 'order'

    // Check if this matricola already has an order
    const existingOrder = orders.find(o => o.matricola && o.matricola === matricola);

    const handleLogin = (e) => {
        e.preventDefault();
        if (matricola.trim().length > 0) {
            setStep('order');
        }
    };

    const handleMatricolaChange = (e) => {
        const val = e.target.value;
        if (/^\d*$/.test(val)) setMatricola(val);
    };

    const handleNameChange = (e) => {
        const val = e.target.value;
        if (/^[a-zA-Z\s]*$/.test(val)) setEmployeeName(val);
    };

    const toggleItem = (item) => {
        setCart(prev => {
            const isSelected = !!prev[item.id];
            const MAINS = ['primo', 'secondo'];
            const SIDES = ['contorno'];
            const isMain = MAINS.includes(item.category);
            const isSide = SIDES.includes(item.category);

            if (isSelected) {
                // Deselect
                const newCart = { ...prev };
                delete newCart[item.id];
                return newCart;
            } else {
                // Select Logic
                let newCart = { ...prev };

                // LOGIC V10: 
                // 1. Only 1 Main Dish (Primo OR Secondo)
                // 2. If Main > 7.50, NO Sides allowed.
                // 3. If Main <= 7.50, Sides allowed.

                if (isMain) {
                    // Remove any existing Main (Swap behavior)
                    for (const id of Object.keys(newCart)) {
                        const d = activeMenu.find(dish => dish.id === id);
                        // Fallback to allDishes if not in activeMenu (rare but safe)
                        const detail = d || allDishes.find(ad => ad.id === id);
                        if (detail && MAINS.includes(detail.category)) {
                            delete newCart[id];
                        }
                    }

                    // If this new main is expensive (> 7.50), remove any existing sides
                    if (parseFloat(item.price) > 7.50) {
                        for (const id of Object.keys(newCart)) {
                            const d = activeMenu.find(dish => dish.id === id);
                            const detail = d || allDishes.find(ad => ad.id === id);
                            if (detail && SIDES.includes(detail.category)) {
                                delete newCart[id];
                                addToast('Contorno rimosso (Piatto > 7.50€)', 'info');
                            }
                        }
                    }
                }

                if (isSide) {
                    // Check if we have an expensive main selected
                    const expensiveMainId = Object.keys(newCart).find(id => {
                        const d = activeMenu.find(dish => dish.id === id);
                        const detail = d || allDishes.find(ad => ad.id === id);
                        return detail && MAINS.includes(detail.category) && parseFloat(detail.price) > 7.50;
                    });

                    if (expensiveMainId) {
                        addToast('Non puoi aggiungere contorni con un piatto > 7.50€', 'error');
                        return prev; // Block selection
                    }

                    // Also check Category Uniqueness for Sides (Max 1 Side?)
                    // User didn't specify multiple sides allowed or not. 
                    // Previously rule was "Max 1 item per category". I'll keep that for Sides too to be safe/consistent.
                    const existingIdInCat = Object.keys(newCart).find(id => {
                        const d = activeMenu.find(dish => dish.id === id);
                        return d && d.category === item.category;
                    });
                    if (existingIdInCat) delete newCart[existingIdInCat];
                }

                // If it is neither (e.g. Dessert/Drink?), keep old category uniqueness rule
                if (!isMain && !isSide) {
                    const existingIdInCat = Object.keys(newCart).find(id => {
                        const d = activeMenu.find(dish => dish.id === id);
                        return d && d.category === item.category;
                    });
                    if (existingIdInCat) delete newCart[existingIdInCat];
                }

                newCart[item.id] = 1;
                return newCart;
            }
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!employeeName || Object.keys(cart).length === 0) return;

        const items = Object.entries(cart).map(([id, quantity]) => ({ id, quantity }));
        placeOrder({ employeeName, matricola, table: selectedTable, items });
        setCart({});
        addToast('Ordine inviato con successo!', 'success');
    };

    const handleCancelOrder = () => {
        if (confirm('Sei sicuro di voler annullare il tuo ordine?')) {
            cancelOrder(existingOrder.id);
            addToast('Ordine annullato.', 'info');
        }
    };

    // Calculate seats taken per table based on active orders
    const tableCounts = {};
    orders.forEach(o => {
        if (o.table) {
            tableCounts[o.table] = (tableCounts[o.table] || 0) + 1; // Assuming 1 person per order
        }
    });

    if (loading) return <div className={styles.loading}>Caricamento...</div>;

    // STEP 1: Matricola
    if (step === 'login') {
        return (
            <div className={styles.container}>
                <div className={styles.loginCard}>
                    <h1>Benvenuto 👋</h1>
                    <p>Inserisci la tua matricola per ordinare o vedere il tuo ordine.</p>
                    <form onSubmit={handleLogin}>
                        <input
                            type="text"
                            placeholder="Matricola (solo numeri)"
                            value={matricola}
                            onChange={handleMatricolaChange}
                            className={styles.nameInput}
                            style={{ width: '100%', marginBottom: '1rem' }}
                            required
                            inputMode="numeric"
                        />
                        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Procedi</button>
                    </form>
                    <Link href="/" className={styles.backLink} style={{ marginTop: '1rem', display: 'block', textAlign: 'center' }}>Torna alla Home</Link>
                </div>
            </div>
        );
    }

    // STEP 2: Existing Order
    if (existingOrder) {
        return (
            <div className={styles.container}>
                <div className={styles.successCard}>
                    <h1>Hai già ordinato! ✅</h1>
                    <p>Ciao <strong>{existingOrder.employeeName}</strong> (Matr. {existingOrder.matricola})</p>
                    <div className={styles.orderSummary}>
                        <h3>Il tuo ordine:</h3>
                        <ul>
                            {existingOrder.items.map((item, idx) => {
                                const detail = activeMenu.find(m => m.id === item.id) || allDishes.find(d => d.id === item.id);
                                return <li key={idx}>1x {detail ? detail.name : '???'}</li>
                            })}
                        </ul>
                    </div>
                    <p>Il pranzo sarà pronto alle 12:30.</p>
                    <button onClick={handleCancelOrder} className="btn" style={{ background: 'var(--danger)', color: 'white', marginTop: '1rem' }}>Annulla Ordine 🗑️</button>
                    <br />
                    <Link href="/" className={styles.backLink} style={{ marginTop: '1rem', display: 'block' }}>Torna alla Home</Link>
                </div>
            </div>
        );
    }

    // STEP 3: Order Form
    const itemsByCategory = activeMenu.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {});

    const currentTotal = Object.keys(cart).reduce((sum, id) => {
        const d = activeMenu.find(dish => dish.id === id);
        return sum + (d ? parseFloat(d.price) : 0);
    }, 0);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button onClick={() => setStep('login')} className={styles.backLink}>&larr; Indietro</button>
                <h1>Menu del Giorno</h1>
                <p className={styles.subtext}>Matricola: <strong>{matricola}</strong></p>
            </header>

            {activeMenu.length === 0 ? (
                <div className={styles.emptyState}>
                    <p>Il menu non è ancora stato caricato dal ristorante. Riprova più tardi!</p>
                </div>
            ) : !isOrderingOpen ? (
                <div className={styles.closedState} style={{ textAlign: 'center', padding: '3rem', background: '#fff3cd', border: '1px solid #ffeeba', color: '#856404', borderRadius: '8px', margin: '2rem 0' }}>
                    <h2 style={{ marginBottom: '1rem' }}>🕑 Ordini Chiusi</h2>
                    <p>È passato l&apos;orario limite delle 11:00.</p>
                    <p>Non è più possibile inviare nuovi ordini per oggi.</p>
                </div>
            ) : (
                <form onSubmit={handleSubmit}>
                    {Object.entries(itemsByCategory).map(([category, items]) => (
                        <section key={category} className={styles.categorySection}>
                            <h2 className={styles.categoryTitle}>{category}</h2>
                            <div className={styles.grid}>
                                {items.map(item => {
                                    const isSelected = !!cart[item.id];
                                    const isSoldOut = item.isSoldOut;
                                    const isOutOfStock = item.quantity !== undefined && item.quantity <= 0;

                                    // Logic Checks for disabling
                                    let isBlocked = false;
                                    const MAINS = ['primo', 'secondo'];
                                    const isSide = item.category === 'contorno';

                                    if (isSide) {
                                        // Check if we have an expensive main selected
                                        const expensiveMain = Object.keys(cart).some(id => {
                                            const d = activeMenu.find(dish => dish.id === id);
                                            // Fallback
                                            const detail = d || allDishes.find(ad => ad.id === id);
                                            return detail && MAINS.includes(detail.category) && parseFloat(detail.price) > 7.50;
                                        });
                                        if (expensiveMain) isBlocked = true;
                                    }

                                    const isUnavailable = isSoldOut || isOutOfStock;
                                    const isDisabled = isUnavailable || isBlocked;

                                    return (
                                        <div
                                            key={item.id}
                                            className={`${styles.card} ${isSelected ? styles.selected : ''}`}
                                            onClick={() => !isDisabled && toggleItem(item)}
                                            style={{
                                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                opacity: isDisabled ? 0.6 : 1,
                                                position: 'relative',
                                                overflow: 'hidden',
                                                // Optional: Add grayscale if blocked but not sold out?
                                                filter: isBlocked && !isUnavailable ? 'grayscale(0.8)' : 'none'
                                            }}
                                        >
                                            {isUnavailable && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '10px',
                                                    right: '-30px',
                                                    background: 'var(--danger)',
                                                    color: 'white',
                                                    padding: '2px 30px',
                                                    transform: 'rotate(45deg)',
                                                    fontSize: '0.7rem',
                                                    fontWeight: 'bold',
                                                    zIndex: 10
                                                }}>
                                                    ESAURITO
                                                </div>
                                            )}
                                            <div className={styles.cardInfo}>
                                                <h3>{item.name}</h3>
                                                <span className={styles.price}>€ {item.price}</span>
                                                {!isDisabled && item.quantity !== undefined && item.quantity < 10 && (
                                                    <div style={{ fontSize: '0.7rem', color: 'orange', marginTop: '4px' }}>Solo {item.quantity} rimasti!</div>
                                                )}
                                            </div>
                                            <div className={styles.controls}>
                                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid var(--primary)', background: isSelected ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                                                    {isSelected && '✓'}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    ))}

                    <footer className={styles.footer}>
                        <div className={styles.summary}>
                            <span>Totale: <strong>€ {currentTotal.toFixed(2)}</strong> <small>(Max 15€)</small></span>
                        </div>
                        <div className={styles.submitRow}>
                            <select
                                value={selectedTable}
                                onChange={(e) => setSelectedTable(e.target.value)}
                                className={styles.nameInput}
                                style={{ flex: '0 0 auto', width: 'auto', marginRight: '0.5rem', cursor: 'pointer' }}
                            >
                                {availableTables.map(t => {
                                    const taken = tableCounts[t.name] || 0;
                                    const isFull = taken >= t.capacity;
                                    return (
                                        <option key={t.id} value={t.name} disabled={isFull}>
                                            {t.name} {isFull ? '(PIENO)' : `(${taken}/${t.capacity})`}
                                        </option>
                                    );
                                })}
                            </select>

                            <input
                                type="text"
                                placeholder="Il tuo Nome (solo lettere)"
                                value={employeeName}
                                onChange={handleNameChange}
                                required
                                className={styles.nameInput}
                            />
                            <button
                                type="submit"
                                className={`btn btn-primary ${styles.submitBtn}`}
                                disabled={Object.keys(cart).length === 0 || !employeeName}
                            >
                                Ordina Ora
                            </button>
                        </div>
                    </footer>
                </form>
            )}
        </div>
    );
}
