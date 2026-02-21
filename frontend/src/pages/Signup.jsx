import React, { useState } from 'react';
import { User, Mail, Lock, Shield, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';
import axios from 'axios';

const Signup = () => {
    const [formData, setFormData] = useState({
        userName: '',
        email: '',
        password: '',
        role: 'MANAGER',
    });
    const [toast, setToast] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const roles = [
        "MANAGER",
        "DISPATCHER",
        "SAFETY_OFFICER",
        "FINANCIAL_ANALYST"
    ];

    const validateForm = () => {
        if (!formData.userName.trim()) {
            setToast({ message: 'Username required', type: 'error' });
            return false;
        }
        if (formData.userName.trim().length < 3) {
            setToast({ message: 'Username min 3 characters', type: 'error' });
            return false;
        }
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
                `${import.meta.env.VITE_SERVER_URL}/auth/register`, 
                formData
            );
            
            setToast({ message: 'Account created!', type: 'success' });
            setTimeout(() => navigate('/login', { state: { email: formData.email } }), 1500);
        } catch (error) {
            let message = 'Registration failed';
            
            if (error.response?.data?.message) {
                message = error.response.data.message;
            } else if (error.response?.status === 400) {
                message = 'Email already exists';
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

            <div className="glass-card">
                <div className="auth-header">
                    <h1 className="auth-title">Create Account</h1>
                    <p className="auth-subtitle">Join FleetFlow</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label className="input-label">Username</label>
                        <div className="input-wrapper">
                            <User className="input-icon" />
                            <input
                                type="text"
                                className="input-field"
                                placeholder="johndoe"
                                value={formData.userName}
                                onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                                disabled={loading}
                            />
                        </div>
                    </div>

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
                        <label className="input-label">Role</label>
                        <div className="input-wrapper">
                            <Shield className="input-icon" />
                            <select
                                className="input-field role-select"
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                disabled={loading}
                            >
                                {roles.map(role => (
                                    <option key={role} value={role}>{role.replace('_', ' ')}</option>
                                ))}
                            </select>
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
                            <UserPlus size={20} />
                            {loading ? 'Creating...' : 'Create Account'}
                        </div>
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: '#94a3b8' }}>
                    Have an account?{' '}
                    <button onClick={() => navigate('/login')} className="btn-secondary" disabled={loading}>
                        Login
                    </button>
                </div>
            </div>
        </>
    );
};

export default Signup;
