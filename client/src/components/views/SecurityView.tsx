'use client';

import React from 'react';
import {
  ShieldCheck,
  Lock,
  Key,
  Server,
  ArrowRight,
} from 'lucide-react';

interface SecurityViewProps {
  onOpenSettings: () => void;
}

export const SecurityView: React.FC<SecurityViewProps> = ({ onOpenSettings }) => {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 lg:px-12 bg-background text-foreground transition-colors">
      <div className="mx-auto max-w-4xl space-y-10">
        {/* Header Hero */}
        <div className="text-center space-y-3.5 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-surface-secondary px-3 py-1 text-xs font-medium text-text-secondary border border-border">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-terracotta" />
            <span>Cryptographic Privacy & BYOA Architecture</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">
            Bring Your Own Account (BYOA)
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            ConcordRouter does not proxy, markup, or resell LLM API usage. You connect directly to providers using your official credentials.
          </p>
        </div>

        {/* Security Principles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl p-5 space-y-2.5 bg-surface border border-border shadow-card">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-secondary border border-border text-foreground">
              <Lock className="h-4 w-4 text-brand-terracotta" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">AES-256-GCM Encryption</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Every API key saved in ConcordRouter is encrypted at rest using Galois/Counter Mode authenticated encryption with unique cryptographic nonces.
            </p>
          </div>

          <div className="rounded-2xl p-5 space-y-2.5 bg-surface border border-border shadow-card">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-secondary border border-border text-foreground">
              <Key className="h-4 w-4 text-emerald-500" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Never Returned in Plaintext</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              After initial verification, the server only returns masked previews (e.g. <code className="text-foreground font-mono">sk-ant-...4x9f</code>) back to the browser.
            </p>
          </div>

          <div className="rounded-2xl p-5 space-y-2.5 bg-surface border border-border shadow-card">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-secondary border border-border text-foreground">
              <Server className="h-4 w-4 text-brand-terracotta" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Zero Telemetry Dispatch</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Requests flow directly from your machine to official provider endpoints. No middleman cloud database retains your prompts or completions.
            </p>
          </div>
        </div>

        {/* Configure Keys Action */}
        <div className="text-center pt-2">
          <button
            onClick={onOpenSettings}
            className="inline-flex items-center gap-2 rounded-full bg-foreground text-background hover:opacity-90 px-5 py-2.5 text-xs font-medium shadow-sm transition-all active:scale-95"
          >
            <span>Open BYOA Key Vault</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
