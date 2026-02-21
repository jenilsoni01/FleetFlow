import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const Toast = ({ message, type = 'info', duration = 3000, onClose }) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            handleClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => {
            if (onClose) onClose();
        }, 300); 
    };

    const icons = {
        success: <CheckCircle className="toast-icon text-success" />,
        error: <AlertCircle className="toast-icon text-error" />,
        info: <Info className="toast-icon text-info" />,
    };

    if (!isVisible) return null;

    return (
        <div className={`toast-container animate-slide-in ${!isVisible ? 'animate-fade-out' : ''}`}>
            <div className={`toast-content toast-${type}`}>
                {icons[type]}
                <span className="toast-message">{message}</span>
                <button className="toast-close-btn" onClick={handleClose}>
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};

export default Toast;
