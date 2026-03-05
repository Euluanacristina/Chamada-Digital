import React from 'react';
import { X, AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { cn } from './Button';

export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-bottom border-gray-100 flex items-center justify-between">
          <h3 className="text-xl font-display font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>
        {footer && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export const Table: React.FC<{
  headers: string[];
  children: React.ReactNode;
  className?: string;
}> = ({ headers, children, className }) => (
  <div className={cn('overflow-x-auto border border-gray-100 rounded-xl', className)}>
    <table className="w-full text-left border-collapse">
      <thead className="bg-gray-50 border-bottom border-gray-100">
        <tr>
          {headers.map((header, i) => (
            <th key={i} className="px-6 py-4 text-sm font-semibold text-gray-700 uppercase tracking-wider">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 bg-white">
        {children}
      </tbody>
    </table>
  </div>
);

export const ProgressBar: React.FC<{ progress: number; label?: string }> = ({ progress, label }) => (
  <div className="w-full">
    {label && <div className="flex justify-between text-sm mb-1 text-gray-700 font-medium"><span>{label}</span><span>{Math.round(progress)}%</span></div>}
    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
      <div 
        className="h-full bg-slate transition-all duration-500 ease-out" 
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  </div>
);

export const EmptyState: React.FC<{ icon: React.ReactNode; title: string; description: string; action?: React.ReactNode }> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center">
    <div className="p-4 bg-slate-bg rounded-full text-slate mb-4">
      {icon}
    </div>
    <h3 className="text-xl font-display font-semibold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-500 max-w-xs mb-6">{description}</p>
    {action}
  </div>
);

export const ConfirmDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
}> = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'danger' }) => (
  <Modal isOpen={isOpen} onClose={onClose} title={title} footer={
    <>
      <Button variant="ghost" onClick={onClose}>{cancelText}</Button>
      <Button variant={variant} onClick={() => { onConfirm(); onClose(); }}>{confirmText}</Button>
    </>
  }>
    <div className="flex items-start gap-4">
      <div className={cn('p-2 rounded-full', variant === 'danger' ? 'bg-red-bg text-red-text' : 'bg-slate-bg text-slate')}>
        <AlertCircle className="w-6 h-6" />
      </div>
      <p className="text-gray-700">{message}</p>
    </div>
  </Modal>
);
