'use client';

import React from 'react';
import {
  Send,
  Cpu,
  Layers,
  Split,
  GitMerge,
  Sparkles,
  ArrowRight,
  Shield,
  Activity,
  CheckCircle,
} from 'lucide-react';

interface HowItWorksViewProps {
  onOpenArena: () => void;
}

export const HowItWorksView: React.FC<HowItWorksViewProps> = ({ onOpenArena }) => {
  const steps = [
    {
      step: '01',
      title: 'Compose Once, Target Multiple LLMs',
      tag: 'Concurrent Fan-Out',
      icon: <Send className="h-5 w-5 text-indigo-400" />,
      color: 'from-indigo-600/20 to-indigo-900/10 border-indigo-500/30',
      description:
        'Write your prompt in the universal composer and select 2 to 4 target models (such as Claude 3.7 Sonnet, GPT-4o, and Gemini 2.5 Flash). ConcordRouter launches independent goroutines per provider with dedicated cancellation contexts.',
    },
    {
      step: '02',
      title: 'Independent Real-Time Streaming',
      tag: 'Zero-Blocking SSE',
      icon: <Activity className="h-5 w-5 text-cyan-400" />,
      color: 'from-cyan-600/20 to-cyan-900/10 border-cyan-500/30',
      description:
        'Each model renders into its own dedicated response pane via Server-Sent Events. Real-time telemetry surfaces streaming token counts, latency clocks, and per-pane retry controls if a network blip occurs.',
    },
    {
      step: '03',
      title: 'Gating & Needleman-Wunsch Alignment',
      tag: 'Sequence Alignment',
      icon: <Split className="h-5 w-5 text-emerald-400" />,
      color: 'from-emerald-600/20 to-emerald-900/10 border-emerald-500/30',
      description:
        'Gating heuristics evaluate whether the responses agree (near-duplicate >90% consensus) or diverge. Divergent answers are parsed with Needleman-Wunsch sequence alignment to match up corresponding concepts across models.',
    },
    {
      step: '04',
      title: 'Reconcile, Cherry-Pick & Continue',
      tag: 'Synthesis & Memory',
      icon: <GitMerge className="h-5 w-5 text-violet-400" />,
      color: 'from-violet-600/20 to-violet-900/10 border-violet-500/30',
      description:
        'Use the Merge Workbench to cherry-pick the best chunks from Model A and Model B, or request an AI synthesis pass. Save the merged draft to persist it as the authoritative context for the next turn.',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-12">
      <div className="mx-auto max-w-5xl space-y-12">
        {/* Header Hero */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-3.5 py-1 text-xs font-semibold text-cyan-400 border border-cyan-500/20">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Workflow & Pipeline</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            How ConcordRouter Works
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            From single prompt dispatch to unified synthesis in 4 seamless, transparent steps.
          </p>
        </div>

        {/* Stepped Timeline */}
        <div className="space-y-6">
          {steps.map((s, idx) => (
            <div
              key={idx}
              className={`glass-card rounded-2xl p-6 sm:p-8 border bg-gradient-to-r ${s.color} relative flex flex-col md:flex-row gap-6 items-start justify-between`}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900/90 border border-white/[0.08] shadow-md font-mono font-extrabold text-white text-base">
                  {s.step}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white/[0.06] border border-white/[0.08] px-2.5 py-0.5 text-[10px] font-mono text-slate-300">
                      {s.tag}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white">{s.title}</h3>
                  <p className="text-xs sm:text-sm leading-relaxed text-slate-300 max-w-3xl">
                    {s.description}
                  </p>
                </div>
              </div>

              <div className="hidden md:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950/60 border border-white/[0.08]">
                {s.icon}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center pt-4">
          <button
            onClick={onOpenArena}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 px-6 py-3 text-xs font-bold text-white shadow-xl shadow-indigo-500/25 transition-all hover:scale-105"
          >
            <span>Start an Arena Turn</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
