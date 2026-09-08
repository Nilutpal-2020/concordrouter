'use client';

import React from 'react';
import { BookOpen, Shield, Sparkles, Terminal } from 'lucide-react';

export const AboutView: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 lg:px-12 bg-background text-foreground transition-colors">
      <div className="mx-auto max-w-3xl space-y-10">
        {/* Header Hero */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-surface-secondary px-3 py-1 text-xs font-medium text-text-secondary border border-border">
            <BookOpen className="h-3.5 w-3.5 text-brand-terracotta" />
            <span>Mission & Philosophy</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">
            About ConcordRouter
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed max-w-lg mx-auto">
            The platform built on the conviction that the future of intelligence is multi-model, transparent, and user-owned.
          </p>
        </div>

        {/* Core Thesis Card */}
        <div className="rounded-2xl p-6 sm:p-7 bg-surface border border-border space-y-3 shadow-card">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-terracotta" />
            <span>The Multi-Model Thesis</span>
          </h2>
          <p className="text-xs sm:text-sm leading-relaxed text-text-secondary">
            Foundation models are trained on divergent architectures, reinforcement objectives, and dataset mixtures. Relying exclusively on one provider creates vendor lock-in and leaves users vulnerable to silent hallucinations.
          </p>
          <p className="text-xs sm:text-sm leading-relaxed text-text-secondary">
            ConcordRouter treats foundation models as competing contributors. By fanning out prompts concurrently and aligning their responses with mathematical sequence alignment, users uncover consensus facts, catch divergent edge cases, and reconcile answers with full provenance.
          </p>
        </div>

        {/* Principles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl p-5 space-y-2.5 bg-surface border border-border shadow-card">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-secondary border border-border text-foreground">
              <Terminal className="h-4 w-4 text-brand-terracotta" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Local Execution</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Designed from the ground up to run locally on your machine with embedded SQLite, zero CGo dependencies, and instant mock fixtures.
            </p>
          </div>

          <div className="rounded-2xl p-5 space-y-2.5 bg-surface border border-border shadow-card">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-secondary border border-border text-foreground">
              <Shield className="h-4 w-4 text-emerald-500" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Trust & Credential Integrity</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              We never mark up token pricing, hijack session cookies, or proxy billing. Your AES-256 encrypted keys remain strictly yours.
            </p>
          </div>
        </div>

        {/* Open Source Footer */}
        <div className="rounded-2xl bg-surface-secondary border border-border p-5 text-center space-y-1">
          <p className="text-xs text-text-secondary">
            Built with local Go runtime, Next.js App Router, and embedded SQLite.
          </p>
          <p className="text-[11px] text-text-muted font-mono">
            ConcordRouter • Open-source Multi-Model Consensus Architecture
          </p>
        </div>
      </div>
    </div>
  );
};
