import React, { useState, useEffect } from 'react';
import { Mail, Lock, LogIn } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import Toast from '../components/Toast';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [toast, setToast] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { login, isAuthenticated } = useAuth();

    // Auto-fill email from signup redirect
    useEffect(() => {
        if (location.state?.email) {
            setFormData(prev => ({ ...prev, email: location.state.email }));
        }
    }, [location]);

    // Only redirect if already authenticated AND not coming from signup
    useEffect(() => {
        if (isAuthenticated && !location.state?.email) {
            navigate('/dashboard', { replace: true });
        }
    }, [isAuthenticated, navigate, location.state?.email]);

    const validateForm = () => {
        if (!formData.email) {
            setToast({ message: 'Email required', type: 'error' });
            return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setToast({ message: 'Invalid email', type: 'error' });
            return false;
        }
        if (!formData.password) {
            setToast({ message: 'Password required', type: 'error' });
            return false;
        }
        if (formData.password.length < 6) {
            setToast({ message: 'Password min 6 characters', type: 'error' });
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        setLoading(true);
        try {
            const response = await axios.post(
                `${import.meta.env.VITE_SERVER_URL}/auth/login`,
                {
                    email: formData.email.toLowerCase().trim(),
                    password: formData.password
                }
            );

            const user = response.data.data ;
            const {accessToken, refreshToken } = response.data.data;
            login(user ,  accessToken, refreshToken);
            
            setToast({ message: 'Login successful!', type: 'success' });
            setTimeout(() => navigate('/dashboard'), 1500);
        } catch (error) {
            let message = 'Login failed';

            if (error.response?.data?.message) {
                message = error.response.data.message;
            } else if (error.response?.status === 404) {
                message = 'User not found';
            } else if (error.response?.status === 401) {
                message = 'Invalid credentials';
            } else if (!window.navigator.onLine) {
                message = 'No internet connection';
            } else if (error.request && !error.response) {
                message = 'Server unavailable';
            }

            setToast({ message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
            
            <div className="glass-card animate-fade-in">
                <div className="auth-header">
                    <h1 className="auth-title">Welcome Back</h1>
                    <p className="auth-subtitle">Log in to manage your fleet</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label className="input-label">Email</label>
                        <div className="input-wrapper">
                            <Mail className="input-icon" />
                            <input
                                type="email"
                                className="input-field"
                                placeholder="name@example.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label className="input-label">Password</label>
                        <div className="input-wrapper">
                            <Lock className="input-icon" />
                            <input
                                type="password"
                                className="input-field"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <LogIn size={20} />
                            {loading ? 'Signing in...' : 'Sign In'}
                        </div>
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: '#94a3b8' }}>
                    Don't have an account?{' '}
                    <button onClick={() => navigate('/signup')} className="btn-secondary" disabled={loading}>
                        Sign Up
                    </button>
                </div>
            </div>
        </>
    );
};

export default Login;
