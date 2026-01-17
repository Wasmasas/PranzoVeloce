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
        isOrderingOpen
    } = useMenu();

    const { addToast } = useToast();

    const [cart, setCart] = useState({}); // { itemId: 1 } - Quantity is always 1 now
    const [employeeName, setEmployeeName] = useState('');
    const [matricola, setMatricola] = useState('');
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
        // Allow only numbers
        if (/^\d*$/.test(val)) {
            setMatricola(val);
        }
    };

    const handleNameChange = (e) => {
        const val = e.target.value;
        // Allow only letters and spaces
        if (/^[a-zA-Z\s]*$/.test(val)) {
            setEmployeeName(val);
        }
    };

    const toggleItem = (item) => {
        setCart(prev => {
            const isSelected = !!prev[item.id];

            if (isSelected) {
                // Deselect
                const newCart = { ...prev };
                delete newCart[item.id];
                return newCart;
            } else {
                // Select Logic

                // 1. Check Budget Cap (< 15 euro)
                const currentTotal = Object.keys(prev).reduce((sum, id) => {
                    const dish = activeMenu.find(d => d.id === id);
                    return sum + (dish ? parseFloat(dish.price) : 0);
                }, 0);

                if (currentTotal + parseFloat(item.price) > 15) {
                    addToast('Budget superato! Max €15.00', 'error');
                    return prev;
                }

                // 2. Check Category Uniqueness (Max 1 per category)
                // If another item of same category exists, remove it (switch selection)
                const newCart = { ...prev };

                // Find if there's an existing item with same category
                const existingIdInCat = Object.keys(newCart).find(id => {
                    const d = activeMenu.find(dish => dish.id === id);
                    return d && d.category === item.category;
                });

                if (existingIdInCat) {
                    delete newCart[existingIdInCat]; // Remove old choice
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
        placeOrder({ employeeName, matricola, items });
        setCart({}); // Reset cart
        addToast('Ordine inviato con successo!', 'success');
        // Stay on order page or go back to login? Usually go back to show "Existing Order" state
        // The existingOrder check works on render, so we just need to trigger a re-render or let it handle itself.
        // Step state will remain 'order' but next render will show 'existingOrder' screen if logic holds.
    };

    const handleCancelOrder = () => {
        if (confirm('Sei sicuro di voler annullare il tuo ordine?')) {
            cancelOrder(existingOrder.id);
            addToast('Ordine annullato.', 'info');
        }
    };

    if (loading) return <div className={styles.loading}>Caricamento...</div>;

    // STEP 1: Matricola Entry
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

    // STEP 2: View Existing Order (if any)
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
                                return <li key={idx}>1x {detail ? detail.name : '???'}</li> // Always 1x now
                            })}
                        </ul>
                    </div>
                    <p>Il pranzo sarà pronto alle 12:30.</p>

                    <button
                        onClick={handleCancelOrder}
                        className="btn"
                        style={{ background: 'var(--danger)', color: 'white', marginTop: '1rem' }}
                    >
                        Annulla Ordine 🗑️
                    </button>
                    <br />
                    <Link href="/" className={styles.backLink} style={{ marginTop: '1rem', display: 'block' }}>Torna alla Home</Link>
                </div>
            </div>
        );
    }

    // STEP 3: Order Form
    // Group items by category
    const itemsByCategory = activeMenu.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {});

    // Total price calculation
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
                <div className={styles.closedState} style={{
                    textAlign: 'center',
                    padding: '3rem',
                    background: '#fff3cd',
                    border: '1px solid #ffeeba',
                    color: '#856404',
                    borderRadius: '8px',
                    margin: '2rem 0'
                }}>
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

                                    // Stock Checks
                                    const isSoldOut = item.isSoldOut;
                                    const isOutOfStock = item.quantity !== undefined && item.quantity <= 0;
                                    const isDisabled = isSoldOut || isOutOfStock;

                                    return (
                                        <div
                                            key={item.id}
                                            className={`${styles.card} ${isSelected ? styles.selected : ''}`}
                                            onClick={() => !isDisabled && toggleItem(item)}
                                            style={{
                                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                opacity: isDisabled ? 0.6 : 1,
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}
                                        >
                                            {isDisabled && (
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
                                                {/* Optional: Show remaining quantity if low? */}
                                                {!isDisabled && item.quantity !== undefined && item.quantity < 10 && (
                                                    <div style={{ fontSize: '0.7rem', color: 'orange', marginTop: '4px' }}>
                                                        Solo {item.quantity} rimasti!
                                                    </div>
                                                )}
                                            </div>
                                            <div className={styles.controls}>
                                                <div style={{
                                                    width: '24px',
                                                    height: '24px',
                                                    borderRadius: '50%',
                                                    border: '2px solid var(--primary)',
                                                    background: isSelected ? 'var(--primary)' : 'transparent',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'white',
                                                    fontWeight: 'bold'
                                                }}>
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
