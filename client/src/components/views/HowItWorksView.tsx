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
      icon: <Send className="h-5 w-5 text-amber-400" />,
      color: 'from-amber-600/20 to-amber-900/10 border-amber-500/30',
      description:
        'Write your prompt in the universal composer and select 2 to 4 target models (such as Claude 3.7 Sonnet, GPT-4o, and Gemini 2.5 Flash). ConcordRouter launches independent goroutines per provider with dedicated cancellation contexts.',
    },
    {
      step: '02',
      title: 'Independent Real-Time Streaming',
      tag: 'Zero-Blocking SSE',
      icon: <Activity className="h-5 w-5 text-emerald-400" />,
      color: 'from-emerald-600/20 to-emerald-900/10 border-emerald-500/30',
      description:
        'Each model renders into its own dedicated response pane via Server-Sent Events. Real-time telemetry surfaces streaming token counts, latency clocks, and per-pane retry controls if a network blip occurs.',
    },
    {
      step: '03',
      title: 'Gating & Needleman-Wunsch Alignment',
      tag: 'Sequence Alignment',
      icon: <Split className="h-5 w-5 text-amber-400" />,
      color: 'from-amber-600/20 to-amber-900/10 border-amber-500/30',
      description:
        'Gating heuristics evaluate whether the responses agree (near-duplicate >90% consensus) or diverge. Divergent answers are parsed with Needleman-Wunsch sequence alignment to match up corresponding concepts across models.',
    },
    {
      step: '04',
      title: 'Reconcile, Cherry-Pick & Continue',
      tag: 'Synthesis & Memory',
      icon: <GitMerge className="h-5 w-5 text-orange-400" />,
      color: 'from-orange-600/20 to-orange-900/10 border-orange-500/30',
      description:
        'Use the Merge Workbench to cherry-pick the best chunks from Model A and Model B, or request an AI synthesis pass. Save the merged draft to persist it as the authoritative context for the next turn.',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 lg:px-12 bg-[#090b0e]">
      <div className="mx-auto max-w-5xl space-y-12">
        {/* Title */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#141822] border border-amber-500/20 px-3.5 py-1 text-xs font-mono text-amber-400">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Under The Hood</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            How ConcordRouter Works
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            From parallel fan-out dispatch to mathematical sequence alignment and cherry-pick synthesis, explore the four stages of consensus routing.
          </p>
        </div>

        {/* Steps Flow */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {steps.map((st, idx) => (
            <div
              key={idx}
              className="glass-card rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between space-y-4 bg-[#11141b] border border-white/[0.08] hover:border-amber-500/30 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/40 border border-white/[0.08]">
                      {st.icon}
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      Phase {st.step}
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">
                    {st.tag}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white tracking-tight">{st.title}</h3>
                <p className="text-xs sm:text-[13px] text-slate-400 leading-relaxed">{st.description}</p>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-amber-400 font-mono pt-2 border-t border-white/[0.06]">
                <CheckCircle className="h-3.5 w-3.5" />
                <span>Deterministic Execution Pipeline</span>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="rounded-3xl bg-[#11141b]/90 border border-white/[0.08] p-8 text-center space-y-4">
          <h3 className="text-xl font-bold text-white">Ready to test multi-model consensus?</h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Try a prompt with 2 or more models in the Arena and see sequence alignment diffing in action.
          </p>
          <button
            onClick={onOpenArena}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 px-5 py-2.5 text-xs font-bold text-black shadow-md shadow-amber-500/20 transition-all active:scale-[0.98]"
          >
            <span>Enter the Arena</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
