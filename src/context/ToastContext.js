'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import styles from './Toast.module.css';

const ToastContext = createContext();

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'success') => {
        // 1. Anti-spam: Check if a toast with the same message already exists
        if (toasts.some(t => t.message === message)) {
            return; // Ignore duplicate
        }

        const id = Date.now();
        const newToast = { id, message, type };

        setToasts(prev => {
            // 2. Limit stack size to max 1 item to prevent covering the screen
            const maxToasts = 1;
            const current = prev.length >= maxToasts ? prev.slice(prev.length - maxToasts + 1) : prev;
            return [...current, newToast];
        });

        // 3. Shorter duration (2 seconds)
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 2000);
    }, [toasts]);

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div className={styles.toastContainer}>
                {toasts.map(toast => (
                    <div key={toast.id} className={`${styles.toast} ${styles[toast.type]}`}>
                        {toast.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    return useContext(ToastContext);
}
