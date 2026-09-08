'use client';

import React from 'react';
import {
  Layers,
  Split,
  Grid,
  Bot,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  GitMerge,
  CheckCircle2,
} from 'lucide-react';

interface FeaturesViewProps {
  onOpenArena: () => void;
  onOpenSettings: () => void;
}

export const FeaturesView: React.FC<FeaturesViewProps> = ({ onOpenArena, onOpenSettings }) => {
  const features = [
    {
      icon: <Layers className="h-5 w-5 text-brand-terracotta" />,
      title: 'Zero-Blocking Fan-Out Concurrency',
      badge: 'Concurrency',
      description:
        'Dispatch a single prompt simultaneously to Anthropic Claude 3.7, OpenAI GPT-4o, Google Gemini 2.5, and Ollama local models via independent channel pipelines.',
      highlight: 'Slow providers will never stall or block other response panes.',
    },
    {
      icon: <Split className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
      title: 'Needleman-Wunsch Semantic Alignment',
      badge: 'Sequence Math',
      description:
        'Global sequence alignment applied to NLP prose. Aligns sentences and paragraphs by semantic meaning rather than line numbers to accurately pair matching concepts.',
      highlight: 'Myers code diffs fail on prose paraphrase; sequence alignment excels.',
    },
    {
      icon: <Grid className="h-5 w-5 text-brand-terracotta" />,
      title: 'Pairwise Heatmap Matrix Analytics',
      badge: 'Visual Matrix',
      description:
        'Interactive M × N similarity matrix. Hover over cells to reveal cosine similarity percentages (0–100%) and instant comparison drawers between any two paragraph chunks.',
      highlight: 'Inspect consensus overlap and point-by-point divergence at a glance.',
    },
    {
      icon: <GitMerge className="h-5 w-5 text-brand-terracotta" />,
      title: 'Structured Hunk-by-Hunk Cherry-Picking',
      badge: 'Reconciliation',
      description:
        'Accept Left (A), Accept Right (B), or Accept Both (A + B) with 1 click per aligned hunk. Compose your synthesized draft with full structural control before continuing the turn.',
      highlight: 'Full provenance tracking for every accepted assertion.',
    },
    {
      icon: <Bot className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
      title: 'AI-Assisted Reconciliation Synthesis',
      badge: 'LLM Synthesis',
      description:
        'Send both responses to an LLM with structured consensus instructions to de-duplicate prose, resolve contradictions, and generate a cohesive final answer.',
      highlight: 'Clearly badged as an AI-generated draft to uphold trust boundaries.',
    },
    {
      icon: <ShieldCheck className="h-5 w-5 text-brand-terracotta" />,
      title: 'BYOA (Bring Your Own Account) Vault',
      badge: 'AES-256-GCM',
      description:
        'Your API keys are encrypted at rest with local symmetric AES-256-GCM. Requests connect directly to official upstream endpoints with zero third-party proxy markup or logging.',
      highlight: 'Zero token markup, zero server query retention, pure sovereignty.',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 lg:px-12 bg-background text-foreground transition-colors">
      <div className="mx-auto max-w-5xl space-y-12">
        {/* Header Hero */}
        <div className="text-center space-y-3.5 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-surface-secondary border border-border px-3 py-1 text-xs font-medium text-text-secondary">
            <Sparkles className="h-3.5 w-3.5 text-brand-terracotta" />
            <span>Architecture & Capabilities</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
            Engineered for Multi-Model Consensus & Convergence
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            Eliminate single-model blindspots. ConcordRouter combines parallel streaming fan-out with sequence alignment algorithms to reveal exactly where leading LLMs agree, disagree, or hallucinate.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            <button
              onClick={onOpenArena}
              className="flex items-center gap-1.5 rounded-full bg-foreground text-background hover:opacity-90 px-4 py-2 text-xs font-medium shadow-sm transition-all active:scale-95"
            >
              <span>Launch Arena</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 rounded-full bg-surface-secondary hover:bg-surface-hover border border-border px-4 py-2 text-xs font-medium text-foreground transition-all shadow-sm"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-text-secondary" />
              <span>Configure Provider Keys</span>
            </button>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feat, idx) => (
            <div
              key={idx}
              className="rounded-2xl p-5 flex flex-col justify-between space-y-3.5 bg-surface border border-border hover:border-border-strong transition-all shadow-card"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-secondary border border-border">
                    {feat.icon}
                  </div>
                  <span className="rounded-full px-2 py-0.2 text-[9px] font-mono border border-border bg-surface-secondary text-text-secondary">
                    {feat.badge}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-foreground tracking-tight">{feat.title}</h3>
                <p className="text-xs text-text-secondary leading-relaxed">{feat.description}</p>
              </div>

              <div className="pt-3 border-t border-border/50 text-[11px] font-medium text-text-secondary flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>{feat.highlight}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Call to action Banner */}
        <div className="rounded-2xl bg-surface-secondary border border-border p-8 sm:p-10 shadow-sm relative overflow-hidden text-center space-y-3">
          <div className="max-w-xl mx-auto space-y-2">
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
              Ready to compare multi-model consensus?
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
              Select 2+ models, write your prompt, and watch streaming responses fan out side by side.
            </p>
            <div className="pt-2">
              <button
                onClick={onOpenArena}
                className="inline-flex items-center gap-2 rounded-full bg-foreground text-background hover:opacity-90 px-5 py-2.5 text-xs font-medium shadow-sm transition-all active:scale-95"
              >
                <span>Enter Prompt Arena</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
