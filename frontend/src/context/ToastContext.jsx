import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

let idSeq = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((message, type = "info") => {
    const id = ++idSeq;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      4000,
    );
  }, []);

  const remove = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const toast = {
    success: (msg) => add(msg, "success"),
    error: (msg) => add(msg, "error"),
    info: (msg) => add(msg, "info"),
  };

  const icons = {
    success: <CheckCircle size={16} className="text-emerald-400 shrink-0" />,
    error: <XCircle size={16} className="text-red-400 shrink-0" />,
    info: <Info size={16} className="text-blue-400 shrink-0" />,
  };

  const bars = {
    success: "bg-emerald-500",
    error: "bg-red-500",
    info: "bg-blue-500",
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast stack */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 shadow-2xl w-80 animate-fade-in relative overflow-hidden"
          >
            {icons[t.type]}
            <p className="text-gray-200 text-sm flex-1">{t.message}</p>
            <button
              onClick={() => remove(t.id)}
              className="text-gray-500 hover:text-gray-300 transition-colors ml-1"
            >
              <X size={14} />
            </button>
            <div
              className={`absolute bottom-0 left-0 h-0.5 w-full ${bars[t.type]} opacity-60`}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
