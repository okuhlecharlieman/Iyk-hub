'use client';
import React from 'react';

const StatCard = ({ icon, title, value, color }) => {
    const colors = {
        blue: 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300',
        yellow: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-300',
        green: 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-300',
    };

    return (
        <div className={`p-6 rounded-2xl flex items-center gap-6 transition-all hover:shadow-lg hover:scale-105 ${colors[color] || colors.blue}`}>
            <div className="p-4 bg-white/50 dark:bg-gray-800/50 rounded-full">
                {React.cloneElement(icon, { className: "text-3xl" })}
            </div>
            <div>
                <p className="text-sm font-medium opacity-80">{title}</p>
                <p className="text-3xl font-bold">{value}</p>
            </div>
        </div>
    );
};

export default StatCard;
