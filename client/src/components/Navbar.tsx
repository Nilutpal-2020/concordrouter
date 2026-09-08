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
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-cyan-500 shadow-md shadow-indigo-500/25 group-hover:scale-105 transition-transform">
            <Layers className="h-5 w-5 text-white" />
            <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 opacity-0 group-hover:opacity-40 blur-sm transition-opacity" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-white group-hover:text-indigo-200 transition-colors">
                ConcordRouter
              </span>
              <span className="rounded-md bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 px-1.5 py-0.5 text-[9px] font-mono font-bold text-indigo-300 border border-indigo-500/30">
                PROMPT ARENA
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">Multi-Model Consensus & Merge</p>
          </div>
        </button>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-white/[0.06]">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-500/20 font-semibold'
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
        {/* Model Selector Bar (Visible on Arena or accessible from any page) */}
        <button
          onClick={onOpenModelSelector}
          className="flex items-center gap-2 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 px-3 py-1.5 border border-white/[0.08] transition-all text-xs font-medium text-slate-200 shadow-sm"
          title="Select active models for fan-out"
        >
          <div className="flex -space-x-1.5">
            {selectedModels.map((m, idx) => (
              <span
                key={idx}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 ring-2 ring-slate-950 text-[10px] uppercase font-bold text-indigo-300 border border-slate-700"
              >
                {m.providerId.slice(0, 1)}
              </span>
            ))}
          </div>
          <span className="hidden sm:inline">
            {selectedModels.length} Models
          </span>
          <span className="text-slate-400 text-[10px] bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">
            Configure
          </span>
        </button>

        {/* BYOA Key Vault */}
        <button
          onClick={onOpenSettings}
          className="relative flex items-center gap-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 px-3 py-1.5 border border-white/[0.08] text-xs font-medium text-slate-200 transition-all shadow-sm"
          title="BYOA Provider Keys & Endpoints (Encrypted at Rest)"
        >
          <Key className="h-3.5 w-3.5 text-amber-400" />
          <span className="hidden sm:inline">Keys</span>
          <span className="rounded-full bg-slate-800 px-1.5 py-0.2 text-[10px] font-mono text-emerald-400 border border-emerald-500/20">
            {connectedCount}
          </span>
        </button>

        {/* Launch Arena Button when on a product view */}
        {currentView !== 'arena' ? (
          <button
            onClick={() => onNavigate('arena')}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/25 transition-all active:scale-[0.98]"
          >
            <span>Open Arena</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            onClick={onNewChat}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition-all active:scale-[0.98]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Arena Session</span>
          </button>
        )}
      </div>
    </header>
  );
};
