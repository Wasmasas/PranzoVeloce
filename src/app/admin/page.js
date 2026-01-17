'use client';

import React, { useState } from 'react';
import { useMenu } from '../../context/MenuContext';
import { useToast } from '../../context/ToastContext';
import styles from './admin.module.css';
import Link from 'next/link';

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [newItem, setNewItem] = useState({ name: '', price: '', category: 'primo' });
    const [view, setView] = useState('menu'); // 'menu' or 'archive'
    const [selectedOrders, setSelectedOrders] = useState([]);

    const { addToast } = useToast();

    const {
        activeMenu,
        allDishes,
        addDishToArchive,
        removeDishFromArchive,
        updateActiveMenu,
        orders,
        feedbacks,
        deleteFeedback,
        deleteAllOrders,
        cancelOrder,
        resetDay,

        loading,
        storageMode,
        updateDishStock,
        config,
        toggleConfig
    } = useMenu();

    const toggleOrderSelection = (id) => {
        setSelectedOrders(prev =>
            prev.includes(id) ? prev.filter(oid => oid !== id) : [...prev, id]
        );
    };

    const handleDeleteSelected = () => {
        if (confirm(`Sei sicuro di voler eliminare ${selectedOrders.length} ordini selezionati?`)) {
            selectedOrders.forEach(id => cancelOrder(id));
            setSelectedOrders([]);
            addToast('Ordini eliminati.', 'info');
        }
    };

    const handleDeleteAll = () => {
        if (confirm('ATTENZIONE: Sei sicuro di voler eliminare TUTTI gli ordini ricevuti? Questa azione non è reversibile.')) {
            deleteAllOrders();
            setSelectedOrders([]);
            addToast('Tutti gli ordini sono stati eliminati.', 'info');
        }
    };

    const handleLogin = (e) => {
        e.preventDefault();
        const pwd = password.trim();
        if (pwd === 'admin123') {
            setIsAuthenticated('admin');
        } else if (pwd === 'St4rm4t1k123') {
            setIsAuthenticated('superadmin');
            addToast('Benvenuto Super Admin ⚡', 'success');
        } else {
            addToast('Password errata', 'error');
        }
    };

    const handleCreateDish = (e) => {
        e.preventDefault();
        if (newItem.name && newItem.price) {
            addDishToArchive(newItem);
            setNewItem({ name: '', price: '', category: 'primo' });
            addToast('Piatto aggiunto all\'archivio!', 'success');
        }
    };

    const toggleDishInMenu = (dish) => {
        const isActive = activeMenu.some(d => d.id === dish.id);
        let newMenu;
        if (isActive) {
            newMenu = activeMenu.filter(d => d.id !== dish.id);
        } else {
            newMenu = [...activeMenu, dish];
        }
        updateActiveMenu(newMenu);
    };

    const handleReset = () => {
        if (confirm('Sei sicuro? Questo cancellerà tutti gli ordini e il menu del giorno.')) {
            resetDay();
            addToast('Giorno resettato.', 'info');
        }
    };

    if (loading) return <div className={styles.loading}>Caricamento...</div>;

    if (!isAuthenticated) {
        return (
            <div className={styles.loginOverlay}>
                <div className={styles.loginCard}>
                    <h1>Admin Login 🔒</h1>
                    <form onSubmit={handleLogin}>
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={styles.input}
                        />
                        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Entra</button>
                    </form>
                    <Link href="/" className={styles.backLink} style={{ marginTop: '1rem', display: 'block', textAlign: 'center' }}>Torna alla Home</Link>
                </div>
            </div>
        );
    }

    // Calculate summary
    const summary = {};
    orders.forEach(order => {
        order.items.forEach(item => {
            const detail = activeMenu.find(m => m.id === item.id) || allDishes.find(d => d.id === item.id);
            const name = detail ? detail.name : '???';
            summary[name] = (summary[name] || 0) + item.quantity;
        });
    });

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link href="/" className={styles.backLink}>&larr; Home</Link>
                </div>
                <h1>Dashboard Ristorante</h1>
                <div className={styles.headerControls}>
                    <button onClick={() => setIsAuthenticated(false)} className={styles.logoutBtn}>Logout</button>
                    <button onClick={handleReset} className={styles.resetBtn}>Nuovo Giorno (Reset)</button>
                </div>
            </header>

            {/* Super Admin Dev Tools */}
            {isAuthenticated === 'superadmin' && (
                <div style={{ background: '#333', color: '#0f0', padding: '1rem', marginBottom: '1rem', borderRadius: '8px', fontFamily: 'monospace' }}>
                    <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>🔧 STRUMENTI SVILUPPATORE (Super Admin)</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span>Limite Orario 11:00:</span>
                            <button
                                onClick={() => toggleConfig('disableCutoff')}
                                style={{
                                    background: config.disableCutoff ? 'red' : 'green',
                                    color: 'white', border: 'none', padding: '5px 10px', cursor: 'pointer', fontWeight: 'bold'
                                }}
                            >
                                {config.disableCutoff ? 'DISABILITATO (Ordini sempre aperti)' : 'ATTIVO (Standard)'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <main className={styles.mainGrid}>
                {/* Left Column: Menu Management */}
                <section className={styles.section}>
                    <div className={styles.tabs}>
                        <button
                            className={`${styles.tab} ${view === 'menu' ? styles.activeTab : ''}`}
                            onClick={() => setView('menu')}
                        >
                            Menu di Oggi ({activeMenu.length})
                        </button>
                        <button
                            className={`${styles.tab} ${view === 'archive' ? styles.activeTab : ''}`}
                            onClick={() => setView('archive')}
                        >
                            Archivio Piatti ({allDishes.length})
                        </button>
                        <button
                            className={`${styles.tab} ${view === 'feedbacks' ? styles.activeTab : ''}`}
                            onClick={() => setView('feedbacks')}
                        >
                            Feedback ({feedbacks.length})
                        </button>
                    </div>

                    {view === 'feedbacks' && (
                        <div className={styles.feedbackPanel}>
                            <h3>Messaggi dai Dipendenti</h3>
                            {feedbacks.length === 0 ? <p>Nessun feedback ricevuto.</p> : (
                                <ul className={styles.feedbackList}>
                                    {feedbacks.map(fb => (
                                        <li key={fb.id} className={styles.feedbackItem}>
                                            <p className={styles.fbText}>&quot;{fb.text}&quot;</p>
                                            <div className={styles.fbFooter}>
                                                <small>{new Date(fb.date).toLocaleString()}</small>
                                                <button
                                                    onClick={() => {
                                                        deleteFeedback(fb.id);
                                                        addToast('Feedback archiviato', 'info');
                                                    }}
                                                    className={styles.resolveBtn}
                                                    title="Segna come letto/elimina"
                                                >✓</button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                    {view === 'archive' && (
                        <div className={styles.archivePanel}>
                            <h3>Crea Nuovo Piatto</h3>
                            <form onSubmit={handleCreateDish} className={styles.form} style={{ marginBottom: '1rem' }}>
                                <input
                                    type="text"
                                    placeholder="Nome Piatto"
                                    value={newItem.name}
                                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                    className={styles.input}
                                />
                                <div className={styles.row}>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.10"
                                        placeholder="Prezzo"
                                        value={newItem.price}
                                        onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                                        className={styles.input}
                                    />
                                    <select
                                        value={newItem.category}
                                        onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                                        className={styles.select}
                                    >
                                        <option value="primo">Primo</option>
                                        <option value="secondo">Secondo</option>
                                        <option value="contorno">Contorno</option>
                                        <option value="bevanda">Bevanda</option>
                                    </select>
                                </div>
                                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Salva in Archivio</button>
                            </form>

                            <h3>Tutti i Piatti</h3>
                            <ul className={styles.dishList}>
                                {allDishes.map(dish => (
                                    <li key={dish.id} className={styles.dishItem}>
                                        <span>{dish.name} ({dish.category}) - €{dish.price}</span>
                                        <button
                                            onClick={() => removeDishFromArchive(dish.id)}
                                            className={styles.deleteBtn}
                                            title="Elimina definitivamente"
                                        >&times;</button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {view === 'menu' && (
                        <div className={styles.menuPanel}>
                            <h3>Seleziona Piatti per Oggi</h3>
                            <p className={styles.hint}>Clicca sui piatti dall&apos;elenco sottostante per attivarli/disattivarli.</p>

                            {allDishes.length === 0 ? (
                                <p>Nessun piatto in archivio. Vai su &quot;Archivio Piatti&quot; per crearne uno.</p>
                            ) : (
                                <div className={styles.selectionGrid}>
                                    {allDishes.map(dish => {
                                        const activeDish = activeMenu.find(d => d.id === dish.id);
                                        const isActive = !!activeDish;

                                        return (
                                            <div
                                                key={dish.id}
                                                className={`${styles.selectionCard} ${isActive ? styles.activeCard : ''}`}
                                            >
                                                {/* Header / Selection Area */}
                                                <div
                                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: isActive ? '0.5rem' : '0' }}
                                                    onClick={() => toggleDishInMenu(dish)}
                                                >
                                                    <div className={styles.checkbox}>{isActive ? '✓' : ''}</div>
                                                    <div>
                                                        <strong>{dish.name}</strong>
                                                        <div className={styles.small}>€ {dish.price}</div>
                                                    </div>
                                                </div>

                                                {/* Stock Controls (Only if Active) */}
                                                {isActive && (
                                                    <div style={{ marginTop: '0.5rem', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '0.5rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                                                            <label style={{ fontSize: '0.8rem' }}>Porzioni:</label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                style={{ width: '60px', padding: '2px' }}
                                                                value={activeDish.quantity !== undefined ? activeDish.quantity : 100}
                                                                onChange={(e) => updateDishStock(dish.id, { quantity: parseInt(e.target.value) })}
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        </div>
                                                        <button
                                                            style={{
                                                                width: '100%',
                                                                padding: '4px',
                                                                fontSize: '0.8rem',
                                                                background: activeDish.isSoldOut ? 'var(--text-main)' : 'var(--danger)',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '4px',
                                                                cursor: 'pointer'
                                                            }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                updateDishStock(dish.id, { isSoldOut: !activeDish.isSoldOut });
                                                            }}
                                                        >
                                                            {activeDish.isSoldOut ? 'RIATTIVA DISPONIBILITÀ' : 'SEGNA COME FINITO'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </section>

                {/* Right Column: Orders */}
                <section className={styles.section}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2>Ordini Ricevuti ({orders.length})</h2>
                        {orders.length > 0 && (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {selectedOrders.length > 0 && (
                                    <button
                                        onClick={handleDeleteSelected}
                                        className="btn"
                                        style={{ background: 'var(--danger)', color: 'white', fontSize: '0.85rem', padding: '0.5rem' }}
                                    >
                                        Elimina ({selectedOrders.length})
                                    </button>
                                )}
                                <button
                                    onClick={handleDeleteAll}
                                    className="btn"
                                    style={{ background: 'var(--text-main)', color: 'white', fontSize: '0.85rem', padding: '0.5rem' }}
                                >
                                    Elimina Tutti 🗑️
                                </button>
                            </div>
                        )}
                    </div>

                    <div className={`${styles.card} ${styles.summaryCard}`}>
                        <h3>Da Preparare:</h3>
                        {Object.keys(summary).length === 0 ? <p>Nessun ordine.</p> : (
                            <ul className={styles.summaryList}>
                                {Object.entries(summary).map(([name, count]) => (
                                    <li key={name} className={styles.summaryItem}>
                                        <span className={styles.count}>{count}x</span> {name}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className={styles.ordersList}>
                        {orders.length > 0 && (
                            <div style={{ marginBottom: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedOrders.length === orders.length && orders.length > 0}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedOrders(orders.map(o => o.id));
                                        } else {
                                            setSelectedOrders([]);
                                        }
                                    }}
                                />
                                <span style={{ fontSize: '0.9rem' }}>Seleziona Tutti</span>
                            </div>
                        )}
                        {orders.map(order => (
                            <div key={order.id} className={styles.orderCard} style={selectedOrders.includes(order.id) ? { border: '2px solid var(--primary)' } : {}}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedOrders.includes(order.id)}
                                            onChange={() => toggleOrderSelection(order.id)}
                                        />
                                        <div>
                                            <strong>{order.employeeName}</strong>
                                            <div className={styles.small}>Matr: {order.matricola || 'N/A'}</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (confirm('Eliminare questo singolo ordine?')) cancelOrder(order.id);
                                        }}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}
                                        title="Elimina"
                                    >×</button>
                                </div>
                                <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                                    {order.items.map((item, idx) => {
                                        // Find item name safely
                                        const detail = activeMenu.find(m => m.id === item.id) || allDishes.find(d => d.id === item.id);
                                        return <li key={idx}><span style={{ fontWeight: 'bold' }}>1x</span> {detail ? detail.name : '???'}</li>
                                    })}
                                </ul>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
            <footer style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                PranzoVeloce Admin v1.2 - {new Date().toLocaleDateString()}
            </footer>
        </div >
    );
}
