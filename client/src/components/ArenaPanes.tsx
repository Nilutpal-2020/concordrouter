'use client';

import React, { useState, useEffect } from 'react';
import { TargetModel, ModelResponse, GatingDecision } from '@/lib/types';
import { evaluateMergeGating } from '@/lib/api';
import { Cpu, RefreshCw, Copy, Check, GitMerge, AlertCircle, Clock, Sparkles, CheckCircle2 } from 'lucide-react';

interface ArenaPanesProps {
  prompt?: string;
  selectedModels: TargetModel[];
  responses: Record<string, ModelResponse>;
  isStreaming: boolean;
  onRetryPane: (target: TargetModel) => void;
  onOpenMerge: (sourceModelA: string, sourceModelB: string) => void;
}

export const ArenaPanes: React.FC<ArenaPanesProps> = ({
  prompt = '',
  selectedModels,
  responses,
  isStreaming,
  onRetryPane,
  onOpenMerge,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [gatingDecision, setGatingDecision] = useState<GatingDecision | null>(null);

  const completedKeys = selectedModels
    .map((m) => `${m.providerId}:${m.model}`)
    .filter((k) => responses[k]?.status === 'completed' && responses[k]?.content);

  // Phase 4: Gating Evaluation
  useEffect(() => {
    if (completedKeys.length >= 2 && !isStreaming) {
      const respA = responses[completedKeys[0]]?.content || '';
      const respB = responses[completedKeys[1]]?.content || '';

      evaluateMergeGating(prompt, respA, respB)
        .then((decision) => setGatingDecision(decision))
        .catch(() => {
          setGatingDecision({
            eligible: true,
            isConsensus: false,
            similarityScore: 0.5,
            badgeText: 'Reconcile Answers',
            reason: '',
          });
        });
    } else {
      setGatingDecision(null);
    }
  }, [completedKeys.length, isStreaming, prompt]);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const gridColsClass =
    selectedModels.length === 1
      ? 'grid-cols-1'
      : selectedModels.length === 2
      ? 'grid-cols-1 md:grid-cols-2'
      : selectedModels.length === 3
      ? 'grid-cols-1 md:grid-cols-3'
      : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4';

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Phase 4: Gating Heuristic Banner / Consensus Badge */}
      {completedKeys.length >= 2 && !isStreaming && gatingDecision && (
        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3.5 shadow-lg backdrop-blur-md transition-all ${
            gatingDecision.isConsensus
              ? 'bg-gradient-to-r from-emerald-950/60 via-teal-950/50 to-slate-900 border border-emerald-500/30'
              : gatingDecision.eligible
              ? 'bg-gradient-to-r from-blue-950/70 via-indigo-950/60 to-purple-950/70 border border-blue-500/30'
              : 'bg-slate-900/80 border border-slate-800 text-slate-400'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-xl border ${
                gatingDecision.isConsensus
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
              }`}
            >
              {gatingDecision.isConsensus ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <GitMerge className="h-4 w-4" />
              )}
            </div>
            <div>
              <h4 className="text-xs font-semibold text-white flex items-center gap-2">
                {gatingDecision.badgeText || 'Multi-Model Analysis Complete'}
              </h4>
              <p className="text-[11px] text-slate-300">{gatingDecision.reason}</p>
            </div>
          </div>

          {/* Launch Workbench Button if eligible or user wants to inspect */}
          <button
            onClick={() => onOpenMerge(completedKeys[0], completedKeys[1])}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-md transition-all active:scale-[0.98] ${
              gatingDecision.isConsensus
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/25'
            }`}
          >
            <GitMerge className="h-3.5 w-3.5" />
            <span>{gatingDecision.isConsensus ? 'Inspect Diff & Heatmap' : 'Launch Merge Workbench'}</span>
          </button>
        </div>
      )}

      {/* Grid of Independent Response Panes */}
      <div className={`grid ${gridColsClass} gap-3.5 flex-1 min-h-[400px]`}>
        {selectedModels.map((target) => {
          const modelKey = `${target.providerId}:${target.model}`;
          const resp = responses[modelKey];
          const isCurrentStreaming = resp?.status === 'streaming';
          const hasError = resp?.status === 'error';

          return (
            <div
              key={modelKey}
              className="flex flex-col rounded-2xl bg-slate-900/90 border border-slate-800/90 shadow-xl overflow-hidden backdrop-blur-sm transition-all hover:border-slate-700/80"
            >
              {/* Pane Header */}
              <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3 bg-slate-950/60">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800/90 border border-slate-700/80 text-blue-400 shrink-0">
                    <Cpu className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-white truncate">{target.model}</span>
                      <span className="rounded bg-slate-800 px-1 py-0.2 text-[9px] uppercase font-mono text-slate-400">
                        {target.providerId}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pane Actions & Metrics */}
                <div className="flex items-center gap-2 shrink-0">
                  {resp?.latencyMs ? (
                    <span className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                      <Clock className="h-3 w-3" />
                      {(resp.latencyMs / 1000).toFixed(1)}s
                    </span>
                  ) : null}

                  {resp?.content && (
                    <button
                      onClick={() => handleCopy(modelKey, resp.content)}
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                      title="Copy response"
                    >
                      {copiedKey === modelKey ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => onRetryPane(target)}
                    disabled={isStreaming}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-30 transition-colors"
                    title="Retry this pane"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Pane Content Body */}
              <div className="flex-1 overflow-y-auto p-4 text-xs sm:text-[13px] leading-relaxed text-slate-200">
                {!resp && !isStreaming && (
                  <div className="flex h-full flex-col items-center justify-center text-center p-6 text-slate-500">
                    <Sparkles className="h-7 w-7 text-slate-700 mb-2" />
                    <p className="text-xs">Waiting for prompt submission...</p>
                  </div>
                )}

                {isCurrentStreaming && !resp?.content && (
                  <div className="flex items-center gap-2 text-slate-400 text-xs py-4">
                    <span className="streaming-cursor" />
                    <span className="animate-pulse">Connecting to {target.model}...</span>
                  </div>
                )}

                {hasError && (
                  <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3.5 text-xs text-red-400 space-y-2">
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>Execution Error</span>
                    </div>
                    <p className="text-red-300/90">{resp.error || 'Failed to generate response'}</p>
                    <button
                      onClick={() => onRetryPane(target)}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 px-3 py-1.5 text-xs text-red-200 font-medium transition-colors"
                    >
                      <RefreshCw className="h-3 w-3" /> Retry Pane
                    </button>
                  </div>
                )}

                {resp?.content && (
                  <div className="prose prose-invert prose-xs max-w-none space-y-2 whitespace-pre-wrap font-sans selection:bg-blue-600">
                    {resp.content}
                    {isCurrentStreaming && <span className="streaming-cursor" />}
                  </div>
                )}
              </div>

              {/* Pane Footer */}
              {resp && (
                <div className="flex items-center justify-between border-t border-slate-800/60 px-4 py-2 bg-slate-950/40 text-[10px] text-slate-400 font-mono">
                  <span>{resp.tokens || 0} tokens</span>
                  <span className="capitalize">{resp.status}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
