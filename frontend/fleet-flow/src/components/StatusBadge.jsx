import React from 'react';

const StatusBadge = ({ status }) => {
    const getStatusStyles = (status) => {
        switch (status.toLowerCase()) {
            case 'available':
            case 'active':
            case 'completed':
                return 'bg-green-100 text-green-700 border-green-200';
            case 'on trip':
            case 'in progress':
            case 'scheduled':
                return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'in shop':
            case 'on leave':
            case 'delayed':
                return 'bg-red-100 text-red-700 border-red-200';
            default:
                return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyles(status)}`}>
            {status}
        </span>
    );
};

export default StatusBadge;
