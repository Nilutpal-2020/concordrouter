'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Thread,
  MessageTurn,
  MergeRecord,
  ProviderStatus,
  TargetModel,
  ModelResponse,
  StreamChunk,
} from '@/lib/types';
import {
  fetchProviders,
  fetchThreads,
  searchThreads,
  createThread,
  fetchThreadDetails,
  deleteThread,
  streamFanOut,
  streamRetry,
} from '@/lib/api';
import { Navbar, AppView } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { ArenaPanes } from '@/components/ArenaPanes';
import { ProviderSettingsModal } from '@/components/ProviderSettingsModal';
import { ModelSelectorModal } from '@/components/ModelSelectorModal';
import { MergeWorkbench } from '@/components/MergeWorkbench';
import { ExportModal } from '@/components/ExportModal';
import { MergeHistoryModal } from '@/components/MergeHistoryModal';
import { PromptTemplatesModal } from '@/components/PromptTemplatesModal';

// Views
import { FeaturesView } from '@/components/views/FeaturesView';
import { HowItWorksView } from '@/components/views/HowItWorksView';
import { SecurityView } from '@/components/views/SecurityView';
import { FaqView } from '@/components/views/FaqView';
import { AboutView } from '@/components/views/AboutView';

import { Send, Sparkles, Layers, StopCircle, BookOpen, Download, History, ArrowUp, Loader2, PanelLeft } from 'lucide-react';

export default function ArenaPage() {
  const [currentView, setCurrentView] = useState<AppView>('arena');
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeThreadTitle, setActiveThreadTitle] = useState<string>('New Session');
  const [turns, setTurns] = useState<MessageTurn[]>([]);
  const [merges, setMerges] = useState<MergeRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Target Models selected for fan-out (Default: 2 mock models or connected providers)
  const [selectedModels, setSelectedModels] = useState<TargetModel[]>([
    { providerId: 'mock', model: 'mock-concise' },
    { providerId: 'mock', model: 'mock-creative' },
  ]);

  const [promptInput, setPromptInput] = useState<string>('');
  const [streamingPrompt, setStreamingPrompt] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [activeResponses, setActiveResponses] = useState<Record<string, ModelResponse>>({});
  const abortStreamRef = useRef<(() => void) | null>(null);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isMergeHistoryOpen, setIsMergeHistoryOpen] = useState<boolean>(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState<boolean>(false);
  const [mergeState, setMergeState] = useState<{
    isOpen: boolean;
    turnId: string;
    modelAKey: string;
    modelBKey: string;
  }>({
    isOpen: false,
    turnId: '',
    modelAKey: '',
    modelBKey: '',
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    const saved = (typeof window !== 'undefined' && localStorage.getItem('concord_theme')) as 'dark' | 'light' | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.classList.toggle('dark', saved === 'dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('concord_theme', next);
      document.documentElement.classList.toggle('dark', next === 'dark');
    }
  };

  // Load Initial Providers & Threads
  const loadInitialData = async () => {
    try {
      const [provList, threadList] = await Promise.all([
        fetchProviders(),
        fetchThreads(),
      ]);
      setProviders(provList);
      setThreads(threadList);

      if (threadList.length > 0) {
        handleSelectThread(threadList[0].id);
      } else {
        handleNewChat();
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleSelectThread = async (threadId: string) => {
    try {
      const data = await fetchThreadDetails(threadId);
      setActiveThread(data.thread);
      setActiveThreadId(data.thread.id);
      setActiveThreadTitle(data.thread.title);
      setTurns(data.turns || []);
      setMerges(data.merges || []);

      if (data.turns && data.turns.length > 0) {
        const lastTurn = data.turns[data.turns.length - 1];
        setActiveResponses(lastTurn.responses || {});
      } else {
        setActiveResponses({});
      }
      setCurrentView('arena');
    } catch (err) {
      console.error('Failed to load thread details:', err);
    }
  };

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    try {
      if (q.trim()) {
        const results = await searchThreads(q);
        setThreads(results);
      } else {
        const allThreads = await fetchThreads();
        setThreads(allThreads);
      }
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  const handleNewChat = async () => {
    try {
      const newTh = await createThread('New Session');
      setThreads((prev) => [newTh, ...prev]);
      setActiveThread(newTh);
      setActiveThreadId(newTh.id);
      setActiveThreadTitle(newTh.title);
      setTurns([]);
      setMerges([]);
      setActiveResponses({});
      setPromptInput('');
      setCurrentView('arena');
    } catch (err) {
      console.error('Failed to create new thread:', err);
    }
  };

  const handleDeleteThread = async (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteThread(threadId);
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
      if (activeThreadId === threadId) {
        handleNewChat();
      }
    } catch (err) {
      console.error('Failed to delete thread:', err);
    }
  };

  const handleToggleModel = (providerId: string, modelId: string) => {
    setSelectedModels((prev) => {
      const exists = prev.some((m) => m.providerId === providerId && m.model === modelId);
      if (exists) {
        if (prev.length <= 1) return prev; // Keep at least one
        return prev.filter((m) => !(m.providerId === providerId && m.model === modelId));
      } else {
        return [...prev, { providerId, model: modelId }];
      }
    });
  };

  // Submit Prompt to All Selected Models Concurrently
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!promptInput.trim() || isStreaming) return;

    const currentPrompt = promptInput.trim();
    setPromptInput('');
    setStreamingPrompt(currentPrompt);

    let currentThreadId = activeThreadId;
    if (!currentThreadId) {
      const newTh = await createThread(currentPrompt.slice(0, 30) + '...');
      currentThreadId = newTh.id;
      setActiveThread(newTh);
      setActiveThreadId(currentThreadId);
      setActiveThreadTitle(newTh.title);
      setThreads((prev) => [newTh, ...prev]);
    }

    // Optimistically update thread title and firstPrompt on first turn
    const isFirstTurn = turns.length === 0;
    if (isFirstTurn) {
      const autoTitle = currentPrompt.length > 36 ? currentPrompt.slice(0, 36) + '...' : currentPrompt;
      setActiveThreadTitle(autoTitle);
      setActiveThread((prev) => (prev ? { ...prev, title: autoTitle, firstPrompt: currentPrompt, turnCount: 1 } : null));
      setThreads((prev) =>
        prev.map((t) =>
          t.id === currentThreadId
            ? { ...t, title: autoTitle, firstPrompt: currentPrompt, turnCount: 1 }
            : t
        )
      );
    }

    // Initialize blank responses for each target model
    const initialResponses: Record<string, ModelResponse> = {};
    selectedModels.forEach((target) => {
      const key = `${target.providerId}:${target.model}`;
      initialResponses[key] = {
        id: `temp_${key}`,
        turnId: '',
        providerId: target.providerId,
        model: target.model,
        content: '',
        status: 'streaming',
        latencyMs: 0,
        tokens: 0,
        createdAt: new Date().toISOString(),
      };
    });

    setActiveResponses(initialResponses);
    setIsStreaming(true);

    let currentTurnId = '';

    const abortFn = await streamFanOut(
      currentThreadId,
      currentPrompt,
      selectedModels,
      (turnId) => {
        currentTurnId = turnId;
      },
      (chunk: StreamChunk) => {
        const key = `${chunk.providerId}:${chunk.model}`;
        setActiveResponses((prev) => {
          const existing = prev[key] || {
            id: `resp_${key}`,
            turnId: currentTurnId,
            providerId: chunk.providerId,
            model: chunk.model,
            content: '',
            status: 'streaming',
            latencyMs: 0,
            tokens: 0,
            createdAt: new Date().toISOString(),
          };

          const newContent = chunk.fullText || (existing.content + (chunk.delta || ''));
          const newStatus = chunk.error ? 'error' : chunk.done ? 'completed' : 'streaming';

          return {
            ...prev,
            [key]: {
              ...existing,
              turnId: currentTurnId,
              content: newContent,
              status: newStatus,
              error: chunk.error || existing.error,
              tokens: chunk.tokens || existing.tokens,
            },
          };
        });
      },
      (err) => {
        console.error('Fan-out stream error:', err);
        setIsStreaming(false);
        setStreamingPrompt('');
      },
      () => {
        setIsStreaming(false);
        setStreamingPrompt('');
        if (currentThreadId) {
          handleSelectThread(currentThreadId);
        }
        fetchThreads().then((thList) => setThreads(thList)).catch(console.error);
      }
    );

    abortStreamRef.current = abortFn;
  };

  const handleStopStream = () => {
    if (abortStreamRef.current) {
      abortStreamRef.current();
      abortStreamRef.current = null;
    }
    setIsStreaming(false);
    setStreamingPrompt('');
  };

  const handleRetryPane = async (target: TargetModel) => {
    if (!activeThreadId || turns.length === 0) return;
    const lastTurn = turns[turns.length - 1];
    const key = `${target.providerId}:${target.model}`;

    setActiveResponses((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        content: '',
        status: 'streaming',
        error: undefined,
      },
    }));

    setIsStreaming(true);
    setStreamingPrompt(lastTurn.userPrompt);

    await streamRetry(
      activeThreadId,
      lastTurn.id,
      lastTurn.userPrompt,
      target,
      (chunk: StreamChunk) => {
        setActiveResponses((prev) => {
          const existing = prev[key];
          const newContent = chunk.fullText || (existing?.content || '') + (chunk.delta || '');
          const newStatus = chunk.error ? 'error' : chunk.done ? 'completed' : 'streaming';

          return {
            ...prev,
            [key]: {
              ...existing,
              content: newContent,
              status: newStatus,
              error: chunk.error,
              tokens: chunk.tokens || existing?.tokens || 0,
            },
          };
        });
      },
      (err) => {
        console.error('Retry error:', err);
        setIsStreaming(false);
        setStreamingPrompt('');
      },
      () => {
        setIsStreaming(false);
        setStreamingPrompt('');
      }
    );
  };

  const handleOpenMerge = (modelAKey: string, modelBKey: string) => {
    const currentTurn = turns[turns.length - 1];
    setMergeState({
      isOpen: true,
      turnId: currentTurn?.id || '',
      modelAKey,
      modelBKey,
    });
  };

  const handleContinueFromMerge = (mergedText: string) => {
    setPromptInput(mergedText);
    setCurrentView('arena');
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleSelectTemplate = (prompt: string, models?: TargetModel[]) => {
    setPromptInput(prompt);
    if (models && models.length > 0) {
      setSelectedModels(models);
    }
    setCurrentView('arena');
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground transition-colors">
      {/* Top Universal Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={(v) => setCurrentView(v)}
        selectedModels={selectedModels}
        providers={providers}
        onOpenModelSelector={() => setIsModelSelectorOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onNewChat={handleNewChat}
        theme={theme}
        onToggleTheme={toggleTheme}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
      />

      {/* Main View Container */}
      <div className="flex flex-1 overflow-hidden">
        {currentView === 'features' ? (
          <FeaturesView
            onOpenArena={() => setCurrentView('arena')}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        ) : currentView === 'how-it-works' ? (
          <HowItWorksView onOpenArena={() => setCurrentView('arena')} />
        ) : currentView === 'security' ? (
          <SecurityView onOpenSettings={() => setIsSettingsOpen(true)} />
        ) : currentView === 'faq' ? (
          <FaqView />
        ) : currentView === 'about' ? (
          <AboutView />
        ) : (
          /* Arena Workspace View */
          <div className="flex flex-1 overflow-hidden relative">
            {/* Left Sidebar (Desktop side-by-side + Mobile overlay drawer) */}
            <Sidebar
              threads={threads}
              activeThreadId={activeThreadId}
              providers={providers}
              searchQuery={searchQuery}
              onSearchChange={handleSearch}
              onSelectThread={(id) => {
                handleSelectThread(id);
                setIsMobileSidebarOpen(false);
              }}
              onNewThread={() => {
                handleNewChat();
                setIsMobileSidebarOpen(false);
              }}
              onDeleteThread={handleDeleteThread}
              onOpenSettings={() => setIsSettingsOpen(true)}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              isMobileOpen={isMobileSidebarOpen}
              onMobileClose={() => setIsMobileSidebarOpen(false)}
            />

            {/* Arena Stage (Always full-width on mobile, never shrunk by sidebar) */}
            <main className="flex flex-1 w-full min-w-0 flex-col overflow-hidden bg-background">
              {/* Secondary Sub-Header */}
              <div className="flex items-center justify-between px-3 sm:px-6 py-2 border-b border-border bg-surface text-xs text-text-secondary">
                <div className="flex items-center gap-2 truncate min-w-0">
                  <button
                    onClick={() => setIsMobileSidebarOpen(true)}
                    className="md:hidden flex h-7 w-7 items-center justify-center rounded-lg bg-surface-secondary hover:bg-surface-hover border border-border text-foreground transition-colors shrink-0"
                    title="Open session history"
                  >
                    <PanelLeft className="h-4 w-4" />
                  </button>

                  <span className="font-semibold text-foreground truncate text-xs sm:text-sm">
                    {activeThreadTitle}
                  </span>
                  {merges.length > 0 && (
                    <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-mono shrink-0">
                      {merges.length} {merges.length === 1 ? 'merge' : 'merges'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setIsTemplatesOpen(true)}
                    className="flex items-center gap-1.5 rounded-full bg-surface-secondary hover:bg-surface-hover px-2.5 py-1 text-[11px] font-medium text-foreground border border-border transition-colors shadow-sm"
                  >
                    <Sparkles className="h-3 w-3 text-text-muted" />
                    <span className="hidden sm:inline">Templates</span>
                  </button>

                  {merges.length > 0 && (
                    <button
                      onClick={() => setIsMergeHistoryOpen(true)}
                      className="flex items-center gap-1.5 rounded-full bg-surface-secondary hover:bg-surface-hover px-2.5 py-1 text-[11px] font-medium text-foreground border border-border transition-colors shadow-sm"
                    >
                      <History className="h-3 w-3 text-text-muted" />
                      <span className="hidden sm:inline">Merge History</span>
                    </button>
                  )}

                  <button
                    onClick={() => setIsExportOpen(true)}
                    className="flex items-center gap-1.5 rounded-full bg-surface-secondary hover:bg-surface-hover px-2.5 py-1 text-[11px] font-medium text-foreground border border-border transition-colors shadow-sm"
                  >
                    <Download className="h-3 w-3 text-text-muted" />
                    <span className="hidden sm:inline">Export</span>
                  </button>
                </div>
              </div>

              {/* Responses Arena Canvas (Ergonomic Full-Width Layout) */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:px-6 lg:py-3">
                <div className="w-full max-w-[1600px] mx-auto h-full flex flex-col space-y-3">
                  {/* User Prompt Anchor */}
                  {(turns.length > 0 || streamingPrompt) && (
                    <div className="rounded-xl border border-border bg-surface-secondary/50 p-3 text-xs shadow-sm transition-all">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-foreground text-background text-[10px] font-bold">
                            U
                          </span>
                          <span className="font-semibold text-foreground text-xs">Prompt</span>
                          {turns.length > 1 && (
                            <span className="rounded bg-surface text-text-muted px-1.5 py-0.2 text-[10px] font-mono border border-border">
                              Turn {turns.length}
                            </span>
                          )}
                          {isStreaming && (
                            <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full animate-pulse">
                              <Loader2 className="h-2.5 w-2.5 animate-spin" />
                              streaming fan-out...
                            </span>
                          )}
                        </div>

                        <div className="hidden sm:flex items-center gap-1">
                          {selectedModels.map((m, idx) => (
                            <span
                              key={idx}
                              className="rounded bg-surface px-1.5 py-0.5 text-[9px] font-mono text-text-secondary border border-border"
                            >
                              {m.model}
                            </span>
                          ))}
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed pl-7">
                        {streamingPrompt || turns[turns.length - 1]?.userPrompt}
                      </p>
                    </div>
                  )}

                  <ArenaPanes
                    prompt={streamingPrompt || turns[turns.length - 1]?.userPrompt || promptInput}
                    selectedModels={selectedModels}
                    responses={activeResponses}
                    isStreaming={isStreaming}
                    onStopStream={handleStopStream}
                    onRetryPane={handleRetryPane}
                    onOpenMerge={handleOpenMerge}
                    onSelectPromptTemplate={(p) => {
                      setPromptInput(p);
                      if (textareaRef.current) {
                        textareaRef.current.focus();
                      }
                    }}
                  />
                </div>
              </div>

              {/* Bottom Floating Prompt Composer (Signature ChatGPT / Claude Style) */}
              <div className="p-3 sm:p-4 lg:px-6 bg-gradient-to-t from-background via-background/90 to-transparent">
                <div className="mx-auto max-w-3xl">
                  <form
                    onSubmit={handleSubmit}
                    className="relative rounded-3xl bg-surface border border-border hover:border-border-strong shadow-composer transition-all flex flex-col p-3"
                  >
                    <textarea
                      ref={textareaRef}
                      value={promptInput}
                      onChange={(e) => setPromptInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmit();
                        }
                      }}
                      rows={Math.min(5, Math.max(1, promptInput.split('\n').length))}
                      placeholder={`Prompt ${selectedModels.length} models...`}
                      className="w-full bg-transparent px-2.5 py-1 text-xs sm:text-sm text-foreground placeholder-text-muted focus:outline-none resize-none font-sans"
                    />

                    {/* Action Toolbar inside Composer */}
                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/50">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setIsModelSelectorOpen(true)}
                          className="flex items-center gap-1 rounded-full bg-surface-secondary hover:bg-surface-hover px-2.5 py-1 text-xs text-text-secondary hover:text-foreground border border-border transition-colors"
                        >
                          <span className="font-medium">{selectedModels.length} models</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsTemplatesOpen(true)}
                          className="flex items-center gap-1 rounded-full bg-surface-secondary hover:bg-surface-hover px-2.5 py-1 text-xs text-text-secondary hover:text-foreground border border-border transition-colors"
                          title="Browse prompt templates"
                        >
                          <Sparkles className="h-3 w-3 text-text-muted" />
                          <span className="hidden sm:inline">Templates</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {isStreaming ? (
                          <button
                            type="button"
                            onClick={handleStopStream}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 hover:bg-red-500 text-white shadow-sm transition-all active:scale-95"
                            title="Stop generating"
                          >
                            <StopCircle className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            type="submit"
                            disabled={!promptInput.trim()}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background hover:opacity-90 disabled:opacity-25 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                            title="Send prompt (Enter)"
                          >
                            <ArrowUp className="h-4 w-4 stroke-[2.5]" />
                          </button>
                        )}
                      </div>
                    </div>
                  </form>
                  <p className="mt-2 text-center text-[11px] text-text-muted">
                    ConcordRouter fans out your prompt to multiple models and aligns divergent outputs. Verify critical facts.
                  </p>
                </div>
              </div>
            </main>
          </div>
        )}
      </div>

      {/* BYOA Provider Settings Modal */}
      <ProviderSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        providers={providers}
        onRefreshProviders={async () => {
          const provs = await fetchProviders();
          setProviders(provs);
        }}
      />

      {/* Model Selector Modal */}
      <ModelSelectorModal
        isOpen={isModelSelectorOpen}
        onClose={() => setIsModelSelectorOpen(false)}
        providers={providers}
        selectedModels={selectedModels}
        onToggleModel={handleToggleModel}
        onOpenSettings={() => {
          setIsModelSelectorOpen(false);
          setIsSettingsOpen(true);
        }}
      />

      {/* Merge Workbench Modal */}
      <MergeWorkbench
        isOpen={mergeState.isOpen}
        onClose={() => setMergeState((prev) => ({ ...prev, isOpen: false }))}
        threadId={activeThreadId || ''}
        turnId={mergeState.turnId}
        userPrompt={turns[turns.length - 1]?.userPrompt || ''}
        modelAKey={mergeState.modelAKey}
        modelBKey={mergeState.modelBKey}
        responseA={activeResponses[mergeState.modelAKey]}
        responseB={activeResponses[mergeState.modelBKey]}
        availableModels={selectedModels}
        onContinueFromMerge={handleContinueFromMerge}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        thread={activeThread}
        turns={turns}
        merges={merges}
      />

      {/* Merge History Modal */}
      <MergeHistoryModal
        isOpen={isMergeHistoryOpen}
        onClose={() => setIsMergeHistoryOpen(false)}
        merges={merges}
        onInjectDraft={handleContinueFromMerge}
      />

      {/* Prompt Templates Library Modal */}
      <PromptTemplatesModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        onSelectTemplate={handleSelectTemplate}
      />
    </div>
  );
}
