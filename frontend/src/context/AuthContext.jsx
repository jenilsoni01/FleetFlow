import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Check if user is already authenticated on mount
    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const storedUser = localStorage.getItem('user');
            const accessToken = localStorage.getItem('accessToken');
            const refreshToken = localStorage.getItem('refreshToken');

            if (!storedUser || !accessToken || !refreshToken) {
                setLoading(false);
                return;
            }

            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            setIsAuthenticated(true);
            setLoading(false);
        } catch (error) {
            console.error('Auth check error:', error);
            clearAuth();
            setLoading(false);
        }
    };

    const refreshTokens = async () => {
        try {
            const refreshToken = localStorage.getItem('refreshToken');
            
            if (!refreshToken) {
                clearAuth();
                return false;
            }

            const response = await axios.post(
                `${import.meta.env.VITE_SERVER_URL}/auth/refresh-token`,
                { refreshToken }
            );

            const { accessToken } = response.data.data || {};
            if (accessToken) {
                localStorage.setItem('accessToken', accessToken);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Token refresh error:', error);
            clearAuth();
            return false;
        }
    };

    const login = (userData, accessToken, refreshToken) => {
        setUser(userData);
        setIsAuthenticated(true);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
    };

    const clearAuth = () => {
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('user');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
    };

    const logout = async () => {
        try {
            await axios.post(`${import.meta.env.VITE_SERVER_URL}/auth/logout`);
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            clearAuth();
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                isAuthenticated,
                login,
                logout,
                refreshTokens,
                checkAuth,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
