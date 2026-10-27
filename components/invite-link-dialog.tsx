'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Copy, Check, Link2, Users, AlertTriangle } from 'lucide-react';

interface InviteLinkDialogProps {
  open: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
}

export function InviteLinkDialog({ open, onClose, groupId, groupName }: InviteLinkDialogProps) {
  const [inviteLink, setInviteLink] = useState<string>('');
  const [inviteCode, setInviteCode] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  async function generateLink() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/groups/${groupId}/invite-link`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to generate invite link');
      const data = await res.json();
      setInviteLink(data.inviteLink);
      setInviteCode(data.inviteCode);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate invite link');
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard(text: string, type: 'link' | 'code') {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  }

  useEffect(() => {
    if (open) {
      generateLink();
    }
  }, [open, groupId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md bg-ink border border-line rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-link-title"
      >
        <div className="p-6 border-b border-line">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="invite-link-title" className="serif text-xl font-normal text-white">
                Invite to {groupName}
              </h2>
              <p className="mt-1 text-sm text-quiet">
                Share this link or code with friends to join the group
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
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400 flex items-center gap-2">
              <AlertTriangle size={16} strokeWidth={2} />
              {error}
            </div>
          )}

          {!inviteLink && !loading && (
            <div className="text-center py-8">
              <Users size={48} strokeWidth={1.5} className="mx-auto text-quiet" />
              <p className="mt-3 text-quiet">Generate an invite link to share</p>
              <button
                onClick={generateLink}
                className="mt-4 focus-ring border border-purple/50 text-purple px-6 py-2 rounded-lg hover:bg-purple/10 transition-colors"
              >
                Generate Link
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-8">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-3 border-purple/30 border-t-purple" />
              <p className="mt-3 text-quiet">Generating invite link...</p>
            </div>
          )}

          {inviteLink && (
            <>
              <div className="space-y-4">
                <div>
                  <label htmlFor="invite-link" className="block text-sm font-medium text-white mb-2">
                    Invite Link
                  </label>
                  <div className="flex gap-2">
                    <input
                      ref={linkInputRef}
                      id="invite-link"
                      type="text"
                      value={inviteLink}
                      readOnly
                      className="flex-1 bg-surface border border-line rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple focus:border-transparent"
                    />
                    <button
                      onClick={() => copyToClipboard(inviteLink, 'link')}
                      disabled={copied === 'link'}
                      className="focus-ring flex items-center justify-center gap-1.5 border border-line px-4 py-2 rounded-lg text-quiet hover:bg-surface-2 hover:text-white transition-colors disabled:opacity-50"
                    >
                      {copied === 'link' ? (
                        <>
                          <Check size={16} strokeWidth={2} className="text-green-400" />
                          <span className="text-sm">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={16} strokeWidth={2} />
                          <span className="text-sm hidden sm:inline">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="invite-code" className="block text-sm font-medium text-white mb-2">
                    Invite Code
                  </label>
                  <div className="flex gap-2">
                    <input
                      ref={codeInputRef}
                      id="invite-code"
                      type="text"
                      value={inviteCode}
                      readOnly
                      className="flex-1 bg-surface border border-line rounded-lg px-4 py-2 text-white font-mono text-center tracking-wider focus:ring-2 focus:ring-purple focus:border-transparent"
                    />
                    <button
                      onClick={() => copyToClipboard(inviteCode, 'code')}
                      disabled={copied === 'code'}
                      className="focus-ring flex items-center justify-center gap-1.5 border border-line px-4 py-2 rounded-lg text-quiet hover:bg-surface-2 hover:text-white transition-colors disabled:opacity-50"
                    >
                      {copied === 'code' ? (
                        <>
                          <Check size={16} strokeWidth={2} className="text-green-400" />
                          <span className="text-sm">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={16} strokeWidth={2} />
                          <span className="text-sm hidden sm:inline">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-quiet">
                    Codes expire in 7 days. Share this code with friends so they can join via{" "}
                    <code className="bg-surface px-1.5 py-0.5 rounded font-mono text-xs">/groups/join/{inviteCode}</code>
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-line">
                <button
                  onClick={onClose}
                  className="flex-1 focus-ring border border-line text-quiet py-2.5 rounded-lg hover:bg-surface-2 hover:text-white transition-colors"
                >
                  Done
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}