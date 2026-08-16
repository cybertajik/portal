import React, { useState, useEffect, useRef } from 'react';
import { Shield, Lock, Eye, EyeOff, X, ArrowRight, RotateCw, AlertTriangle } from 'lucide-react';
import { loginAdmin } from '../services/api';

export default function AdminAuthModal({ isOpen, onClose, onSuccess }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setErrorMsg('');
      setIsLoading(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!password.trim() || isLoading) return;

    setIsLoading(true);
    setErrorMsg('');

    try {
      await loginAdmin(password);
      onSuccess();
    } catch (err) {
      setErrorMsg(err.message || 'Incorrect administrator password.');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      inputRef.current?.select();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className={`modal-container admin-auth-modal ${isShaking ? 'shake-anim' : ''}`}
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '440px' }}
      >
        <div className="modal-header">
          <div className="modal-title">
            <div className="admin-lock-icon-wrap">
              <Shield size={20} color="#f59e0b" />
            </div>
            <div>
              <h3>Admin Console Lock</h3>
              <p className="modal-subtitle">Password-protected administration</p>
            </div>
          </div>
          <button 
            type="button" 
            className="btn-icon" 
            onClick={onClose} 
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '20px' }}>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '18px', lineHeight: 1.5 }}>
              Please enter the administrator master password to unlock server telemetry, container hibernation controls, and system log streams.
            </p>

            <div className="admin-input-group">
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
                ADMIN PASSWORD
              </label>
              <div className="password-input-wrapper">
                <Lock size={15} className="input-lock-icon" />
                <input
                  ref={inputRef}
                  type={showPassword ? 'text' : 'password'}
                  className={`admin-pass-input ${errorMsg ? 'input-error' : ''}`}
                  placeholder="Enter administrator password..."
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="btn-toggle-eye"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="admin-auth-error">
                <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
            <button 
              type="button" 
              className="btn btn-outline" 
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isLoading || !password.trim()}
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
            >
              {isLoading ? (
                <>
                  <RotateCw size={15} className="spin-anim" />
                  Verifying...
                </>
              ) : (
                <>
                  Unlock Admin Console
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
