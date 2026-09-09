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
  Sun,
  Moon,
  ChevronRight,
  PanelLeft,
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
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  onToggleMobileSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  selectedModels,
  providers,
  onOpenModelSelector,
  onOpenSettings,
  onNewChat,
  theme = 'dark',
  onToggleTheme,
  onToggleMobileSidebar,
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
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/90 px-3 sm:px-4 backdrop-blur-md transition-colors lg:px-6">
      {/* Brand & Logo */}
      <div className="flex items-center gap-2 sm:gap-6">
        {onToggleMobileSidebar && currentView === 'arena' && (
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg bg-surface-secondary hover:bg-surface-hover border border-border text-foreground transition-colors shrink-0"
            title="Toggle session history sidebar"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        )}

        <button
          onClick={() => onNavigate('arena')}
          className="flex items-center gap-2 sm:gap-2.5 text-left group"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-secondary border border-border group-hover:border-border-strong transition-all shrink-0">
            <Layers className="h-4 w-4 text-foreground transition-transform group-hover:scale-105" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-semibold text-sm tracking-tight text-foreground">
                ConcordRouter
              </span>
              <span className="hidden xs:inline-block rounded-full bg-surface-secondary px-2 py-0.5 text-[10px] font-medium text-text-secondary border border-border">
                Arena
              </span>
            </div>
          </div>
        </button>

        {/* Minimal Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-surface-secondary/70 p-1 rounded-xl border border-border">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-surface text-foreground shadow-sm font-semibold'
                    : 'text-text-secondary hover:text-foreground hover:bg-surface-hover/50'
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
          className="flex items-center gap-2 rounded-full bg-surface-secondary hover:bg-surface-hover px-3 py-1.5 border border-border transition-all text-xs font-medium text-foreground shadow-sm"
          title="Select active models for fan-out"
        >
          <div className="flex -space-x-1.5">
            {selectedModels.map((m, idx) => (
              <span
                key={idx}
                className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-surface ring-1 ring-border text-[9px] uppercase font-bold text-foreground"
              >
                {m.providerId.slice(0, 1)}
              </span>
            ))}
          </div>
          <span className="text-xs font-medium text-foreground">
            {selectedModels.length} Models
          </span>
          <span className="text-text-muted text-[10px]">▾</span>
        </button>

        {/* BYOA Key Vault */}
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 rounded-full bg-surface-secondary hover:bg-surface-hover px-3 py-1.5 border border-border text-xs font-medium text-foreground transition-all shadow-sm"
          title="BYOA Provider Keys & Endpoints (Encrypted at Rest)"
        >
          <Key className="h-3.5 w-3.5 text-text-secondary" />
          <span className="hidden sm:inline">Keys</span>
          <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.2 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            {connectedCount}
          </span>
        </button>

        {/* Light / Dark Mode Toggle */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-secondary hover:bg-surface-hover border border-border text-text-secondary hover:text-foreground transition-all"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 transition-transform hover:rotate-45" />
            ) : (
              <Moon className="h-4 w-4 transition-transform hover:-rotate-12" />
            )}
          </button>
        )}

        {/* Launch Arena Button or New Session */}
        {currentView !== 'arena' ? (
          <button
            onClick={() => onNavigate('arena')}
            className="flex items-center gap-1.5 rounded-full bg-foreground text-background px-3.5 py-1.5 text-xs font-medium hover:opacity-90 transition-all active:scale-[0.98]"
          >
            <span>Open Arena</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            onClick={onNewChat}
            className="flex items-center gap-1.5 rounded-full bg-foreground text-background px-3.5 py-1.5 text-xs font-medium hover:opacity-90 transition-all active:scale-[0.98]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Session</span>
          </button>
        )}
      </div>
    </header>
  );
};
