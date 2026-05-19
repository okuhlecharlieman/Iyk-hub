import React, { useEffect, useState } from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimesCircle, FaTimes } from 'react-icons/fa';

const TOAST_CONFIG = {
  success: {
    icon: <FaCheckCircle className="text-green-500" />,
    bg: 'bg-white dark:bg-gray-800 border-l-4 border-green-500',
  },
  error: {
    icon: <FaTimesCircle className="text-red-500" />,
    bg: 'bg-white dark:bg-gray-800 border-l-4 border-red-500',
  },
  warning: {
    icon: <FaExclamationTriangle className="text-amber-500" />,
    bg: 'bg-white dark:bg-gray-800 border-l-4 border-amber-500',
  },
  info: {
    icon: <FaInfoCircle className="text-blue-500" />,
    bg: 'bg-white dark:bg-gray-800 border-l-4 border-blue-500',
  },
};

export default function Toast({ type = 'success', message, onClose, duration = 3500 }) {
  const [visible, setVisible] = useState(false);
  const config = TOAST_CONFIG[type] || TOAST_CONFIG.info;

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  return (
    <div
      role="status"
      className={`${config.bg} rounded-lg p-4 shadow-lg ring-1 ring-gray-200 dark:ring-gray-700 transition-all duration-200 ${
        visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 text-lg mt-0.5">{config.icon}</span>
        <p className="flex-1 text-sm text-gray-800 dark:text-gray-200 font-medium">{message}</p>
        <button onClick={handleClose} aria-label="Close notification" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          <FaTimes size={14} />
        </button>
      </div>
    </div>
  );
}
