import React, { createContext, useState } from 'react';
import api from '../services/api'
const AuthContext = createContext();
const AuthProvider = ({ children }) => {

    const [user, setUser] = useState(() => {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        return (token && storedUser) ? JSON.parse(storedUser) : null;
    });
    const [loading, setLoading] = useState(false);

    const register = async (userData) => {
        const data = await api.auth.register(userData);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
    };

    const login = async (credentials) => {
        const data = await api.auth.login(credentials);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
    };

    const logout = async () => {
        try {
            await api.auth.logout();
        } catch (err) {
            // Ignore errors (e.g., token already expired)
            console.log('Logout API error (ignored):', err.message);
        }
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, register, login, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};

export { AuthContext, AuthProvider };