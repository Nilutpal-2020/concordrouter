'use client';

import React from 'react';
import { MergeRecord } from '@/lib/types';
import { History, Copy, Check, GitMerge, X } from 'lucide-react';

interface MergeHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  merges: MergeRecord[];
  onInjectDraft: (text: string) => void;
}

export const MergeHistoryModal: React.FC<MergeHistoryModalProps> = ({
  isOpen,
  onClose,
  merges,
  onInjectDraft,
}) => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-2xl flex-col rounded-2xl bg-surface border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5 bg-surface-secondary/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface border border-border text-foreground">
              <History className="h-4 w-4 text-brand-terracotta" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Reconciliation Merge History</h2>
              <p className="text-xs text-text-secondary">
                Consensus drafts and cherry-picked merges saved in this thread
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* List of Merges */}
        <div className="max-h-[60vh] overflow-y-auto p-5 space-y-3">
          {merges.length === 0 ? (
            <div className="py-12 text-center text-xs text-text-muted">
              No reconciled merges saved yet. Open the Merge Workbench to synthesize responses.
            </div>
          ) : (
            merges.map((m, idx) => (
              <div
                key={m.id || idx}
                className="rounded-2xl bg-surface border border-border p-4 space-y-2.5 transition-all shadow-card"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-foreground">
                      <GitMerge className="h-3.5 w-3.5 text-brand-terracotta" />
                      Merge #{idx + 1}
                    </span>
                    <span className="rounded bg-surface-secondary px-1.5 py-0.2 text-[10px] font-mono text-text-secondary border border-border">
                      {m.sourceModels.join(' vs ')}
                    </span>
                    <span className="rounded-full bg-surface-secondary text-text-muted border border-border px-2 py-0.2 text-[9px] font-mono">
                      {m.strategy}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCopy(m.id, m.mergedText)}
                      className="rounded-lg p-1.5 text-text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
                      title="Copy text"
                    >
                      {copiedId === m.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        onInjectDraft(m.mergedText);
                        onClose();
                      }}
                      className="rounded-full bg-surface-secondary hover:bg-surface-hover text-foreground border border-border px-3 py-1 text-[11px] font-medium transition-colors"
                    >
                      Use as Prompt →
                    </button>
                  </div>
                </div>

                <div className="rounded-xl bg-surface-secondary/40 border border-border p-3 text-xs leading-relaxed text-foreground whitespace-pre-wrap font-sans max-h-48 overflow-y-auto">
                  {m.mergedText}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-border px-5 py-3 bg-surface-secondary/40">
          <button
            onClick={onClose}
            className="rounded-full px-4 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-hover hover:text-foreground transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
