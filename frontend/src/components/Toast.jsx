import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => {
        let Icon = Info;
        let color = '#60a5fa';

        if (toast.type === 'success') {
          Icon = CheckCircle2;
          color = '#34d399';
        } else if (toast.type === 'error' || toast.type === 'warning') {
          Icon = AlertCircle;
          color = toast.type === 'error' ? '#f43f5e' : '#fbbf24';
        }

        return (
          <div key={toast.id} className="toast-item">
            <Icon size={18} style={{ color, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>{toast.message}</div>
            <button 
              onClick={() => onDismiss(toast.id)} 
              style={{ color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
