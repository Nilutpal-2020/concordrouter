'use client';

import React from 'react';
import {
  Layers,
  Split,
  Grid,
  Bot,
  ShieldCheck,
  Zap,
  Cpu,
  Sparkles,
  Download,
  ArrowRight,
  GitMerge,
  Eye,
  CheckCircle2,
} from 'lucide-react';

interface FeaturesViewProps {
  onOpenArena: () => void;
  onOpenSettings: () => void;
}

export const FeaturesView: React.FC<FeaturesViewProps> = ({ onOpenArena, onOpenSettings }) => {
  const features = [
    {
      icon: <Layers className="h-6 w-6 text-amber-400" />,
      title: 'Zero-Blocking Fan-Out Concurrency',
      badge: 'High Throughput',
      badgeColor: 'border-amber-500/30 text-amber-300 bg-amber-500/10',
      description:
        'Dispatch a single prompt simultaneously to Anthropic Claude 3.7, OpenAI GPT-4o, Google Gemini 2.5, Ollama local models, and OpenRouter via independent Goroutine channel pipelines.',
      highlight: 'A slow provider will never stall or block other panes.',
    },
    {
      icon: <Split className="h-6 w-6 text-emerald-400" />,
      title: 'Needleman-Wunsch Semantic Alignment',
      badge: 'Algorithm Intelligence',
      badgeColor: 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10',
      description:
        'Global sequence alignment applied to NLP prose. Aligns sentences and paragraphs by cosine meaning rather than code-diff line numbers to accurately pair matching concepts.',
      highlight: 'Myers code diffs fail on prose paraphrase; sequence alignment excels.',
    },
    {
      icon: <Grid className="h-6 w-6 text-amber-400" />,
      title: 'Pairwise Heatmap Matrix Analytics',
      badge: 'Interactive Visualizer',
      badgeColor: 'border-amber-500/30 text-amber-300 bg-amber-500/10',
      description:
        'Interactive M × N similarity matrix. Hover over cells to reveal cosine similarity percentages (0–100%) and instant comparison drawers between any two paragraph chunks.',
      highlight: 'Inspect consensus overlap and point-by-point divergence at a glance.',
    },
    {
      icon: <GitMerge className="h-6 w-6 text-orange-400" />,
      title: 'Structured Hunk-by-Hunk Cherry-Picking',
      badge: 'Deterministic Merge',
      badgeColor: 'border-orange-500/30 text-orange-300 bg-orange-500/10',
      description:
        'Accept Left (A), Accept Right (B), or Accept Both (A + B) with 1 click per aligned hunk. Compose your synthesized draft with full structural control before continuing the turn.',
      highlight: 'Full provenance tracking for every accepted assertion.',
    },
    {
      icon: <Bot className="h-6 w-6 text-amber-400" />,
      title: 'AI-Assisted Reconciliation Synthesis',
      badge: 'LLM Synthesis (Phase 6)',
      badgeColor: 'border-amber-500/30 text-amber-300 bg-amber-500/10',
      description:
        'Send both responses to an LLM with structured consensus instructions to de-duplicate prose, resolve edge contradictions, and generate a cohesive final answer.',
      highlight: 'Clearly badged as an AI-generated draft to uphold trust boundaries.',
    },
    {
      icon: <ShieldCheck className="h-6 w-6 text-emerald-400" />,
      title: 'BYOA (Bring Your Own Account) Vault',
      badge: 'AES-256-GCM',
      badgeColor: 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10',
      description:
        'Your API keys are encrypted at rest with local symmetric AES-256-GCM. Requests connect directly to official upstream endpoints with zero third-party proxy markup or logging.',
      highlight: 'Zero token markup, zero server query retention, pure sovereignty.',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 lg:px-12 bg-[#090b0e]">
      <div className="mx-auto max-w-6xl space-y-12">
        {/* Header Hero */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#131720] border border-amber-500/20 px-3.5 py-1 text-xs font-mono text-amber-400">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Architecture & Capabilities</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Engineered for Multi-Model <span className="text-gradient-gold">Truth & Convergence</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Eliminate single-model blindspots. ConcordRouter combines parallel streaming fan-out with sequence alignment algorithms to reveal exactly where leading LLMs agree, disagree, or hallucinate.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={onOpenArena}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 px-5 py-2.5 text-xs font-bold text-black shadow-md shadow-amber-500/20 transition-all active:scale-[0.98]"
            >
              <span>Launch Arena</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-2 rounded-xl bg-[#131722] hover:bg-[#1a202e] border border-white/[0.08] hover:border-amber-500/30 px-5 py-2.5 text-xs font-semibold text-slate-200 transition-all"
            >
              <ShieldCheck className="h-4 w-4 text-amber-400" />
              <span>Configure Provider Keys</span>
            </button>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feat, idx) => (
            <div
              key={idx}
              className="glass-card rounded-2xl p-6 flex flex-col justify-between space-y-4 bg-[#11141b] border border-white/[0.08] hover:border-amber-500/30 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-black/40 border border-white/[0.08]">
                    {feat.icon}
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-mono font-semibold border ${feat.badgeColor}`}>
                    {feat.badge}
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/[0.06] text-[11px] font-medium text-slate-300 flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                <span>{feat.highlight}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Call to action Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-indigo-950/60 via-violet-950/50 to-slate-950 border border-indigo-500/30 p-8 sm:p-10 shadow-2xl relative overflow-hidden text-center space-y-4">
          <div className="relative z-10 max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Ready to test multi-model consensus?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Pick 2+ models, write your prompt, and watch streaming responses fan out side by side.
            </p>
            <button
              onClick={onOpenArena}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold px-6 py-3 text-xs shadow-xl shadow-white/10 transition-all hover:scale-105"
            >
              <span>Enter Prompt Arena</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
