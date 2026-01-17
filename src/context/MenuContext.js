'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const MenuContext = createContext();

export function MenuProvider({ children }) {
    // Global State
    const [activeMenu, setActiveMenu] = useState([]);
    const [allDishes, setAllDishes] = useState([]);
    const [orders, setOrders] = useState([]);
    const [feedbacks, setFeedbacks] = useState([]);
    const [config, setConfig] = useState({ disableCutoff: false });
    const [loading, setLoading] = useState(true);
    const [storageMode, setStorageMode] = useState('Unknown');
    const [isOrderingOpen, setIsOrderingOpen] = useState(true);
    const [tables, setTables] = useState([]); // New tables state

    const checkCutoffTime = useCallback(() => {
        // If config says disable cutoff, we are always open
        if (config.disableCutoff) {
            setIsOrderingOpen(true);
            return true;
        }

        const now = new Date();
        const cutoff = new Date();
        cutoff.setHours(11, 0, 0, 0);

        // If it's Saturday or Sunday, maybe strict check? 
        // For now just time based.
        const isOpen = now < cutoff;
        setIsOrderingOpen(isOpen);
        return isOpen;
    }, [config]);

    // Fetch initial data from API
    const fetchData = useCallback(async () => {
        try {
            const res = await fetch('/api/data', { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                setActiveMenu(data.activeMenu || []);
                setAllDishes(data.allDishes || []);
                setOrders(data.orders || []);
                setFeedbacks(data.feedbacks || []);
                setConfig(data.config || { disableCutoff: false });
                setTables(data.tables || []); // Set tables from API
                setStorageMode(data._storageMode || 'Unknown');
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        checkCutoffTime();
        // Optional: Polling to keep data fresh across devices
        const interval = setInterval(() => {
            fetchData();
            checkCutoffTime();
        }, 5000);
        return () => clearInterval(interval);
    }, [fetchData, checkCutoffTime]);

    // Generic Action Dispatcher
    const dispatch = async (action, payload) => {
        try {
            const res = await fetch('/api/data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, payload }),
            });
            if (res.ok) {
                // Optimistic update or refetch.
                // For simplicity, we just use the response which returns new DB state.
                const newData = await res.json();
                setActiveMenu(newData.activeMenu);
                setAllDishes(newData.allDishes);
                setOrders(newData.orders);
                setFeedbacks(newData.feedbacks || []);
                setConfig(newData.config || { disableCutoff: false });
                setTables(newData.tables || []); // Update tables after dispatch
                return true;
            } else if (res.status === 409) {
                const errData = await res.json();
                // We'll show this via Toast in the UI if possible, or simple alert here for now
                // Actually MenuContext doesn't have useToast because it's higher up? 
                // Wait, Contexts are separate.
                console.error('Stock Error:', errData.error);
                alert(`Impossibile completare l'azione: ${errData.error}`);
            } else {
                console.error('API Error:', res.status);
            }
        } catch (error) {
            console.error('Action failed:', error);
        }
        return false;
    };

    // --- Exposed Methods ---

    const addDishToArchive = (dish) => {
        const newDish = { ...dish, id: Date.now().toString() };
        dispatch('ADD_DISH_TO_ARCHIVE', newDish);
    };

    const removeDishFromArchive = (id) => {
        dispatch('REMOVE_DISH_FROM_ARCHIVE', { id });
    };

    const updateActiveMenu = (newMenu) => {
        dispatch('SET_ACTIVE_MENU', newMenu);
    };

    const placeOrder = (order) => {
        if (!checkCutoffTime()) {
            // Should be handled by UI, but double check
            return false;
        }
        const newOrder = {
            ...order,
            id: Date.now().toString(),
            timestamp: new Date().toISOString()
        };
        dispatch('PLACE_ORDER', newOrder);
        return true;
    };

    const cancelOrder = (orderId) => {
        dispatch('CANCEL_ORDER', { orderId });
    };

    const deleteAllOrders = () => {
        dispatch('DELETE_ALL_ORDERS', {});
    };

    const submitFeedback = (text) => {
        const newFeedback = {
            id: Date.now().toString(),
            text,
            timestamp: new Date().toISOString()
        };
        dispatch('SUBMIT_FEEDBACK', newFeedback);
    };

    const deleteFeedback = (id) => {
        dispatch('DELETE_FEEDBACK', { id });
    };

    const updateDishStock = (id, changes) => {
        // changes: { quantity, isSoldOut }
        dispatch('UPDATE_DISH_STOCK', { id, ...changes });
    };

    const toggleConfig = (key) => {
        dispatch('TOGGLE_CONFIG', { key });
    };

    const addTable = (table) => {
        // table: { name, capacity }
        const newTable = { ...table, id: Date.now().toString() };
        dispatch('ADD_TABLE', newTable);
    };

    const removeTable = (id) => {
        dispatch('REMOVE_TABLE', { id });
    };

    const updateTable = (id, updates) => {
        // updates: { name, capacity }
        dispatch('UPDATE_TABLE', { id, ...updates });
    };

    const resetDay = () => {
        dispatch('RESET_DAY', {});
    };

    return (
        <MenuContext.Provider value={{
            activeMenu,
            allDishes,
            orders,
            feedbacks,
            config,
            tables, // Expose tables
            loading,
            addDishToArchive,
            removeDishFromArchive,
            updateActiveMenu,
            placeOrder,
            cancelOrder,
            deleteAllOrders,
            submitFeedback,
            deleteFeedback,
            resetDay,
            updateDishStock,
            toggleConfig,
            addTable, // Expose addTable
            removeTable, // Expose removeTable
            updateTable, // Expose updateTable
            storageMode,
            isOrderingOpen
        }}>
            {children}
        </MenuContext.Provider>
    );
}

export function useMenu() {
    return useContext(MenuContext);
}
