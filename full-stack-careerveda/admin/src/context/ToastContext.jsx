import {createContext, useCallback, useContext, useMemo, useState} from "react";

const ToastContext = createContext(null);

let nextId = 1;

export const ToastProvider = ({children}) => {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (message, tone = "info") => {
      const id = nextId++;

      // Errors persist until dismissed, so repeating an action that fails the
      // same way stacked three identical toasts and buried the form behind them.
      // An unread copy of this exact message is already saying this.
      setToasts((current) =>
        current.some((toast) => toast.message === message && toast.tone === tone)
          ? current
          : [...current, {id, message, tone}],
      );

      // Errors stay until dismissed. An error that vanishes after four seconds
      // is an error the user may never have read, and this is the only place
      // the reason for a failed save is shown.
      if (tone !== "error") {
        setTimeout(() => dismiss(id), 4000);
      }

      return id;
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      toast: push,
      success: (message) => push(message, "success"),
      error: (message) => push(message, "error"),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* aria-live=polite so a screen reader announces the outcome of a save
          without interrupting whatever it is currently reading. */}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.tone}`}>
            <span>{toast.message}</span>
            <button type="button" onClick={() => dismiss(toast.id)} aria-label="Dismiss">
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
};
