'use client';

import React, { useState } from 'react';

import { useMenu } from '../context/MenuContext';

export default function FeedbackWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [text, setText] = useState('');
    const [success, setSuccess] = useState(false);
    const { submitFeedback } = useMenu();

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        submitFeedback(text);
        setSuccess(true);
        setText('');
        setTimeout(() => {
            setSuccess(false);
            setIsOpen(false);
        }, 2000);
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    // ... keep existing button styles ...
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    background: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '50px',
                    height: '50px',
                    boxShadow: 'var(--shadow-lg)',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
                title="Lascia un feedback"
            >
                💬
            </button>
        );
    }

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '300px',
            background: 'white',
            padding: '1rem',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border-color)',
            zIndex: 9999
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <h4 style={{ margin: 0 }}>Suggerimenti?</h4>
                <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1rem' }}>&times;</button>
            </div>

            {success ? (
                <div style={{ textAlign: 'center', padding: '1rem 0', color: 'var(--success)' }}>
                    <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>🎉</span>
                    <strong>Feedback inviato!</strong>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>Grazie del tuo aiuto.</p>
                </div>
            ) : (
                <form onSubmit={handleSubmit}>
                    <textarea
                        placeholder="Cosa possiamo migliorare?"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        style={{
                            width: '100%',
                            minHeight: '80px',
                            padding: '0.5rem',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: '0.5rem',
                            fontFamily: 'inherit'
                        }}
                    />
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: '0.9rem' }}>Invia</button>
                </form>
            )}
        </div>
    );
}
