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
  ArrowRight,
  Code2,
  Scale,
  FileCode2,
  Zap,
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

  // Provider-specific accent styling (Claude terracotta, ChatGPT emerald, Gemini blue)
  const getProviderTheme = (providerId: string) => {
    switch (providerId.toLowerCase()) {
      case 'anthropic':
        return {
          dotBg: 'bg-[#cc785c]',
          badgeBg: 'bg-[#cc785c]/10 text-[#cc785c] border-[#cc785c]/30',
          avatarText: 'text-[#cc785c]',
          borderAccent: 'focus-within:border-[#cc785c]/50',
        };
      case 'openai':
        return {
          dotBg: 'bg-[#10a37f]',
          badgeBg: 'bg-[#10a37f]/10 text-[#10a37f] border-[#10a37f]/30',
          avatarText: 'text-[#10a37f]',
          borderAccent: 'focus-within:border-[#10a37f]/50',
        };
      case 'gemini':
        return {
          dotBg: 'bg-[#3b82f6]',
          badgeBg: 'bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/30',
          avatarText: 'text-[#3b82f6]',
          borderAccent: 'focus-within:border-[#3b82f6]/50',
        };
      case 'ollama':
        return {
          dotBg: 'bg-[#f59e0b]',
          badgeBg: 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/30',
          avatarText: 'text-[#f59e0b]',
          borderAccent: 'focus-within:border-[#f59e0b]/50',
        };
      case 'openrouter':
        return {
          dotBg: 'bg-[#06b6d4]',
          badgeBg: 'bg-[#06b6d4]/10 text-[#06b6d4] border-[#06b6d4]/30',
          avatarText: 'text-[#06b6d4]',
          borderAccent: 'focus-within:border-[#06b6d4]/50',
        };
      default:
        return {
          dotBg: 'bg-text-secondary',
          badgeBg: 'bg-surface-secondary text-text-secondary border-border',
          avatarText: 'text-text-secondary',
          borderAccent: 'focus-within:border-border-strong',
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

  const hasAnyResponses =
    Object.keys(responses).length > 0 &&
    Object.values(responses).some((r) => r.content || r.status === 'streaming');

  const starterTemplates = [
    {
      title: 'Distributed Cache Architecture',
      desc: 'Compare Redis vs Memcached vs Local cache strategies with failover guarantees.',
      icon: Code2,
      prompt:
        'Compare distributed cache architecture tradeoffs between Redis Cluster, Memcached, and in-memory caches. Provide a structured comparison covering consistency, throughput, and failover mechanics.',
    },
    {
      title: 'Security Vulnerability Audit',
      desc: 'Audit a JWT authentication handler for token substitution & replay risks.',
      icon: Scale,
      prompt:
        'Audit standard JWT authentication in microservices for common security flaws like token substitution, weak algorithms (none), replay attacks, and key rotation strategies. Suggest hardening practices.',
    },
    {
      title: 'React Concurrent vs SolidJS Reactivity',
      desc: 'Deep technical comparison of VDOM fiber reconciliation vs fine-grained signals.',
      icon: FileCode2,
      prompt:
        'Compare React 19 concurrent fiber reconciliation with SolidJS fine-grained signal reactivity. Contrast memory overhead, compiler reliance, and re-rendering performance in detail.',
    },
  ];

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Top Arena Control & Mode Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-surface border border-border px-4 py-2 transition-colors">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-medium text-foreground">
            <span className="font-semibold">Arena</span>
            <span className="rounded-full bg-surface-secondary text-text-secondary border border-border px-2 py-0.5 text-[10px] font-mono">
              {selectedModels.length} {selectedModels.length === 1 ? 'Model' : 'Models'}
            </span>
          </div>

          {isStreaming && (
            <span className="flex items-center gap-1.5 text-[11px] font-mono text-foreground animate-pulse bg-surface-secondary border border-border px-2.5 py-0.5 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-[#10a37f] animate-ping" />
              Streaming answers...
            </span>
          )}
        </div>

        {/* View Controls: Layout Switcher & Text Size */}
        <div className="flex items-center gap-2">
          {/* Layout Selector */}
          <div className="flex items-center rounded-lg bg-surface-secondary p-0.5 text-xs border border-border">
            <button
              onClick={() => setLayoutMode('grid')}
              className={`flex items-center gap-1 rounded-md px-2 py-1 transition-all ${
                layoutMode === 'grid'
                  ? 'bg-surface text-foreground font-medium shadow-sm'
                  : 'text-text-muted hover:text-foreground'
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
              className={`flex items-center gap-1 rounded-md px-2 py-1 transition-all ${
                layoutMode === 'focus'
                  ? 'bg-surface text-foreground font-medium shadow-sm'
                  : 'text-text-muted hover:text-foreground'
              }`}
              title="Focus Single Model Layout"
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Focus</span>
            </button>

            <button
              onClick={() => setLayoutMode('stacked')}
              className={`flex items-center gap-1 rounded-md px-2 py-1 transition-all ${
                layoutMode === 'stacked'
                  ? 'bg-surface text-foreground font-medium shadow-sm'
                  : 'text-text-muted hover:text-foreground'
              }`}
              title="Stacked Comparison Layout"
            >
              <LayoutList className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Stacked</span>
            </button>
          </div>

          {/* Typography Scale Toggle */}
          <div className="flex items-center rounded-lg bg-surface-secondary p-0.5 text-xs border border-border">
            <button
              onClick={() => setTextSize('compact')}
              className={`rounded-md px-2 py-1 text-[11px] font-mono transition-all ${
                textSize === 'compact' ? 'bg-surface text-foreground font-bold shadow-sm' : 'text-text-muted hover:text-foreground'
              }`}
              title="Compact Font Size (12px)"
            >
              S
            </button>
            <button
              onClick={() => setTextSize('comfortable')}
              className={`rounded-md px-2 py-1 text-[11px] font-mono transition-all ${
                textSize === 'comfortable' ? 'bg-surface text-foreground font-bold shadow-sm' : 'text-text-muted hover:text-foreground'
              }`}
              title="Comfortable Font Size (14px)"
            >
              M
            </button>
            <button
              onClick={() => setTextSize('spacious')}
              className={`rounded-md px-2 py-1 text-[11px] font-mono transition-all ${
                textSize === 'spacious' ? 'bg-surface text-foreground font-bold shadow-sm' : 'text-text-muted hover:text-foreground'
              }`}
              title="Spacious Font Size (16px)"
            >
              L
            </button>
          </div>
        </div>
      </div>

      {/* Consensus / Gating Decision Banner */}
      {completedKeys.length >= 2 && !isStreaming && gatingDecision && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface border border-border p-3.5 shadow-sm transition-all">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-secondary border border-border shrink-0">
              {gatingDecision.isConsensus ? (
                <CheckCircle2 className="h-4 w-4 text-[#10a37f]" />
              ) : (
                <GitMerge className="h-4 w-4 text-[#cc785c]" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-semibold text-foreground">
                  {gatingDecision.badgeText || 'Multi-Model Analysis Complete'}
                </h4>
                {gatingDecision.similarityScore !== undefined && (
                  <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-[10px] font-mono text-text-secondary border border-border">
                    {(gatingDecision.similarityScore * 100).toFixed(0)}% Match
                  </span>
                )}
              </div>
              <p className="text-[11px] text-text-secondary mt-0.5">{gatingDecision.reason}</p>
            </div>
          </div>

          {/* Launch Workbench Button */}
          <button
            onClick={() => onOpenMerge(completedKeys[0], completedKeys[1])}
            className="flex items-center gap-2 rounded-full bg-foreground text-background px-4 py-2 text-xs font-medium hover:opacity-90 transition-all active:scale-[0.98] shadow-sm"
          >
            <GitMerge className="h-3.5 w-3.5" />
            <span>{gatingDecision.isConsensus ? 'Inspect Diff' : 'Launch Merge Workbench'}</span>
          </button>
        </div>
      )}

      {/* Focus Mode Tab Bar */}
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
                className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium transition-all shrink-0 ${
                  isSelected
                    ? 'bg-surface border border-border-strong text-foreground shadow-sm'
                    : 'bg-surface-secondary/60 border border-border text-text-secondary hover:text-foreground'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${theme.dotBg}`} />
                <span>{target.model}</span>
                <span className="text-[10px] text-text-muted">({target.providerId})</span>
                {resp?.tokens ? (
                  <span className="rounded bg-surface-secondary px-1 py-0.2 text-[9px] font-mono text-text-secondary">
                    {resp.tokens}t
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      {/* Empty State / Prompt Launchpad */}
      {!hasAnyResponses && !isStreaming && (
        <div className="flex-1 flex flex-col items-center justify-center rounded-2xl bg-surface border border-border p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-secondary border border-border mb-3 text-text-primary">
            <Sparkles className="h-5 w-5" />
          </div>

          <h3 className="text-base font-semibold text-foreground mb-1">
            Prompt Consensus & Differentiation Arena
          </h3>
          <p className="text-xs sm:text-sm text-text-secondary max-w-lg mb-6 leading-relaxed">
            Fan out queries simultaneously across OpenAI, Anthropic, Gemini, or Ollama, compare outputs, and synthesize verified consensus.
          </p>

          <div className="w-full max-w-2xl">
            <div className="text-left text-xs font-medium text-text-muted mb-2.5 px-1">
              Example prompts to compare:
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {starterTemplates.map((t, idx) => {
                const Icon = t.icon;
                return (
                  <div
                    key={idx}
                    onClick={() => onSelectPromptTemplate && onSelectPromptTemplate(t.prompt)}
                    className="group flex flex-col justify-between text-left p-3.5 rounded-xl bg-surface-secondary/50 hover:bg-surface-secondary border border-border hover:border-border-strong cursor-pointer transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5 text-foreground">
                        <Icon className="h-3.5 w-3.5 text-text-secondary group-hover:text-foreground" />
                        <span className="font-medium text-xs truncate">{t.title}</span>
                      </div>
                      <p className="text-[11px] text-text-secondary line-clamp-2 leading-relaxed">
                        {t.desc}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[10px] text-text-secondary group-hover:text-foreground font-medium">
                      <span>Try Prompt</span>
                      <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
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
                ? 'grid grid-cols-1 md:grid-cols-2 gap-3'
                : selectedModels.length === 3
                ? 'grid grid-cols-1 md:grid-cols-3 gap-3'
                : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3'
              : layoutMode === 'stacked'
              ? 'flex flex-col space-y-3'
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

              const tokensPerSec =
                resp?.latencyMs && resp.latencyMs > 0 && resp.tokens
                  ? ((resp.tokens / resp.latencyMs) * 1000).toFixed(1)
                  : null;

              return (
                <div
                  key={modelKey}
                  className={`flex flex-col rounded-2xl bg-surface border border-border shadow-card overflow-hidden transition-all ${theme.borderAccent}`}
                >
                  {/* Pane Header */}
                  <div className="flex items-center justify-between border-b border-border px-3.5 py-2 bg-surface-secondary/40">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`h-2.5 w-2.5 rounded-full ${theme.dotBg} shrink-0`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-foreground truncate">
                            {target.model}
                          </span>
                          <span
                            className={`rounded-full px-1.5 py-0.2 text-[9px] uppercase font-mono border ${theme.badgeBg}`}
                          >
                            {target.providerId}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Pane Actions & Metrics */}
                    <div className="flex items-center gap-1 shrink-0">
                      {resp?.latencyMs ? (
                        <span className="flex items-center gap-1 text-[10px] text-text-muted font-mono mr-1">
                          <Clock className="h-3 w-3" />
                          {(resp.latencyMs / 1000).toFixed(2)}s
                        </span>
                      ) : null}

                      {tokensPerSec && (
                        <span className="text-[10px] text-text-secondary font-mono mr-1">
                          {tokensPerSec} t/s
                        </span>
                      )}

                      {resp?.content && (
                        <button
                          onClick={() => handleCopy(modelKey, resp.content)}
                          className="rounded-lg p-1 text-text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
                          title="Copy response"
                        >
                          {copiedKey === modelKey ? (
                            <Check className="h-3.5 w-3.5 text-[#10a37f]" />
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
                        className="rounded-lg p-1 text-text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
                        title={layoutMode === 'focus' ? 'Back to Grid view' : 'Focus this pane'}
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
                        className="rounded-lg p-1 text-text-muted hover:bg-surface-hover hover:text-foreground disabled:opacity-30 transition-colors"
                        title="Retry this pane"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Pane Content Body */}
                  <div className={`flex-1 overflow-y-auto p-4 sm:p-5 ${getTextSizeClass()} text-foreground`}>
                    {!resp && !isStreaming && (
                      <div className="flex h-full min-h-[140px] flex-col items-center justify-center text-center p-4 text-text-muted">
                        <Sparkles className="h-5 w-5 mb-1.5 opacity-50" />
                        <p className="text-xs">Ready for prompt...</p>
                      </div>
                    )}

                    {isCurrentStreaming && !resp?.content && (
                      <div className="flex items-center gap-2 text-text-secondary text-xs py-3">
                        <span className="streaming-cursor" />
                        <span className="animate-pulse">Waiting for {target.model}...</span>
                      </div>
                    )}

                    {hasError && (
                      <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-600 dark:text-red-400 space-y-2">
                        <div className="flex items-center gap-1.5 font-medium">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span>Generation Error</span>
                        </div>
                        <p className="leading-relaxed opacity-90">{resp.error || 'Failed to generate response'}</p>
                        <button
                          onClick={() => onRetryPane(target)}
                          className="inline-flex items-center gap-1 rounded-lg bg-red-500/20 px-2.5 py-1 text-[11px] font-medium transition-colors"
                        >
                          <RefreshCw className="h-3 w-3" /> Retry
                        </button>
                      </div>
                    )}

                    {resp?.content && (
                      <div className="arena-prose whitespace-pre-wrap">
                        {resp.content}
                        {isCurrentStreaming && <span className="streaming-cursor" />}
                      </div>
                    )}
                  </div>

                  {/* Pane Footer */}
                  {resp && (
                    <div className="flex items-center justify-between border-t border-border px-3.5 py-1.5 bg-surface-secondary/30 text-[10px] text-text-muted font-mono">
                      <div className="flex items-center gap-3">
                        <span>{resp.tokens || 0} tokens</span>
                        <span>{resp.content ? resp.content.split(/\s+/).filter(Boolean).length : 0} words</span>
                      </div>
                      <span className="capitalize">{resp.status}</span>
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
