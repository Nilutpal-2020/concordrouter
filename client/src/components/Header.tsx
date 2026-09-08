'use client';

import React from 'react';
import { TargetModel, ProviderStatus } from '@/lib/types';
import { Layers, Key, Plus, ShieldCheck, Sparkles } from 'lucide-react';

interface HeaderProps {
  threadTitle: string;
  selectedModels: TargetModel[];
  providers: ProviderStatus[];
  onOpenModelSelector: () => void;
  onOpenSettings: () => void;
  onNewChat: () => void;
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  threadTitle,
  selectedModels,
  providers,
  onOpenModelSelector,
  onOpenSettings,
  onNewChat,
}) => {
  const connectedCount = providers.filter((p) => p.isConnected).length;

  return (
    <header className="glass-header sticky top-0 z-30 flex h-16 items-center justify-between px-4 lg:px-6">
      {/* Brand & Active Thread */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 shadow-md shadow-blue-500/20">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-white lg:text-base">ConcordRouter</span>
              <span className="rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-400 border border-blue-500/20">ARENA</span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-[200px] sm:max-w-xs">{threadTitle}</p>
          </div>
        </div>
      </div>

      {/* Model Selector Bar */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenModelSelector}
          className="flex items-center gap-2 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 px-3 py-1.5 border border-slate-800 transition-all text-xs font-medium text-slate-200"
        >
          <div className="flex -space-x-1.5">
            {selectedModels.map((m, idx) => (
              <span
                key={idx}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 ring-2 ring-slate-950 text-[10px] uppercase font-bold text-blue-400 border border-slate-700"
              >
                {m.providerId.slice(0, 1)}
              </span>
            ))}
          </div>
          <span>
            {selectedModels.length} {selectedModels.length === 1 ? 'Model' : 'Models'} Selected
          </span>
          <span className="text-slate-400 text-[10px] bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">Change</span>
        </button>

        {/* BYOA Settings Button */}
        <button
          onClick={onOpenSettings}
          className="relative flex items-center gap-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 px-3 py-1.5 border border-slate-800 text-xs font-medium text-slate-200 transition-all"
          title="BYOA Provider Keys & Endpoints"
        >
          <Key className="h-3.5 w-3.5 text-amber-400" />
          <span className="hidden sm:inline">Keys</span>
          <span className="rounded-full bg-slate-800 px-1.5 py-0.2 text-[10px] text-emerald-400 border border-emerald-500/20">
            {connectedCount}
          </span>
        </button>

        {/* New Session */}
        <button
          onClick={onNewChat}
          className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm shadow-blue-600/30 transition-all"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">New Session</span>
        </button>
      </div>
    </header>
  );
};
