'use client';

import React from 'react';
import {
  Send,
  Split,
  GitMerge,
  Sparkles,
  ArrowRight,
  Activity,
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
      icon: <Send className="h-4 w-4 text-brand-terracotta" />,
      description:
        'Write your prompt in the universal composer and select 2 to 4 target models (such as Claude 3.7 Sonnet, GPT-4o, and Gemini 2.5 Flash). ConcordRouter launches independent goroutines per provider with dedicated cancellation contexts.',
    },
    {
      step: '02',
      title: 'Independent Real-Time Streaming',
      tag: 'Zero-Blocking SSE',
      icon: <Activity className="h-4 w-4 text-emerald-500" />,
      description:
        'Each model renders into its own dedicated response pane via Server-Sent Events. Real-time telemetry surfaces streaming token counts, latency clocks, and per-pane retry controls if a network blip occurs.',
    },
    {
      step: '03',
      title: 'Gating & Needleman-Wunsch Alignment',
      tag: 'Sequence Alignment',
      icon: <Split className="h-4 w-4 text-brand-terracotta" />,
      description:
        'Gating heuristics evaluate whether the responses agree (near-duplicate >90% consensus) or diverge. Divergent answers are parsed with Needleman-Wunsch sequence alignment to match up corresponding concepts across models.',
    },
    {
      step: '04',
      title: 'Reconcile, Cherry-Pick & Continue',
      tag: 'Synthesis & Memory',
      icon: <GitMerge className="h-4 w-4 text-emerald-500" />,
      description:
        'Use the Merge Workbench to cherry-pick the best chunks from Model A and Model B, or request an AI synthesis pass. Save the merged draft to persist it as the authoritative context for the next turn.',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 lg:px-12 bg-background text-foreground transition-colors">
      <div className="mx-auto max-w-4xl space-y-10">
        {/* Title */}
        <div className="text-center space-y-3 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-surface-secondary border border-border px-3 py-1 text-xs font-medium text-text-secondary">
            <Sparkles className="h-3.5 w-3.5 text-brand-terracotta" />
            <span>Workflow & Pipeline</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
            How ConcordRouter Works
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            From parallel fan-out dispatch to sequence alignment and cherry-pick synthesis, explore the four stages of consensus routing.
          </p>
        </div>

        {/* Steps Flow */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {steps.map((st, idx) => (
            <div
              key={idx}
              className="rounded-2xl p-5 flex flex-col justify-between space-y-3.5 bg-surface border border-border hover:border-border-strong transition-all shadow-card"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-secondary border border-border">
                      {st.icon}
                    </div>
                    <span className="text-xs font-mono font-medium text-foreground bg-surface-secondary px-2 py-0.5 rounded-md border border-border">
                      Phase {st.step}
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-mono text-text-muted tracking-wider">
                    {st.tag}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-foreground tracking-tight">{st.title}</h3>
                <p className="text-xs text-text-secondary leading-relaxed">{st.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <div className="text-center pt-2">
          <button
            onClick={onOpenArena}
            className="inline-flex items-center gap-2 rounded-full bg-foreground text-background hover:opacity-90 px-5 py-2.5 text-xs font-medium shadow-sm transition-all active:scale-95"
          >
            <span>Open Arena Workspace</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
