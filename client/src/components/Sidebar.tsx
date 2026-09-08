'use client';

import React from 'react';
import { Thread, ProviderStatus } from '@/lib/types';
import { MessageSquare, Trash2, Plus, Server, Cpu, CheckCircle2, AlertCircle } from 'lucide-react';

interface SidebarProps {
  threads: Thread[];
  activeThreadId: string | null;
  providers: ProviderStatus[];
  onSelectThread: (threadId: string) => void;
  onNewThread: () => void;
  onDeleteThread: (threadId: string, e: React.MouseEvent) => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  threads,
  activeThreadId,
  providers,
  onSelectThread,
  onNewThread,
  onDeleteThread,
  onOpenSettings,
}) => {
  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-800/80 bg-slate-950/80 p-3 text-slate-300 select-none">
      {/* New Session Button */}
      <button
        onClick={onNewThread}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 py-2.5 px-3 text-xs font-semibold text-white shadow-md shadow-blue-500/20 transition-all active:scale-[0.98]"
      >
        <Plus className="h-4 w-4" />
        <span>New Arena Turn</span>
      </button>

      {/* Threads Section */}
      <div className="mt-4 flex-1 overflow-y-auto pr-1">
        <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Arena History
        </div>
        <div className="mt-1 space-y-1">
          {threads.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-slate-400">
              No threads yet. Compose a prompt to start.
            </div>
          ) : (
            threads.map((th) => {
              const isActive = th.id === activeThreadId;
              return (
                <div
                  key={th.id}
                  onClick={() => onSelectThread(th.id)}
                  className={`group flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium cursor-pointer transition-all ${
                    isActive
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span className="truncate">{th.title}</span>
                  </div>
                  <button
                    onClick={(e) => onDeleteThread(th.id, e)}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-1 transition-opacity"
                    title="Delete thread"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Provider Status Summary Bar */}
      <div className="mt-auto border-t border-slate-800/80 pt-3">
        <div className="flex items-center justify-between px-1 mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Server className="h-3 w-3 text-slate-400" />
            Providers
          </span>
          <button
            onClick={onOpenSettings}
            className="text-[10px] text-blue-400 hover:text-blue-300 font-medium hover:underline"
          >
            Configure
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {providers.map((p) => (
            <div
              key={p.id}
              onClick={onOpenSettings}
              className="flex items-center justify-between rounded-lg bg-slate-900/60 hover:bg-slate-900 px-2 py-1 text-[11px] text-slate-300 cursor-pointer border border-slate-800/60 transition-colors"
            >
              <span className="truncate capitalize">{p.id}</span>
              {p.isConnected ? (
                <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="h-3 w-3 text-slate-400 shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};
