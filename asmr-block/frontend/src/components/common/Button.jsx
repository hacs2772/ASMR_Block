import React from 'react';

function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  disabled = false,
  loading = false,
  className = '',
  ...props 
}) {
  const baseStyles = 'font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2';
  
  const variants = {
    primary: 'bg-primary hover:bg-primary-dark text-white disabled:bg-gray-600',
    secondary: 'bg-gray-700 hover:bg-gray-600 text-white disabled:bg-gray-800',
    outline: 'border border-gray-600 hover:bg-gray-800 text-white disabled:border-gray-800',
    danger: 'bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-600',
    ghost: 'hover:bg-gray-800 text-gray-400 hover:text-white',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className} ${
        disabled || loading ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      )}
      {children}
    </button>
  );
}

export default Button;
