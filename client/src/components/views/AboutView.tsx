'use client';

import React from 'react';
import { BookOpen, GitBranch, Shield, Zap, Sparkles, Heart, Terminal, Code } from 'lucide-react';

export const AboutView: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-12">
      <div className="mx-auto max-w-4xl space-y-12">
        {/* Header Hero */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
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
        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/[0.08] space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-400" />
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
          <div className="glass-card rounded-2xl p-6 space-y-3 border border-white/[0.08]">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Terminal className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Zero-Friction Local Execution</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Designed from the start to run locally on your laptop with embedded SQLite, zero CGo dependencies, and instant mock fixtures.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 space-y-3 border border-white/[0.08]">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Shield className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Trust & Credential Integrity</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              We never mark up token pricing, hijack session cookies, or proxy billing. Your AES-256 encrypted keys remain strictly yours.
            </p>
          </div>
        </div>

        {/* Open Source / Credits Footer */}
        <div className="text-center pt-6 border-t border-white/[0.06] text-xs text-slate-500 space-y-2">
          <p>ConcordRouter is open source under the MIT License.</p>
          <p className="flex items-center justify-center gap-1">
            <span>Built with Go, Next.js, and</span>
            <Heart className="h-3.5 w-3.5 text-red-500 fill-red-500 inline" />
            <span>for the developer community.</span>
          </p>
        </div>
      </div>
    </div>
  );
};
