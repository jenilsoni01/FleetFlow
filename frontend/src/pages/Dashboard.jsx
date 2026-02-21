import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Dashboard() {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDashboardSummary = async () => {
            try {
                const accessToken = localStorage.getItem('accessToken');
                
                if (!accessToken) {
                    throw new Error('No access token found');
                }

                const response = await axios.get(
                    `${import.meta.env.VITE_SERVER_URL}/dashboard/summary`,
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`
                        }
                    }
                );

                console.log('Dashboard Summary Data:', response.data.data);
                setSummary(response.data.data);
                setError(null);
            } catch (err) {
                console.error('Error fetching dashboard summary:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardSummary();
    }, []);

    if (loading) {
        return (
            <div className="dashboard-container">
                <h1>Loading Dashboard...</h1>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-container">
                <h1>Error</h1>
                <p style={{ color: 'red' }}>{error}</p>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <h1>Dashboard</h1>
            <p>Welcome to your fleet management dashboard!</p>
            
            {summary && (
                <div>
                    <h2>Dashboard Summary</h2>
                    <pre style={{ 
                        background: '#f0f0f0', 
                        padding: '15px', 
                        borderRadius: '5px',
                        overflow: 'auto',
                        maxHeight: '500px'
                    }}>
                        {JSON.stringify(summary, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}