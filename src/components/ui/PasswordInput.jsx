'use client';
import { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

export default function PasswordInput({ value, onChange, placeholder = 'Password', ...props }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <input
        className="w-full p-3 rounded-lg bg-gray-100/80 dark:bg-gray-900/60 border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-800 transition-all"
        type={showPassword ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShowPassword((prev) => !prev)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
        aria-label={showPassword ? 'Hide password' : 'Show password'}
      >
        {showPassword ? <FaEyeSlash /> : <FaEye />}
      </button>
    </div>
  );
}
