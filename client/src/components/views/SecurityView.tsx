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
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-12">
      <div className="mx-auto max-w-5xl space-y-12">
        {/* Header Hero */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-400 border border-amber-500/20">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Cryptographic Privacy & BYOA Architecture</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Bring Your Own Account (BYOA)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            ConcordRouter does not proxy, markup, or resell LLM API usage. You connect directly to providers using your official credentials.
          </p>
        </div>

        {/* Security Principles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="glass-card rounded-2xl p-6 space-y-3 border border-white/[0.08]">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Lock className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-white">AES-256-GCM Encryption</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every API key saved in ConcordRouter is encrypted at rest using Galois/Counter Mode authenticated encryption with unique cryptographic nonces.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 space-y-3 border border-white/[0.08]">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Key className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Never Returned in Plaintext</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              After initial verification, the server only returns masked previews (e.g. <code className="text-indigo-300">sk-ant-...4x9f</code>) back to the browser.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 space-y-3 border border-white/[0.08]">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Server className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Zero Token Markups</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              You pay official provider rates directly to Anthropic, OpenAI, or Google. Or run completely free with local Ollama open-weights models.
            </p>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
          <div className="p-6 border-b border-white/[0.08] bg-slate-950/60">
            <h3 className="text-sm font-bold text-white">Comparison: ConcordRouter vs Typical Multi-Model Proxies</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] bg-slate-950/40 text-slate-400 font-mono">
                  <th className="p-4">Feature / Metric</th>
                  <th className="p-4 text-indigo-300">ConcordRouter (BYOA)</th>
                  <th className="p-4 text-slate-400">Traditional AI Proxies</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-slate-300">
                <tr>
                  <td className="p-4 font-semibold">Token Markups</td>
                  <td className="p-4 text-emerald-400 font-semibold flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4" /> 0% (Direct provider pricing)
                  </td>
                  <td className="p-4 text-slate-400">10% - 30% added margin</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold">Rate Limit Bottlenecks</td>
                  <td className="p-4 text-emerald-400 font-semibold flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4" /> Your own tier & quota limits
                  </td>
                  <td className="p-4 text-slate-400">Shared pool bottlenecks</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold">Local Offline Models</td>
                  <td className="p-4 text-emerald-400 font-semibold flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4" /> Native Ollama (`localhost:11434`)
                  </td>
                  <td className="p-4 text-slate-500">Not supported</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold">Prose Diffing & Alignment</td>
                  <td className="p-4 text-emerald-400 font-semibold flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4" /> Needleman-Wunsch sequence alignment
                  </td>
                  <td className="p-4 text-slate-500">Side-by-side text only</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center pt-2">
          <button
            onClick={onOpenSettings}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 px-6 py-3 text-xs font-bold text-white shadow-xl shadow-amber-500/20 transition-all hover:scale-105"
          >
            <span>Open Key Vault & Settings</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
