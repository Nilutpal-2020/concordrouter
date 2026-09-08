'use client';

import React from 'react';
import { TargetModel, ProviderStatus } from '@/lib/types';
import {
  Layers,
  Key,
  Plus,
  Sparkles,
  Zap,
  ShieldCheck,
  HelpCircle,
  BookOpen,
  Sliders,
  ChevronRight,
} from 'lucide-react';

export type AppView = 'arena' | 'features' | 'how-it-works' | 'security' | 'faq' | 'about';

interface NavbarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  selectedModels: TargetModel[];
  providers: ProviderStatus[];
  onOpenModelSelector: () => void;
  onOpenSettings: () => void;
  onNewChat: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  selectedModels,
  providers,
  onOpenModelSelector,
  onOpenSettings,
  onNewChat,
}) => {
  const connectedCount = providers.filter((p) => p.isConnected).length;

  const navItems: { id: AppView; label: string; icon: React.ReactNode }[] = [
    { id: 'arena', label: 'Arena', icon: <Layers className="h-3.5 w-3.5" /> },
    { id: 'features', label: 'Features', icon: <Sparkles className="h-3.5 w-3.5" /> },
    { id: 'how-it-works', label: 'How It Works', icon: <Zap className="h-3.5 w-3.5" /> },
    { id: 'security', label: 'Security & BYOA', icon: <ShieldCheck className="h-3.5 w-3.5" /> },
    { id: 'faq', label: 'FAQ', icon: <HelpCircle className="h-3.5 w-3.5" /> },
    { id: 'about', label: 'About', icon: <BookOpen className="h-3.5 w-3.5" /> },
  ];

  return (
    <header className="glass-header sticky top-0 z-40 flex h-16 items-center justify-between px-4 lg:px-6">
      {/* Brand & Logo */}
      <div className="flex items-center gap-6">
        <button
          onClick={() => onNavigate('arena')}
          className="flex items-center gap-3 text-left group"
        >
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-400 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
            <Layers className="h-5 w-5 text-black font-bold" />
            <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-300 opacity-0 group-hover:opacity-40 blur-sm transition-opacity" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-white group-hover:text-amber-300 transition-colors">
                ConcordRouter
              </span>
              <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-mono font-bold text-amber-300 border border-amber-500/20">
                PROMPT ARENA
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">Multi-Model Consensus & Merge</p>
          </div>
        </button>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-[#12151c]/90 p-1 rounded-xl border border-white/[0.06]">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Right Action Bar */}
      <div className="flex items-center gap-2">
        {/* Model Selector Bar */}
        <button
          onClick={onOpenModelSelector}
          className="flex items-center gap-2 rounded-xl bg-[#13161f] hover:bg-[#1a1f2c] px-3 py-1.5 border border-white/[0.08] transition-all text-xs font-medium text-slate-200 shadow-sm hover:border-amber-500/30"
          title="Select active models for fan-out"
        >
          <div className="flex -space-x-1.5">
            {selectedModels.map((m, idx) => (
              <span
                key={idx}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#1e2330] ring-2 ring-[#090b0e] text-[10px] uppercase font-bold text-amber-300 border border-white/[0.08]"
              >
                {m.providerId.slice(0, 1)}
              </span>
            ))}
          </div>
          <span className="hidden sm:inline">
            {selectedModels.length} Models
          </span>
          <span className="text-amber-400 text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 font-mono font-semibold">
            Select
          </span>
        </button>

        {/* BYOA Key Vault */}
        <button
          onClick={onOpenSettings}
          className="relative flex items-center gap-1.5 rounded-xl bg-[#13161f] hover:bg-[#1a1f2c] px-3 py-1.5 border border-white/[0.08] text-xs font-medium text-slate-200 transition-all shadow-sm hover:border-amber-500/30"
          title="BYOA Provider Keys & Endpoints (Encrypted at Rest)"
        >
          <Key className="h-3.5 w-3.5 text-amber-400" />
          <span className="hidden sm:inline">Key Vault</span>
          <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.2 text-[10px] font-mono text-emerald-400 border border-emerald-500/20">
            {connectedCount}
          </span>
        </button>

        {/* Launch Arena Button or New Chat */}
        {currentView !== 'arena' ? (
          <button
            onClick={() => onNavigate('arena')}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 px-3.5 py-1.5 text-xs font-bold text-black shadow-md shadow-amber-500/20 transition-all active:scale-[0.98]"
          >
            <span>Open Arena</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            onClick={onNewChat}
            className="flex items-center gap-1.5 rounded-xl bg-[#181d27] hover:bg-[#202634] border border-white/[0.08] hover:border-amber-500/30 px-3.5 py-1.5 text-xs font-semibold text-slate-200 transition-all active:scale-[0.98]"
          >
            <Plus className="h-3.5 w-3.5 text-amber-400" />
            <span className="hidden sm:inline">New Session</span>
          </button>
        )}
      </div>
    </header>
  );
};
