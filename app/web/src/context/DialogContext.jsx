import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, Trash2, X } from 'lucide-react';

const DialogContext = createContext(null);

export function DialogProvider({ children }) {
  // Confirm & Alert Modal State
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Lanjutkan',
    cancelText: 'Batal',
    type: 'danger', // 'danger' | 'primary' | 'info' | 'warning'
    isConfirm: true,
  });

  const resolverRef = useRef(null);

  // Toast Notifications State
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 7);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const confirm = useCallback(
    ({
      title = 'Konfirmasi Tindakan',
      message = 'Apakah Anda yakin ingin melanjutkan tindakan ini?',
      confirmText = 'Ya, Lanjutkan',
      cancelText = 'Batal',
      type = 'danger',
    }) => {
      return new Promise((resolve) => {
        resolverRef.current = resolve;
        setModalState({
          isOpen: true,
          title,
          message,
          confirmText,
          cancelText,
          type,
          isConfirm: true,
        });
      });
    },
    []
  );

  const showAlert = useCallback(
    ({
      title = 'Pemberitahuan',
      message = '',
      confirmText = 'Mengerti',
      type = 'info',
    }) => {
      return new Promise((resolve) => {
        resolverRef.current = resolve;
        setModalState({
          isOpen: true,
          title,
          message,
          confirmText,
          cancelText: '',
          type,
          isConfirm: false,
        });
      });
    },
    []
  );

  const handleConfirm = () => {
    if (resolverRef.current) resolverRef.current(true);
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleCancel = () => {
    if (resolverRef.current) resolverRef.current(false);
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  const getModalIcon = (type) => {
    switch (type) {
      case 'danger':
        return (
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <Trash2 className="w-6 h-6" />
          </div>
        );
      case 'warning':
        return (
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
        );
      case 'primary':
      case 'success':
        return (
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        );
      case 'info':
      default:
        return (
          <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center shrink-0">
            <Info className="w-6 h-6" />
          </div>
        );
    }
  };

  const getToastIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />;
      case 'error':
      case 'danger':
        return <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-sky-600 shrink-0" />;
    }
  };

  return (
    <DialogContext.Provider value={{ confirm, showAlert, showToast }}>
      {children}

      {/* Custom Confirmation / Alert Modal */}
      {modalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200/80 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              {getModalIcon(modalState.type)}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  {modalState.title}
                </h3>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  {modalState.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              {modalState.isConfirm && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-semibold text-sm transition-colors shadow-xs"
                >
                  {modalState.cancelText}
                </button>
              )}
              <button
                type="button"
                onClick={handleConfirm}
                className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md ${
                  modalState.type === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                }`}
              >
                {modalState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 pointer-events-none max-w-sm w-full px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center justify-between gap-3 p-4 rounded-2xl bg-white/95 backdrop-blur-md shadow-xl border border-slate-200/90 text-sm font-medium text-slate-800 transition-all animate-in slide-in-from-bottom-3 duration-200"
          >
            <div className="flex items-center gap-3 min-w-0">
              {getToastIcon(toast.type)}
              <p className="text-xs sm:text-sm text-slate-700 leading-tight">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}
