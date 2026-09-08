import React from 'react';
import { Thread, ProviderStatus } from '@/lib/types';
import { MessageSquare, Trash2, Plus, Server, Search, CheckCircle2, AlertCircle, X, Shield } from 'lucide-react';

interface SidebarProps {
  threads: Thread[];
  activeThreadId: string | null;
  providers: ProviderStatus[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectThread: (threadId: string) => void;
  onNewThread: () => void;
  onDeleteThread: (threadId: string, e: React.MouseEvent) => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  threads,
  activeThreadId,
  providers,
  searchQuery,
  onSearchChange,
  onSelectThread,
  onNewThread,
  onDeleteThread,
  onOpenSettings,
}) => {
  return (
    <aside className="flex h-full w-64 flex-col border-r border-white/[0.06] bg-[#0c0f15]/95 p-3 text-slate-300 select-none">
      {/* New Session Button */}
      <button
        onClick={onNewThread}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 py-2.5 px-3 text-xs font-bold text-black shadow-md shadow-amber-500/10 transition-all active:scale-[0.98]"
      >
        <Plus className="h-4 w-4 stroke-[2.5]" />
        <span>New Arena Turn</span>
      </button>

      {/* Search Input */}
      <div className="relative mt-3">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
        <input
          type="text"
          placeholder="Search prompts & turns..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-xl bg-[#13161f] border border-white/[0.08] pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 focus:border-amber-500/60 focus:outline-none"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-2 p-0.5 text-slate-400 hover:text-white"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Threads Section */}
      <div className="mt-3 flex-1 overflow-y-auto pr-1">
        <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {searchQuery ? 'Search Results' : 'Arena History'}
        </div>
        <div className="mt-1 space-y-1">
          {threads.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-slate-400">
              No turns yet. Compose a prompt to fan-out.
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
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      : 'text-slate-400 hover:bg-[#141822] hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
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
      <div className="mt-auto border-t border-white/[0.06] pt-3">
        <div className="flex items-center justify-between px-1 mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Server className="h-3 w-3 text-slate-400" />
            Providers
          </span>
          <button
            onClick={onOpenSettings}
            className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold hover:underline"
          >
            Configure
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {providers.map((p) => (
            <div
              key={p.id}
              onClick={onOpenSettings}
              className="flex items-center justify-between rounded-lg bg-[#13161f] hover:bg-[#191d29] px-2 py-1.5 text-[11px] text-slate-300 cursor-pointer border border-white/[0.06] transition-colors"
            >
              <span className="truncate capitalize font-mono text-[10px]">{p.id}</span>
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
