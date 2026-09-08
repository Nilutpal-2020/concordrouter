'use client';

import React from 'react';
import { BookOpen, GitBranch, Shield, Zap, Sparkles, Heart, Terminal, Code } from 'lucide-react';

export const AboutView: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 lg:px-12 bg-[#090b0e]">
      <div className="mx-auto max-w-4xl space-y-12">
        {/* Header Hero */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#141822] px-3.5 py-1 text-xs font-mono text-amber-400 border border-amber-500/20">
            <BookOpen className="h-3.5 w-3.5" />
            <span>Mission & Philosophy</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            About ConcordRouter
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-xl mx-auto">
            The platform built on the belief that the future of intelligence is multi-model, transparent, and user-owned.
          </p>
        </div>

        {/* Core Thesis Card */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 bg-[#11141b] border border-white/[0.08] space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400" />
            <span>The Multi-Model Thesis</span>
          </h2>
          <p className="text-xs sm:text-sm leading-relaxed text-slate-300">
            Foundation models are trained on divergent architectures, reinforcement objectives, and dataset mixtures. Relying exclusively on one provider creates vendor lock-in and leaves users vulnerable to silent hallucinations.
          </p>
          <p className="text-xs sm:text-sm leading-relaxed text-slate-300">
            ConcordRouter treats foundation models as competing contributors. By fanning out prompts concurrently and aligning their responses with mathematical sequence alignment, users uncover consensus facts, catch divergent edge cases, and reconcile answers with full provenance.
          </p>
        </div>

        {/* Principles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="glass-card rounded-2xl p-6 space-y-3 bg-[#11141b] border border-white/[0.08]">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Terminal className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Zero-Friction Local Execution</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Designed from the start to run locally on your laptop with embedded SQLite, zero CGo dependencies, and instant mock fixtures.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 space-y-3 bg-[#11141b] border border-white/[0.08]">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Shield className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Trust & Credential Integrity</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              We never mark up token pricing, hijack session cookies, or proxy billing. Your AES-256 encrypted keys remain strictly yours.
            </p>
          </div>
        </div>

        {/* Open Source Footer */}
        <div className="rounded-3xl bg-[#11141b]/90 border border-white/[0.08] p-6 text-center space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <span>Built with local Go runtime, Next.js App Router, and pure SQLite.</span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono">
            ConcordRouter • Open-source Multi-Model Consensus Architecture
          </p>
        </div>
      </div>
    </div>
  );
};
