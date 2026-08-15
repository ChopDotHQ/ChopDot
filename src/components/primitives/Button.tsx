import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'muted' | 'success' | 'danger' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  fullWidth = false,
  className = '',
  type,
  ...props
}) => {
  const focusClass = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 dark:focus-visible:ring-gray-100 dark:focus-visible:ring-offset-[#0a0a0a]';
  let baseClass = `min-h-11 font-semibold rounded-full transition-colors shadow-sm ${focusClass} disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center`;
  let variantClass = '';

  switch (variant) {
    case 'primary':
      baseClass = `min-h-11 py-3 px-4 font-semibold rounded-full transition-colors shadow-sm ${focusClass} disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center`;
      variantClass = 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200';
      break;
    case 'secondary':
      baseClass = `min-h-11 py-3 px-4 font-semibold rounded-full transition-colors shadow-sm ${focusClass} disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center`;
      variantClass = 'bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-800 border border-transparent dark:border-gray-800';
      break;
    case 'success':
      baseClass = `min-h-11 py-3 px-4 font-semibold rounded-full transition-colors shadow-sm ${focusClass} disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center`;
      variantClass = 'bg-green-600 dark:bg-green-500 text-white hover:bg-green-700 dark:hover:bg-green-400';
      break;
    case 'danger':
      baseClass = `min-h-11 py-3 px-4 font-semibold rounded-full transition-colors shadow-sm ${focusClass} disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center`;
      variantClass = 'bg-orange-600 dark:bg-orange-500 text-white hover:bg-orange-700 dark:hover:bg-orange-400';
      break;
    case 'muted':
      baseClass = `min-h-11 px-3 py-2 font-semibold rounded-lg transition-colors ${focusClass} disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center`;
      variantClass = 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 shadow-none';
      break;
    case 'icon':
      baseClass = `min-h-11 min-w-11 p-2 rounded-full transition-colors ${focusClass} disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center`;
      variantClass = 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-none';
      break;
  }

  const widthClass = fullWidth && variant !== 'icon' ? 'w-full' : '';

  return (
    <button
      type={type ?? 'button'}
      className={`${baseClass} ${variantClass} ${widthClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
