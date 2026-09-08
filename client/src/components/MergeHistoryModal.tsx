'use client';

import React from 'react';
import { MergeRecord } from '@/lib/types';
import { History, Copy, Check, GitMerge, X, Clock, Sparkles } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-3xl max-h-[85vh] rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <History className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Reconciled Merges History</h2>
              <p className="text-xs text-slate-400">Review and re-use previous cherry-picked and synthesized outputs.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* List of Merges */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {merges.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No merges recorded for this thread yet.
            </div>
          ) : (
            merges.map((m, idx) => (
              <div
                key={m.id || idx}
                className="rounded-2xl bg-slate-950/70 border border-slate-800/80 p-4 space-y-3 transition-all hover:border-slate-700"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-white">
                      <GitMerge className="h-3.5 w-3.5 text-blue-400" />
                      Merge #{idx + 1}
                    </span>
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                      {m.sourceModels.join(' vs ')}
                    </span>
                    <span className="rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.2 text-[9px] font-mono">
                      {m.strategy}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(m.id, m.mergedText)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                      title="Copy text"
                    >
                      {copiedId === m.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        onInjectDraft(m.mergedText);
                        onClose();
                      }}
                      className="rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 px-2.5 py-1 text-[11px] font-medium transition-colors"
                    >
                      Use as Prompt →
                    </button>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-900 p-3 text-xs leading-relaxed text-slate-200 whitespace-pre-wrap font-sans max-h-48 overflow-y-auto">
                  {m.mergedText}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-800 px-6 py-3 bg-slate-950/80">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-1.5 text-xs font-medium text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
