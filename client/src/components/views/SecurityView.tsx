'use client';

import React from 'react';
import {
  ShieldCheck,
  Lock,
  Key,
  Server,
  Cpu,
  CheckCircle,
  XCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface SecurityViewProps {
  onOpenSettings: () => void;
}

export const SecurityView: React.FC<SecurityViewProps> = ({ onOpenSettings }) => {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 lg:px-12 bg-[#090b0e]">
      <div className="mx-auto max-w-5xl space-y-12">
        {/* Header Hero */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#141822] px-3.5 py-1 text-xs font-mono text-amber-400 border border-amber-500/20">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Cryptographic Privacy & BYOA Architecture</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Bring Your Own Account <span className="text-gradient-gold">(BYOA)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            ConcordRouter does not proxy, markup, or resell LLM API usage. You connect directly to providers using your official credentials.
          </p>
        </div>

        {/* Security Principles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="glass-card rounded-2xl p-6 space-y-3 bg-[#11141b] border border-white/[0.08]">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Lock className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-white">AES-256-GCM Encryption</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every API key saved in ConcordRouter is encrypted at rest using Galois/Counter Mode authenticated encryption with unique cryptographic nonces.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 space-y-3 bg-[#11141b] border border-white/[0.08]">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Key className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Never Returned in Plaintext</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              After initial verification, the server only returns masked previews (e.g. <code className="text-amber-300">sk-ant-...4x9f</code>) back to the browser.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 space-y-3 bg-[#11141b] border border-white/[0.08]">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Server className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Zero Telemetry & Direct Dispatch</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Requests flow directly from your machine to official provider endpoints. No middleman cloud database retains your prompts or completions.
            </p>
          </div>
        </div>

        {/* Security Comparison Table */}
        <div className="rounded-3xl bg-[#11141b]/90 border border-white/[0.08] p-6 lg:p-8 space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">Privacy Comparison</h3>
            <p className="text-xs sm:text-sm text-slate-400">
              How ConcordRouter BYOA compares to commercial cloud AI wrappers and proxy services.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-white/[0.08] text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                <tr>
                  <th className="pb-3 font-semibold">Security Vector</th>
                  <th className="pb-3 font-semibold text-amber-400">ConcordRouter (BYOA)</th>
                  <th className="pb-3 font-semibold text-slate-400">Commercial Cloud AI Proxy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] font-mono text-[12px]">
                <tr>
                  <td className="py-3 text-white font-sans font-medium">Key Storage</td>
                  <td className="py-3 text-emerald-400 font-bold">Local AES-256-GCM encrypted database</td>
                  <td className="py-3 text-red-400">Stored on remote third-party servers</td>
                </tr>
                <tr>
                  <td className="py-3 text-white font-sans font-medium">Prompt Retention</td>
                  <td className="py-3 text-emerald-400 font-bold">Zero remote logging (Local SQLite only)</td>
                  <td className="py-3 text-amber-400">Often logged for analytics/training</td>
                </tr>
                <tr>
                  <td className="py-3 text-white font-sans font-medium">Token Pricing Markup</td>
                  <td className="py-3 text-emerald-400 font-bold">0% (Direct provider invoice)</td>
                  <td className="py-3 text-red-400">10% – 50% price markup added</td>
                </tr>
                <tr>
                  <td className="py-3 text-white font-sans font-medium">Local Model Support</td>
                  <td className="py-3 text-emerald-400 font-bold">Native Ollama localhost integration</td>
                  <td className="py-3 text-red-400">Cloud models only</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-3xl bg-[#11141b]/90 border border-white/[0.08] p-8 text-center space-y-4">
          <h3 className="text-xl font-bold text-white">Manage your provider credentials</h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Add or update your Anthropic, OpenAI, Google Gemini, Ollama, and OpenRouter keys securely in the Key Vault.
          </p>
          <button
            onClick={onOpenSettings}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 px-5 py-2.5 text-xs font-bold text-black shadow-md shadow-amber-500/20 transition-all active:scale-[0.98]"
          >
            <Key className="h-4 w-4" />
            <span>Open Key Vault</span>
          </button>
        </div>
      </div>
    </div>
  );
};
