import React from 'react';
import clsx from 'clsx';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  type = 'button',
  ariaLabel,
  startIcon,
  endIcon,
  ...props
}) {
  const base = 'inline-flex items-center justify-center rounded-md font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed gap-2';
  const sizeMap = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-3 text-base',
  };
  const variantMap = {
    primary: 'btn-primary',
    secondary: 'btn-blue',
    danger: 'btn-red',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 dark:text-gray-200',
  };

  const cls = clsx(base, sizeMap[size] || sizeMap.md, variantMap[variant] || variantMap.primary, className);

  return (
    <button
      type={type}
      className={cls}
      disabled={disabled}
      aria-label={ariaLabel}
      {...props}
    >
      {startIcon && <span className="inline-flex items-center">{startIcon}</span>}
      <span>{children}</span>
      {endIcon && <span className="inline-flex items-center">{endIcon}</span>}
    </button>
  );
}
