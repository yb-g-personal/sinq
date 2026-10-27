'use client';

import { useState } from 'react';
import { X, AlertTriangle, Trash2, CheckCircle } from 'lucide-react';

interface DeleteAccountModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteAccountModal({ open, onClose, onConfirm }: DeleteAccountModalProps) {
  const [step, setStep] = useState<'confirm' | 'deleting' | 'deleted'>('confirm');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const requiredText = 'DELETE MY ACCOUNT';

  async function handleConfirm() {
    if (confirmText !== requiredText) {
      setError('Please type "DELETE MY ACCOUNT" to confirm');
      return;
    }

    setStep('deleting');
    setError(null);
    try {
      await onConfirm();
      setStep('deleted');
    } catch (e) {
      setStep('confirm');
      setError(e instanceof Error ? e.message : 'Failed to delete account. Please try again.');
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md bg-ink border border-line rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
      >
        {step === 'confirm' && (
          <>
            <div className="p-6 border-b border-line">
              <div className="flex items-start justify-between">
                <div>
                  <h2 id="delete-account-title" className="serif text-xl font-normal text-white">
                    Delete your account
                  </h2>
                  <p className="mt-1 text-sm text-quiet">
                    This action is permanent and cannot be undone.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="focus-ring p-1 text-quiet hover:text-white"
                  aria-label="Close"
                >
                  <X size={20} strokeWidth={2} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <AlertTriangle size={20} strokeWidth={1.5} className="text-red-400 shrink-0 mt-0.5" />
                <div className="text-sm text-quiet space-y-2">
                  <p><strong className="text-white">All your data will be permanently deleted:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Your profile, username, and bio</li>
                    <li>All friendships and friend requests</li>
                    <li>All groups you own and your memberships</li>
                    <li>All blends (pair and group) and their track history</li>
                    <li>Connected music service accounts and listening data</li>
                    <li>All notifications</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirm-input" className="block text-sm font-medium text-white">
                  Type <code className="bg-surface-2 px-1.5 py-0.5 rounded text-purple font-mono">
                    {requiredText}
                  </code> to confirm:
                </label>
                <input
                  id="confirm-input"
                  type="text"
                  value={confirmText}
                  onChange={(e) => {
                    setConfirmText(e.target.value);
                    setError(null);
                  }}
                  className="w-full bg-surface border border-line rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple focus:border-transparent"
                  placeholder={requiredText}
                  autoFocus
                />
                {error && (
                  <p className="text-sm text-red-400 flex items-center gap-1">
                    <AlertTriangle size={14} strokeWidth={2} />
                    {error}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 focus-ring border border-line text-quiet py-2.5 rounded-lg hover:bg-surface-2 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={confirmText !== requiredText}
                  className="flex-1 focus-ring bg-red-500/20 border border-red-500/50 text-red-400 py-2.5 rounded-lg hover:bg-red-500/30 hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </>
        )}

        {step === 'deleting' && (
          <div className="p-12 text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-3 border-purple/30 border-t-purple" />
            <h3 className="serif text-lg font-normal mt-4 text-white">Deleting your account...</h3>
            <p className="text-sm text-quiet mt-2">Please wait, this may take a moment.</p>
          </div>
        )}

        {step === 'deleted' && (
          <div className="p-12 text-center">
            <CheckCircle size={48} strokeWidth={2} className="mx-auto text-green-400" />
            <h3 className="serif text-lg font-normal mt-4 text-white">Account deleted</h3>
            <p className="text-sm text-quiet mt-2">
              Your account and all associated data have been permanently removed.
            </p>
            <button
              onClick={onClose}
              className="mt-6 focus-ring border border-purple/50 text-purple px-6 py-2 rounded-lg hover:bg-purple/10 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}