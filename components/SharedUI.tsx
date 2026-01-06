
import React from 'react';
import { Loader2, CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface LoadingOverlayProps {
  show: boolean;
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ show, message }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/80 dark:bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
      <div className="relative mb-8">
        <div className="h-28 w-28 border-8 border-indigo-100/20 border-t-indigo-500 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="text-indigo-400 animate-pulse" size={40} />
        </div>
      </div>
      <h3 className="text-2xl font-black text-white mb-2 tracking-tight uppercase">Sedang Memproses</h3>
      <p className="text-slate-400 font-medium max-w-sm leading-relaxed">{message || 'Mohon tunggu sebentar...'}</p>
    </div>
  );
};

interface NotificationProps {
  show: boolean;
  type: 'SUCCESS' | 'ERROR' | 'INFO';
  title: string;
  message: string;
  onClose: () => void;
}

export const Notification: React.FC<NotificationProps> = ({ show, type, title, message, onClose }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-scale-in border border-slate-100 dark:border-slate-800">
        <div className="p-8 text-center flex flex-col items-center">
          <div className={`mb-6 p-4 rounded-full ${
            type === 'SUCCESS' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' :
            type === 'ERROR' ? 'bg-red-100 dark:bg-red-900/30 text-red-600' :
            'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600'
          }`}>
            {type === 'SUCCESS' && <CheckCircle2 size={48} />}
            {type === 'ERROR' && <AlertCircle size={48} />}
            {type === 'INFO' && <Info size={48} />}
          </div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">{title}</h3>
          <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-8">{message}</p>
          <button 
            onClick={onClose}
            className={`w-full py-4 rounded-2xl font-black text-white shadow-xl transition-all active:scale-95 ${
              type === 'SUCCESS' ? 'bg-green-600 shadow-green-100 dark:shadow-none hover:bg-green-700' :
              type === 'ERROR' ? 'bg-red-600 shadow-red-100 dark:shadow-none hover:bg-red-700' :
              'bg-indigo-600 shadow-indigo-100 dark:shadow-none hover:bg-indigo-700'
            }`}
          >
            MENGERTI
          </button>
        </div>
      </div>
    </div>
  );
};
