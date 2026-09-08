'use client';

import React from 'react';
import { Thread, ProviderStatus } from '@/lib/types';
import { MessageSquare, Trash2, Plus, Server, Search, CheckCircle2, AlertCircle, X, ChevronLeft, ChevronRight, Settings } from 'lucide-react';

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
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return '1d';
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
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
  isCollapsed = false,
  onToggleCollapse,
}) => {
  if (isCollapsed) {
    return (
      <aside className="flex h-full w-12 flex-col items-center border-r border-border bg-surface-secondary/30 py-3 text-text-secondary select-none">
        <button
          onClick={onToggleCollapse}
          className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg hover:bg-surface-hover text-text-secondary hover:text-foreground transition-all"
          title="Expand sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          onClick={onNewThread}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background hover:opacity-90 transition-all shadow-sm"
          title="New Arena Turn"
        >
          <Plus className="h-4 w-4" />
        </button>
        <div className="mt-auto">
          <button
            onClick={onOpenSettings}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-surface-hover text-text-secondary hover:text-foreground transition-all"
            title="Configure Providers"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-64 lg:w-72 flex-col border-r border-border bg-surface-secondary/30 p-3 text-text-secondary select-none transition-all">
      {/* Top Action Bar: New Arena & Collapse */}
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={onNewThread}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-surface border border-border hover:border-border-strong hover:bg-surface-hover py-2 px-3 text-xs font-medium text-foreground transition-all shadow-sm active:scale-[0.99]"
        >
          <Plus className="h-3.5 w-3.5 text-foreground" />
          <span>New Arena</span>
        </button>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-surface-hover text-text-muted hover:text-foreground transition-colors"
            title="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="relative mt-1 mb-2">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-muted" />
        <input
          type="text"
          placeholder="Search history..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-xl bg-surface border border-border pl-8 pr-7 py-1.5 text-xs text-foreground placeholder-text-muted focus:border-border-strong focus:outline-none transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-2 p-0.5 text-text-muted hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Threads Section */}
      <div className="flex-1 overflow-y-auto pr-1">
        <div className="px-2 py-1 text-[11px] font-medium text-text-muted">
          {searchQuery ? 'Search Results' : 'Recent Turns'}
        </div>
        <div className="mt-1 space-y-1">
          {threads.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-text-muted">
              No conversations yet. Fan-out a prompt to start.
            </div>
          ) : (
            threads.map((th) => {
              const isActive = th.id === activeThreadId;
              const relTime = formatRelativeTime(th.updatedAt || th.createdAt);
              return (
                <div
                  key={th.id}
                  onClick={() => onSelectThread(th.id)}
                  className={`group relative flex flex-col rounded-xl px-2.5 py-2 text-xs cursor-pointer transition-all ${
                    isActive
                      ? 'bg-surface text-foreground font-medium shadow-sm border border-border'
                      : 'text-text-secondary hover:bg-surface-hover hover:text-foreground border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5 w-full">
                    <div className="flex items-center gap-2 truncate min-w-0">
                      <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-foreground' : 'text-text-muted'}`} />
                      <span className="truncate font-medium leading-snug">{th.title}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {relTime && (
                        <span className="text-[10px] text-text-muted group-hover:hidden transition-opacity">
                          {relTime}
                        </span>
                      )}
                      {(th.turnCount ?? 0) > 1 && (
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-surface-secondary border border-border text-text-muted">
                          {th.turnCount}t
                        </span>
                      )}
                      <button
                        onClick={(e) => onDeleteThread(th.id, e)}
                        className="hidden group-hover:flex items-center justify-center h-5 w-5 rounded hover:bg-surface hover:text-red-500 text-text-muted transition-all"
                        title="Delete thread"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* First Input / Prompt Snippet (ChatGPT & Claude style) */}
                  {th.firstPrompt && (
                    <div className="mt-1 pl-5 text-[11px] text-text-muted line-clamp-1 truncate leading-tight opacity-75 font-normal">
                      {th.firstPrompt}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Provider Status Summary Bar */}
      <div className="mt-auto border-t border-border pt-3">
        <div className="flex items-center justify-between px-1 mb-2">
          <span className="text-[11px] font-medium text-text-muted flex items-center gap-1.5">
            <Server className="h-3 w-3" />
            Providers
          </span>
          <button
            onClick={onOpenSettings}
            className="text-[10px] text-text-secondary hover:text-foreground font-medium transition-colors"
          >
            Configure
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {providers.map((p) => (
            <div
              key={p.id}
              onClick={onOpenSettings}
              className="flex items-center justify-between rounded-lg bg-surface hover:bg-surface-hover px-2 py-1.5 text-[11px] text-text-secondary cursor-pointer border border-border transition-colors"
            >
              <span className="truncate capitalize font-mono text-[10px]">{p.id}</span>
              {p.isConnected ? (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-text-muted/40 shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};
