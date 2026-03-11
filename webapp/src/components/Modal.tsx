import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  type?: 'alert' | 'confirm' | 'danger';
}

export function Modal({ 
  isOpen, 
  title, 
  message, 
  confirmText = 'OK', 
  cancelText = 'Cancel', 
  onConfirm, 
  onCancel,
  type = 'alert'
}: ModalProps) {
  if (!isOpen) return null;

  const isDanger = type === 'danger';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-4 sm:p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className={`text-xl font-bold ${isDanger ? 'text-rose-500' : 'text-slate-100'}`}>
              {title}
            </h2>
            {onCancel && (
              <button 
                onClick={onCancel}
                className="text-slate-500 hover:text-slate-300 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          
          <div className="text-slate-300 text-sm mb-6 leading-relaxed">
            {message}
          </div>

          <div className="flex gap-3 justify-end">
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors border border-slate-700 cursor-pointer"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={onConfirm}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm cursor-pointer ${
                isDanger 
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/50' 
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/50'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
