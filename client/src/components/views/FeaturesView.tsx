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
      icon: <Layers className="h-6 w-6 text-indigo-400" />,
      title: 'Zero-Blocking Fan-Out Concurrency',
      badge: 'High Throughput',
      badgeColor: 'border-indigo-500/30 text-indigo-300 bg-indigo-500/10',
      description:
        'Dispatch a single prompt simultaneously to Anthropic Claude 3.7, OpenAI GPT-4o, Google Gemini 2.5, Ollama local models, and OpenRouter via independent Goroutine channel pipelines.',
      highlight: 'A slow provider will never stall or block other panes.',
    },
    {
      icon: <Split className="h-6 w-6 text-cyan-400" />,
      title: 'Needleman-Wunsch Semantic Alignment',
      badge: 'Algorithm Intelligence',
      badgeColor: 'border-cyan-500/30 text-cyan-300 bg-cyan-500/10',
      description:
        'Global sequence alignment applied to NLP prose. Aligns sentences and paragraphs by cosine meaning rather than code-diff line numbers to accurately pair matching concepts.',
      highlight: 'Myers code diffs fail on prose paraphrase; sequence alignment excels.',
    },
    {
      icon: <Grid className="h-6 w-6 text-emerald-400" />,
      title: 'Pairwise Heatmap Matrix Analytics',
      badge: 'Interactive Visualizer',
      badgeColor: 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10',
      description:
        'Interactive M × N similarity matrix. Hover over cells to reveal cosine similarity percentages (0–100%) and instant comparison drawers between any two paragraph chunks.',
      highlight: 'Inspect consensus overlap and point-by-point divergence at a glance.',
    },
    {
      icon: <GitMerge className="h-6 w-6 text-violet-400" />,
      title: 'Structured Hunk-by-Hunk Cherry-Picking',
      badge: 'Deterministic Merge',
      badgeColor: 'border-violet-500/30 text-violet-300 bg-violet-500/10',
      description:
        'Accept Left (A), Accept Right (B), or Accept Both (A + B) with 1 click per aligned hunk. Compose your synthesized draft with full structural control before continuing the turn.',
      highlight: 'Full provenance tracking for every accepted assertion.',
    },
    {
      icon: <Bot className="h-6 w-6 text-purple-400" />,
      title: 'AI-Assisted Reconciliation Synthesis',
      badge: 'LLM Synthesis (Phase 6)',
      badgeColor: 'border-purple-500/30 text-purple-300 bg-purple-500/10',
      description:
        'Send both responses to an LLM with structured consensus instructions to de-duplicate prose, resolve edge contradictions, and generate a cohesive final answer.',
      highlight: 'Clearly badged as an AI-generated draft to uphold trust boundaries.',
    },
    {
      icon: <ShieldCheck className="h-6 w-6 text-amber-400" />,
      title: 'BYOA (Bring Your Own Account) Vault',
      badge: 'AES-256-GCM',
      badgeColor: 'border-amber-500/30 text-amber-300 bg-amber-500/10',
      description:
        'Use your own API keys or local Ollama instances. Keys are encrypted at rest with AES-256-GCM and never returned to the frontend in plaintext. Zero token markups or limits.',
      highlight: 'Your credentials, your quotas, direct provider billing.',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-12">
      <div className="mx-auto max-w-6xl space-y-12">
        {/* Header Hero */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Architecture & Feature Capabilities</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Engineered for Multi-Model <br />
            <span className="text-gradient-vibrant">Truth & Reconciliation</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Single-model chat locks you into hallucination blindspots. ConcordRouter turns disparate LLM providers into a collaborative arena with mathematical alignment and intuitive merge tooling.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={onOpenArena}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all"
            >
              <span>Launch Arena Now</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/[0.08] px-5 py-2.5 text-xs font-semibold text-slate-200 transition-all"
            >
              <span>Connect Provider Keys</span>
            </button>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feat, idx) => (
            <div
              key={idx}
              className="glass-card flex flex-col justify-between rounded-2xl p-6 relative overflow-hidden group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 border border-white/[0.08] shadow-sm">
                    {feat.icon}
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-mono font-semibold border ${feat.badgeColor}`}>
                    {feat.badge}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-indigo-200 transition-colors">
                    {feat.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    {feat.description}
                  </p>
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
