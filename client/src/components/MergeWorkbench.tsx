'use client';

import React, { useState, useEffect } from 'react';
import { ModelResponse, ChunkSegment } from '@/lib/types';
import { segmentResponseText, saveMergeRecord } from '@/lib/api';
import { GitMerge, X, ArrowRight, Check, Sparkles, Copy, Send, Plus, Trash2 } from 'lucide-react';

interface MergeWorkbenchProps {
  isOpen: boolean;
  onClose: () => void;
  threadId: string;
  turnId: string;
  modelAKey: string;
  modelBKey: string;
  responseA: ModelResponse;
  responseB: ModelResponse;
  onContinueFromMerge: (mergedText: string) => void;
}

export const MergeWorkbench: React.FC<MergeWorkbenchProps> = ({
  isOpen,
  onClose,
  threadId,
  turnId,
  modelAKey,
  modelBKey,
  responseA,
  responseB,
  onContinueFromMerge,
}) => {
  const [segmentsA, setSegmentsA] = useState<ChunkSegment[]>([]);
  const [segmentsB, setSegmentsB] = useState<ChunkSegment[]>([]);
  const [pickedSegments, setPickedSegments] = useState<ChunkSegment[]>([]);
  const [draftText, setDraftText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    Promise.all([
      segmentResponseText(responseA?.content || '', modelAKey),
      segmentResponseText(responseB?.content || '', modelBKey),
    ])
      .then(([segsA, segsB]) => {
        setSegmentsA(segsA);
        setSegmentsB(segsB);
        setPickedSegments([]);
        setDraftText('');
      })
      .finally(() => setIsLoading(false));
  }, [isOpen, modelAKey, modelBKey, responseA?.content, responseB?.content]);

  if (!isOpen) return null;

  const handleAddSegment = (seg: ChunkSegment) => {
    const updated = [...pickedSegments, seg];
    setPickedSegments(updated);
    setDraftText((prev) => (prev ? prev + '\n\n' + seg.content : seg.content));
  };

  const handleRemoveSegment = (index: number) => {
    const updated = pickedSegments.filter((_, i) => i !== index);
    setPickedSegments(updated);
    const newText = updated.map((s) => s.content).join('\n\n');
    setDraftText(newText);
  };

  const handleAcceptAllA = () => {
    setDraftText(responseA?.content || '');
    setPickedSegments(segmentsA);
  };

  const handleAcceptAllB = () => {
    setDraftText(responseB?.content || '');
    setPickedSegments(segmentsB);
  };

  const handleSaveAndContinue = async () => {
    if (!draftText.trim()) return;

    try {
      await saveMergeRecord(threadId, {
        threadId,
        turnId,
        sourceModels: [modelAKey, modelBKey],
        mergedText: draftText,
        strategy: 'manual_cherrypick',
        segments: pickedSegments,
      });
      onContinueFromMerge(draftText);
      onClose();
    } catch (e) {
      console.error('Failed to save merge record', e);
      onContinueFromMerge(draftText);
      onClose();
    }
  };

  const handleCopyDraft = () => {
    navigator.clipboard.writeText(draftText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-7xl h-[92vh] rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <GitMerge className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Cherry-Pick Merge Workbench
                <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded px-1.5 py-0.2 font-mono">Phase 3</span>
              </h2>
              <p className="text-xs text-slate-400">
                Click chunk blocks on the left or right to stitch together an authoritative reconciled answer.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 3-Column Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
          {/* Column A: Model A Segments */}
          <div className="lg:col-span-4 flex flex-col h-full bg-slate-950/40 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-950/80">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
                <span className="text-xs font-semibold text-white truncate">{modelAKey}</span>
              </div>
              <button
                onClick={handleAcceptAllA}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium hover:underline"
              >
                Accept All →
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {segmentsA.map((seg) => (
                <div
                  key={seg.id}
                  onClick={() => handleAddSegment(seg)}
                  className="group relative rounded-xl bg-slate-900/80 hover:bg-cyan-950/30 border border-slate-800/80 hover:border-cyan-500/40 p-3 text-xs leading-relaxed text-slate-300 cursor-pointer transition-all shadow-sm"
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mb-1">
                    <span className="uppercase">{seg.type}</span>
                    <span className="opacity-0 group-hover:opacity-100 text-cyan-400 flex items-center gap-1 font-sans transition-opacity">
                      <Plus className="h-3 w-3" /> Pick chunk
                    </span>
                  </div>
                  <div className="whitespace-pre-wrap">{seg.content}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Column B: Model B Segments */}
          <div className="lg:col-span-4 flex flex-col h-full bg-slate-950/40 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-950/80">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-purple-400" />
                <span className="text-xs font-semibold text-white truncate">{modelBKey}</span>
              </div>
              <button
                onClick={handleAcceptAllB}
                className="text-[11px] text-purple-400 hover:text-purple-300 font-medium hover:underline"
              >
                Accept All →
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {segmentsB.map((seg) => (
                <div
                  key={seg.id}
                  onClick={() => handleAddSegment(seg)}
                  className="group relative rounded-xl bg-slate-900/80 hover:bg-purple-950/30 border border-slate-800/80 hover:border-purple-500/40 p-3 text-xs leading-relaxed text-slate-300 cursor-pointer transition-all shadow-sm"
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mb-1">
                    <span className="uppercase">{seg.type}</span>
                    <span className="opacity-0 group-hover:opacity-100 text-purple-400 flex items-center gap-1 font-sans transition-opacity">
                      <Plus className="h-3 w-3" /> Pick chunk
                    </span>
                  </div>
                  <div className="whitespace-pre-wrap">{seg.content}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Column C: Merged Synthesis Draft */}
          <div className="lg:col-span-4 flex flex-col h-full bg-slate-900 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/80">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-semibold text-white">Reconciled Merged Draft</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyDraft}
                  disabled={!draftText}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-30 transition-colors"
                  title="Copy draft"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                {pickedSegments.length > 0 && (
                  <button
                    onClick={() => {
                      setPickedSegments([]);
                      setDraftText('');
                    }}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors"
                    title="Clear draft"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 flex flex-col p-4 space-y-3 overflow-hidden">
              <textarea
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                placeholder="Click segments from either model to build your merged draft, or type freeform edits here..."
                className="flex-1 w-full rounded-xl bg-slate-950 border border-slate-800 p-4 text-xs sm:text-sm leading-relaxed text-slate-100 placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none font-sans"
              />

              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono px-1">
                <span>{draftText ? draftText.split(/\s+/).filter(Boolean).length : 0} words</span>
                <span>{pickedSegments.length} cherry-picked chunks</span>
              </div>
            </div>

            {/* Footer Action */}
            <div className="border-t border-slate-800 px-4 py-3 bg-slate-950/80 flex items-center justify-between">
              <button
                onClick={onClose}
                className="rounded-xl px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAndContinue}
                disabled={!draftText.trim()}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-600/30 transition-all active:scale-[0.98]"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Save & Continue Next Turn</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
