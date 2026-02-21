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
    const navigate = useNavigate();

    const roles = [
        "MANAGER",
        "DISPATCHER",
        "SAFETY_OFFICER",
        "FINANCIAL_ANALYST"
    ];

    const validateForm = () => {
        if (formData.userName.trim().length < 3) {
            setToast({ message: 'Username must be at least 3 characters', type: 'error' });
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setToast({ message: 'Please enter a valid email address', type: 'error' });
            return false;
        }


        if (formData.password.length < 6) {
            setToast({ message: 'Password must be at least 6 characters', type: 'error' });
            return false;
        }

        if (!formData.role) {
            setToast({ message: 'Please select a role', type: 'error' });
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (validateForm()) {
            try {
                const response = await axios.post(`${import.meta.env.VITE_SERVER_URL}/auth/register`, formData);
                console.log('Registration response:', response.data);
                setToast({ message: 'Account created successfully!', type: 'success' });

                setTimeout(() => {
                    navigate('/login');
                }, 2000);
            } catch (error) {
                console.error('Registration error:', error);
                const errorMessage = error.response?.data?.message || error.message || 'Registration failed. Please try again.';
                setToast({ message: errorMessage, type: 'error' });
            }
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
                    <p className="auth-subtitle">Join FleetFlow to get started</p>
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
                                required
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label className="input-label">Email Address</label>
                        <div className="input-wrapper">
                            <Mail className="input-icon" />
                            <input
                                type="email"
                                className="input-field"
                                placeholder="name@example.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
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
                                required
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
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn-primary">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <UserPlus size={20} />
                            Create Account
                        </div>
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: '#94a3b8' }}>
                    Already have an account?{' '}
                    <button onClick={() => navigate('/login')} className="btn-secondary">
                        Login
                    </button>
                </div>
            </div>
        </>
    );
};

export default Signup;
