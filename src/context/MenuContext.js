'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const MenuContext = createContext();

export function MenuProvider({ children }) {
    // Global State
    const [activeMenu, setActiveMenu] = useState([]);
    const [allDishes, setAllDishes] = useState([]);
    const [orders, setOrders] = useState([]);
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch initial data from API
    const fetchData = useCallback(async () => {
        try {
            const res = await fetch('/api/data');
            if (res.ok) {
                const data = await res.json();
                setActiveMenu(data.activeMenu || []);
                setAllDishes(data.allDishes || []);
                setOrders(data.orders || []);
                setFeedbacks(data.feedbacks || []);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        // Optional: Polling to keep data fresh across devices
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, [fetchData]);

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
                return true;
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
        const newOrder = {
            ...order,
            id: Date.now().toString(),
            timestamp: new Date().toISOString()
        };
        dispatch('PLACE_ORDER', newOrder);
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

    const resetDay = () => {
        dispatch('RESET_DAY', {});
    };

    return (
        <MenuContext.Provider value={{
            activeMenu,
            allDishes,
            orders,
            feedbacks,
            loading,
            addDishToArchive,
            removeDishFromArchive,
            updateActiveMenu,
            placeOrder,
            cancelOrder,
            deleteAllOrders,
            submitFeedback,
            deleteFeedback,
            resetDay
        }}>
            {children}
        </MenuContext.Provider>
    );
}

export function useMenu() {
    return useContext(MenuContext);
}
