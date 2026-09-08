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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div className="flex w-full max-w-2xl flex-col rounded-2xl bg-[#11141b] border border-white/[0.08] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4 bg-[#0e1117]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <History className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Reconciliation Merge History</h2>
              <p className="text-xs text-slate-400">
                Archived consensus drafts and cherry-pick merges created in this thread
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* List of Merges */}
        <div className="max-h-[60vh] overflow-y-auto p-6 space-y-4">
          {merges.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No reconciled merges saved yet. Open the Merge Workbench to synthesize responses.
            </div>
          ) : (
            merges.map((m, idx) => (
              <div
                key={m.id || idx}
                className="rounded-2xl bg-[#141822] border border-white/[0.06] p-4 space-y-3 transition-all hover:border-amber-500/30"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[11px] font-bold text-white">
                      <GitMerge className="h-3.5 w-3.5 text-amber-400" />
                      Merge #{idx + 1}
                    </span>
                    <span className="rounded bg-black/40 px-2 py-0.5 text-[10px] font-mono text-slate-300 border border-white/[0.06]">
                      {m.sourceModels.join(' vs ')}
                    </span>
                    <span className="rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.2 text-[9px] font-mono">
                      {m.strategy}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(m.id, m.mergedText)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
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
                      className="rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 px-2.5 py-1 text-[11px] font-bold transition-colors"
                    >
                      Use as Prompt →
                    </button>
                  </div>
                </div>

                <div className="rounded-xl bg-[#0c0f15] border border-white/[0.06] p-3 text-xs leading-relaxed text-slate-200 whitespace-pre-wrap font-sans max-h-48 overflow-y-auto">
                  {m.mergedText}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-white/[0.06] px-6 py-3.5 bg-[#0e1117]">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
