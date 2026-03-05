export * from './Button';
export * from './feedback';

import React from 'react';
import { cn } from './Button';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'presente' | 'falta' | 'justificada' | 'regular' | 'critico' | 'info';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'info', className }) => {
  const variants = {
    presente: 'bg-green-bg text-green-text',
    falta: 'bg-red-bg text-red-text',
    justificada: 'bg-amber-bg text-amber-text',
    regular: 'bg-green-bg text-green-text',
    critico: 'bg-red-bg text-red-text',
    info: 'bg-slate-bg text-slate',
  };

  return (
    <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider', variants[variant], className)}>
      {children}
    </span>
  );
};

export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className, onClick }) => (
  <div 
    onClick={onClick}
    className={cn('bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow', onClick && 'cursor-pointer', className)}
  >
    {children}
  </div>
);

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }> = ({ label, error, className, ...props }) => (
  <div className="w-full">
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <input
      className={cn(
        'w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate/20 transition-all',
        error && 'border-red-text focus:ring-red-text/20',
        className
      )}
      {...props}
    />
    {error && <p className="mt-1 text-xs text-red-text">{error}</p>}
  </div>
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string }> = ({ label, error, children, className, ...props }) => (
  <div className="w-full">
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <select
      className={cn(
        'w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate/20 transition-all appearance-none',
        error && 'border-red-text focus:ring-red-text/20',
        className
      )}
      {...props}
    >
      {children}
    </select>
    {error && <p className="mt-1 text-xs text-red-text">{error}</p>}
  </div>
);
