'use client';

import React, { useState, useEffect } from 'react';
import { TargetModel, ModelResponse, GatingDecision } from '@/lib/types';
import { evaluateMergeGating } from '@/lib/api';
import {
  Cpu,
  RefreshCw,
  Copy,
  Check,
  GitMerge,
  AlertCircle,
  Clock,
  Sparkles,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Columns,
  LayoutList,
  Eye,
  Type,
  Zap,
  Flame,
  ArrowRight,
  Code2,
  Scale,
  FileCode2,
} from 'lucide-react';

interface ArenaPanesProps {
  prompt?: string;
  selectedModels: TargetModel[];
  responses: Record<string, ModelResponse>;
  isStreaming: boolean;
  onRetryPane: (target: TargetModel) => void;
  onOpenMerge: (sourceModelA: string, sourceModelB: string) => void;
  onSelectPromptTemplate?: (promptText: string) => void;
}

type LayoutMode = 'grid' | 'focus' | 'stacked';
type TextSize = 'compact' | 'comfortable' | 'spacious';

export const ArenaPanes: React.FC<ArenaPanesProps> = ({
  prompt = '',
  selectedModels,
  responses,
  isStreaming,
  onRetryPane,
  onOpenMerge,
  onSelectPromptTemplate,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [gatingDecision, setGatingDecision] = useState<GatingDecision | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid');
  const [textSize, setTextSize] = useState<TextSize>('comfortable');
  const [focusedModelKey, setFocusedModelKey] = useState<string | null>(null);

  const completedKeys = selectedModels
    .map((m) => `${m.providerId}:${m.model}`)
    .filter((k) => responses[k]?.status === 'completed' && responses[k]?.content);

  // Default focused model to the first model if unset
  useEffect(() => {
    if (selectedModels.length > 0 && !focusedModelKey) {
      setFocusedModelKey(`${selectedModels[0].providerId}:${selectedModels[0].model}`);
    }
  }, [selectedModels, focusedModelKey]);

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

  // Provider-specific accent styling
  const getProviderTheme = (providerId: string) => {
    switch (providerId.toLowerCase()) {
      case 'anthropic':
        return {
          badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
          borderAccent: 'hover:border-amber-500/40 focus-within:border-amber-500/50',
          glow: 'from-amber-500/10 to-transparent',
          dot: 'bg-amber-400',
        };
      case 'openai':
        return {
          badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
          borderAccent: 'hover:border-emerald-500/40 focus-within:border-emerald-500/50',
          glow: 'from-emerald-500/10 to-transparent',
          dot: 'bg-emerald-400',
        };
      case 'gemini':
        return {
          badgeBg: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
          borderAccent: 'hover:border-indigo-500/40 focus-within:border-indigo-500/50',
          glow: 'from-indigo-500/10 to-transparent',
          dot: 'bg-indigo-400',
        };
      case 'ollama':
        return {
          badgeBg: 'bg-orange-500/10 text-orange-300 border-orange-500/30',
          borderAccent: 'hover:border-orange-500/40 focus-within:border-orange-500/50',
          glow: 'from-orange-500/10 to-transparent',
          dot: 'bg-orange-400',
        };
      case 'openrouter':
        return {
          badgeBg: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
          borderAccent: 'hover:border-cyan-500/40 focus-within:border-cyan-500/50',
          glow: 'from-cyan-500/10 to-transparent',
          dot: 'bg-cyan-400',
        };
      default:
        return {
          badgeBg: 'bg-slate-700/30 text-slate-300 border-slate-600/40',
          borderAccent: 'hover:border-amber-500/30 focus-within:border-amber-500/40',
          glow: 'from-slate-500/10 to-transparent',
          dot: 'bg-slate-400',
        };
    }
  };

  const getTextSizeClass = () => {
    switch (textSize) {
      case 'compact':
        return 'text-xs leading-relaxed';
      case 'spacious':
        return 'text-base leading-loose';
      case 'comfortable':
      default:
        return 'text-sm leading-relaxed';
    }
  };

  const hasAnyResponses = Object.keys(responses).length > 0 && 
    Object.values(responses).some((r) => r.content || r.status === 'streaming');

  const starterTemplates = [
    {
      title: 'Distributed Cache Architecture',
      desc: 'Compare Redis vs Memcached vs Local cache strategies with failover guarantees.',
      icon: Code2,
      prompt: 'Compare distributed cache architecture tradeoffs between Redis Cluster, Memcached, and in-memory caches. Provide a structured comparison covering consistency, throughput, and failover mechanics.',
    },
    {
      title: 'Security Vulnerability Audit',
      desc: 'Audit a JWT authentication handler for token substitution & replay risks.',
      icon: Scale,
      prompt: 'Audit standard JWT authentication in microservices for common security flaws like token substitution, weak algorithms (none), replay attacks, and key rotation strategies. Suggest hardening practices.',
    },
    {
      title: 'React Concurrent vs SolidJS Reactivity',
      desc: 'Deep technical comparison of VDOM fiber reconciliation vs fine-grained signals.',
      icon: FileCode2,
      prompt: 'Compare React 19 concurrent fiber reconciliation with SolidJS fine-grained signal reactivity. Contrast memory overhead, compiler reliance, and re-rendering performance in detail.',
    },
  ];

  return (
    <div className="flex flex-col h-full space-y-3.5">
      {/* Top Arena Control & Mode Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl bg-[#11141b]/90 border border-white/[0.08] px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
            <Zap className="h-4 w-4 text-amber-400" />
            <span>Arena Workspace</span>
            <span className="rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 text-[10px] font-mono">
              {selectedModels.length} {selectedModels.length === 1 ? 'Model' : 'Models'} Active
            </span>
          </div>

          {isStreaming && (
            <span className="flex items-center gap-1.5 text-[11px] font-mono text-amber-400 animate-pulse bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              Streaming Fan-out...
            </span>
          )}
        </div>

        {/* View Controls: Layout Switcher & Text Size */}
        <div className="flex items-center gap-2">
          {/* Layout Selector */}
          <div className="flex items-center rounded-xl bg-black/40 border border-white/[0.06] p-0.5 text-xs">
            <button
              onClick={() => setLayoutMode('grid')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition-all ${
                layoutMode === 'grid'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Side-by-Side Grid Layout"
            >
              <Columns className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Grid</span>
            </button>

            <button
              onClick={() => {
                setLayoutMode('focus');
                if (!focusedModelKey && selectedModels.length > 0) {
                  setFocusedModelKey(`${selectedModels[0].providerId}:${selectedModels[0].model}`);
                }
              }}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition-all ${
                layoutMode === 'focus'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Focus Single Model Layout"
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Focus</span>
            </button>

            <button
              onClick={() => setLayoutMode('stacked')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition-all ${
                layoutMode === 'stacked'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Stacked Comparison Layout"
            >
              <LayoutList className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Stacked</span>
            </button>
          </div>

          {/* Typography Scale Toggle */}
          <div className="flex items-center rounded-xl bg-black/40 border border-white/[0.06] p-0.5 text-xs">
            <button
              onClick={() => setTextSize('compact')}
              className={`rounded-lg px-2 py-1 text-[11px] font-mono transition-all ${
                textSize === 'compact' ? 'bg-white/10 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Compact Font Size (12px)"
            >
              S
            </button>
            <button
              onClick={() => setTextSize('comfortable')}
              className={`rounded-lg px-2 py-1 text-[11px] font-mono transition-all ${
                textSize === 'comfortable' ? 'bg-white/10 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Comfortable Font Size (14px)"
            >
              M
            </button>
            <button
              onClick={() => setTextSize('spacious')}
              className={`rounded-lg px-2 py-1 text-[11px] font-mono transition-all ${
                textSize === 'spacious' ? 'bg-white/10 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Spacious Font Size (16px)"
            >
              L
            </button>
          </div>
        </div>
      </div>

      {/* Phase 4: Gating Heuristic Banner / Consensus Badge */}
      {completedKeys.length >= 2 && !isStreaming && gatingDecision && (
        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3.5 shadow-lg backdrop-blur-md transition-all ${
            gatingDecision.isConsensus
              ? 'bg-gradient-to-r from-emerald-950/60 via-[#111915] to-[#0c0f14] border border-emerald-500/30'
              : gatingDecision.eligible
              ? 'bg-gradient-to-r from-amber-950/50 via-[#1a140b] to-[#0c0f14] border border-amber-500/30'
              : 'bg-[#11141b] border border-white/[0.08] text-slate-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-xl border ${
                gatingDecision.isConsensus
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
              }`}
            >
              {gatingDecision.isConsensus ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <GitMerge className="h-4 w-4" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-semibold text-white">
                  {gatingDecision.badgeText || 'Multi-Model Analysis Complete'}
                </h4>
                {gatingDecision.similarityScore !== undefined && (
                  <span className="rounded bg-black/40 px-1.5 py-0.2 text-[10px] font-mono text-amber-300 border border-white/[0.06]">
                    {(gatingDecision.similarityScore * 100).toFixed(0)}% Similarity
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">{gatingDecision.reason}</p>
            </div>
          </div>

          {/* Launch Workbench Button */}
          <button
            onClick={() => onOpenMerge(completedKeys[0], completedKeys[1])}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-md transition-all active:scale-[0.98] ${
              gatingDecision.isConsensus
                ? 'bg-[#1a1e27] hover:bg-[#232834] text-slate-200 border border-slate-700'
                : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-bold shadow-amber-500/20'
            }`}
          >
            <GitMerge className="h-3.5 w-3.5" />
            <span>{gatingDecision.isConsensus ? 'Inspect Semantic Diff' : 'Launch Merge Workbench'}</span>
          </button>
        </div>
      )}

      {/* Focus Mode Tab Bar (If Focus Mode is selected) */}
      {layoutMode === 'focus' && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {selectedModels.map((target) => {
            const modelKey = `${target.providerId}:${target.model}`;
            const isSelected = focusedModelKey === modelKey;
            const theme = getProviderTheme(target.providerId);
            const resp = responses[modelKey];

            return (
              <button
                key={modelKey}
                onClick={() => setFocusedModelKey(modelKey)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all shrink-0 ${
                  isSelected
                    ? 'bg-[#181d27] border border-amber-500/40 text-white shadow-lg shadow-black/40'
                    : 'bg-[#11141b]/80 border border-white/[0.06] text-slate-400 hover:text-slate-200 hover:bg-[#141822]'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${theme.dot}`} />
                <span className="font-semibold">{target.model}</span>
                <span className="text-[10px] uppercase font-mono text-slate-400">({target.providerId})</span>
                {resp?.tokens ? (
                  <span className="rounded bg-black/40 px-1 py-0.2 text-[9px] font-mono text-slate-300">
                    {resp.tokens}t
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      {/* Empty State / Launchpad when no prompt has run */}
      {!hasAnyResponses && !isStreaming && (
        <div className="flex-1 flex flex-col items-center justify-center rounded-3xl bg-[#11141b]/60 border border-white/[0.06] p-8 text-center backdrop-blur-md">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/5 border border-amber-500/30 text-amber-400 mb-4 shadow-xl shadow-amber-500/5">
            <Sparkles className="h-7 w-7 text-amber-400" />
          </div>

          <h3 className="text-lg font-bold text-white mb-1.5">
            Multi-Model Consensus & Difference Arena
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mb-6">
            Dispatch queries simultaneously to selected LLMs, compare divergent answers with Needleman-Wunsch diffing, and synthesize verified consensus.
          </p>

          <div className="w-full max-w-3xl">
            <div className="text-left text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 px-1">
              Quick Start Prompt Experiments:
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {starterTemplates.map((t, idx) => {
                const Icon = t.icon;
                return (
                  <div
                    key={idx}
                    onClick={() => onSelectPromptTemplate && onSelectPromptTemplate(t.prompt)}
                    className="group flex flex-col justify-between text-left p-4 rounded-2xl bg-[#151922]/80 hover:bg-[#1a202c] border border-white/[0.06] hover:border-amber-500/30 cursor-pointer transition-all shadow-md hover:shadow-xl hover:shadow-amber-500/5 hover:-translate-y-0.5"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-2 text-amber-400">
                        <Icon className="h-4 w-4" />
                        <span className="font-semibold text-white text-xs">{t.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{t.desc}</p>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[10px] text-amber-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                      <span>Launch Prompt</span>
                      <ArrowRight className="h-3 w-3" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Arena Panes View (Grid, Focus, or Stacked) */}
      {(hasAnyResponses || isStreaming) && (
        <div
          className={`flex-1 min-h-[420px] ${
            layoutMode === 'grid'
              ? selectedModels.length === 1
                ? 'grid grid-cols-1'
                : selectedModels.length === 2
                ? 'grid grid-cols-1 md:grid-cols-2 gap-3.5'
                : selectedModels.length === 3
                ? 'grid grid-cols-1 md:grid-cols-3 gap-3.5'
                : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5'
              : layoutMode === 'stacked'
              ? 'flex flex-col space-y-3.5'
              : 'flex flex-col'
          }`}
        >
          {selectedModels
            .filter((target) => {
              if (layoutMode !== 'focus') return true;
              return `${target.providerId}:${target.model}` === focusedModelKey;
            })
            .map((target) => {
              const modelKey = `${target.providerId}:${target.model}`;
              const resp = responses[modelKey];
              const isCurrentStreaming = resp?.status === 'streaming';
              const hasError = resp?.status === 'error';
              const theme = getProviderTheme(target.providerId);

              // Calculate tokens per second if latency is available
              const tokensPerSec =
                resp?.latencyMs && resp.latencyMs > 0 && resp.tokens
                  ? ((resp.tokens / resp.latencyMs) * 1000).toFixed(1)
                  : null;

              return (
                <div
                  key={modelKey}
                  className={`flex flex-col rounded-2xl bg-[#11141b] border border-white/[0.08] shadow-xl overflow-hidden backdrop-blur-sm transition-all ${theme.borderAccent}`}
                >
                  {/* Pane Header */}
                  <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5 bg-[#0e1117]">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/40 border border-white/[0.08] text-amber-400 shrink-0">
                        <Cpu className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white truncate">{target.model}</span>
                          <span
                            className={`rounded-md px-1.5 py-0.2 text-[9px] uppercase font-mono border ${theme.badgeBg}`}
                          >
                            {target.providerId}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Pane Actions & Performance Metrics */}
                    <div className="flex items-center gap-2 shrink-0">
                      {resp?.latencyMs ? (
                        <span className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                          <Clock className="h-3 w-3 text-slate-500" />
                          {(resp.latencyMs / 1000).toFixed(2)}s
                        </span>
                      ) : null}

                      {tokensPerSec && (
                        <span className="flex items-center gap-0.5 text-[10px] text-amber-400 font-mono bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                          <Flame className="h-2.5 w-2.5" />
                          {tokensPerSec} t/s
                        </span>
                      )}

                      {resp?.content && (
                        <button
                          onClick={() => handleCopy(modelKey, resp.content)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
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
                        onClick={() => {
                          if (layoutMode === 'focus') {
                            setLayoutMode('grid');
                          } else {
                            setFocusedModelKey(modelKey);
                            setLayoutMode('focus');
                          }
                        }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                        title={layoutMode === 'focus' ? 'Back to Grid view' : 'Maximize this pane'}
                      >
                        {layoutMode === 'focus' ? (
                          <Minimize2 className="h-3.5 w-3.5" />
                        ) : (
                          <Maximize2 className="h-3.5 w-3.5" />
                        )}
                      </button>

                      <button
                        onClick={() => onRetryPane(target)}
                        disabled={isStreaming}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-30 transition-colors"
                        title="Retry this pane"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Pane Content Body */}
                  <div className={`flex-1 overflow-y-auto p-4 sm:p-5 ${getTextSizeClass()} text-slate-200`}>
                    {!resp && !isStreaming && (
                      <div className="flex h-full min-h-[160px] flex-col items-center justify-center text-center p-6 text-slate-500">
                        <Sparkles className="h-6 w-6 text-slate-700 mb-2" />
                        <p className="text-xs">Waiting for prompt submission...</p>
                      </div>
                    )}

                    {isCurrentStreaming && !resp?.content && (
                      <div className="flex items-center gap-2 text-amber-400 text-xs py-4">
                        <span className="streaming-cursor" />
                        <span className="animate-pulse font-mono">Dispatched to {target.model}...</span>
                      </div>
                    )}

                    {hasError && (
                      <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-xs text-red-400 space-y-2.5">
                        <div className="flex items-center gap-2 font-semibold">
                          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                          <span>Provider Execution Error</span>
                        </div>
                        <p className="text-red-300/90 leading-relaxed">{resp.error || 'Failed to generate response'}</p>
                        <button
                          onClick={() => onRetryPane(target)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 px-3 py-1.5 text-xs text-red-200 font-medium transition-colors"
                        >
                          <RefreshCw className="h-3 w-3" /> Retry Pane
                        </button>
                      </div>
                    )}

                    {resp?.content && (
                      <div className="arena-prose whitespace-pre-wrap selection:bg-amber-500 selection:text-black">
                        {resp.content}
                        {isCurrentStreaming && <span className="streaming-cursor" />}
                      </div>
                    )}
                  </div>

                  {/* Pane Footer */}
                  {resp && (
                    <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-2 bg-[#0c0e14] text-[10px] text-slate-400 font-mono">
                      <div className="flex items-center gap-3">
                        <span>{resp.tokens || 0} tokens</span>
                        <span>{resp.content ? resp.content.split(/\s+/).filter(Boolean).length : 0} words</span>
                      </div>
                      <span className="capitalize text-slate-400 font-semibold">{resp.status}</span>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};
