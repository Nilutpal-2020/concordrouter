'use client';

import React, { useState } from 'react';
import { Thread, MessageTurn, MergeRecord } from '@/lib/types';
import { Download, FileText, Code2, X } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-lg rounded-2xl bg-surface border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5 bg-surface-secondary/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface border border-border text-foreground">
              <Download className="h-4 w-4 text-brand-terracotta" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Export Arena Session</h2>
              <p className="text-xs text-text-secondary">{thread.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4">
          <p className="text-xs leading-relaxed text-text-secondary">
            Export all turns, multi-model outputs, and reconciled merges in Markdown or JSON format.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              onClick={handleDownloadMarkdown}
              className="flex items-center justify-center gap-2.5 rounded-xl bg-surface-secondary hover:bg-surface-hover border border-border hover:border-border-strong p-4 text-xs font-medium text-foreground transition-all group shadow-sm"
            >
              <FileText className="h-4 w-4 text-text-muted group-hover:text-foreground transition-colors" />
              <span>Markdown (.md)</span>
            </button>

            <button
              onClick={handleDownloadJSON}
              className="flex items-center justify-center gap-2.5 rounded-xl bg-surface-secondary hover:bg-surface-hover border border-border hover:border-border-strong p-4 text-xs font-medium text-foreground transition-all group shadow-sm"
            >
              <Code2 className="h-4 w-4 text-text-muted group-hover:text-foreground transition-colors" />
              <span>JSON (.json)</span>
            </button>
          </div>

          <div className="pt-2 text-[11px] text-text-muted font-mono text-center">
            {turns.length} Turn(s) • {merges.length} Saved Merge(s)
          </div>
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
