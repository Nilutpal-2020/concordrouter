'use client';

import React, { useState } from 'react';
import { Thread, MessageTurn, MergeRecord } from '@/lib/types';
import { Download, Copy, Check, FileText, Code2, X } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  thread: Thread | null;
  turns: MessageTurn[];
  merges: MergeRecord[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  thread,
  turns,
  merges,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen || !thread) return null;

  const generateMarkdown = () => {
    let md = `# ${thread.title}\n\n`;
    md += `*Exported from ConcordRouter on ${new Date().toLocaleString()}*\n\n---\n\n`;

    turns.forEach((turn, idx) => {
      md += `## Turn ${idx + 1}\n\n`;
      md += `**Prompt:**\n> ${turn.userPrompt}\n\n`;
      md += `### Model Responses\n\n`;

      Object.entries(turn.responses || {}).forEach(([key, resp]) => {
        md += `#### ${key}\n\n${resp.content}\n\n`;
      });

      md += `---\n\n`;
    });

    if (merges.length > 0) {
      md += `## Reconciled Merges\n\n`;
      merges.forEach((m, idx) => {
        md += `### Merge ${idx + 1} (${m.sourceModels.join(' & ')} via ${m.strategy})\n\n`;
        md += `${m.mergedText}\n\n---\n\n`;
      });
    }

    return md;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateMarkdown());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const md = generateMarkdown();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `concord_${thread.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJSON = () => {
    const jsonStr = JSON.stringify({ thread, turns, merges }, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `concord_${thread.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div className="flex flex-col w-full max-w-xl rounded-2xl bg-[#11141b] border border-white/[0.08] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4 bg-[#0e1117]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Download className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Export Arena Session</h2>
              <p className="text-xs text-slate-400">{thread.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-xs leading-relaxed text-slate-300">
            Export all turns, multi-model outputs, and reconciled cherry-picked merges in Markdown or JSON format.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleDownloadMarkdown}
              className="flex items-center justify-center gap-2.5 rounded-2xl bg-[#141822] hover:bg-[#1a202c] border border-white/[0.08] hover:border-amber-500/30 p-4 text-xs font-bold text-white transition-all group"
            >
              <FileText className="h-5 w-5 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>Download Markdown (.md)</span>
            </button>

            <button
              onClick={handleDownloadJSON}
              className="flex items-center justify-center gap-2.5 rounded-2xl bg-[#141822] hover:bg-[#1a202c] border border-white/[0.08] hover:border-amber-500/30 p-4 text-xs font-bold text-white transition-all group"
            >
              <Code2 className="h-5 w-5 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span>Download JSON (.json)</span>
            </button>
          </div>

          <div className="pt-2 text-[11px] text-slate-500 font-mono text-center">
            {turns.length} Turn(s) • {merges.length} Saved Merge(s) • {thread.id}
          </div>
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
