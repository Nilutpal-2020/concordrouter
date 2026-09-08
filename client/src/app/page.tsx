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

import { Send, Sparkles, Layers, StopCircle, BookOpen, Download, History } from 'lucide-react';

export default function ArenaPage() {
  const [currentView, setCurrentView] = useState<AppView>('arena');
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeThreadTitle, setActiveThreadTitle] = useState<string>('New Arena Session');
  const [turns, setTurns] = useState<MessageTurn[]>([]);
  const [merges, setMerges] = useState<MergeRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Target Models selected for fan-out (Default: 2 mock models or connected providers)
  const [selectedModels, setSelectedModels] = useState<TargetModel[]>([
    { providerId: 'mock', model: 'mock-concise' },
    { providerId: 'mock', model: 'mock-creative' },
  ]);

  const [promptInput, setPromptInput] = useState<string>('');
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
      const newTh = await createThread('New Arena Session');
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

    let currentThreadId = activeThreadId;
    if (!currentThreadId) {
      const newTh = await createThread(currentPrompt.slice(0, 30) + '...');
      currentThreadId = newTh.id;
      setActiveThread(newTh);
      setActiveThreadId(currentThreadId);
      setActiveThreadTitle(newTh.title);
      setThreads((prev) => [newTh, ...prev]);
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
      },
      () => {
        setIsStreaming(false);
        if (currentThreadId) {
          handleSelectThread(currentThreadId);
        }
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
      },
      () => {
        setIsStreaming(false);
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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#06080d] text-slate-100">
      {/* Top Universal Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={(v) => setCurrentView(v)}
        selectedModels={selectedModels}
        providers={providers}
        onOpenModelSelector={() => setIsModelSelectorOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onNewChat={handleNewChat}
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
          <div className="flex flex-1 overflow-hidden">
            {/* Left Sidebar */}
            <Sidebar
              threads={threads}
              activeThreadId={activeThreadId}
              providers={providers}
              searchQuery={searchQuery}
              onSearchChange={handleSearch}
              onSelectThread={handleSelectThread}
              onNewThread={handleNewChat}
              onDeleteThread={handleDeleteThread}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />

            {/* Arena Stage */}
            <main className="flex flex-1 flex-col overflow-hidden">
              {/* Secondary Sub-Header */}
              <div className="flex items-center justify-between px-6 py-2.5 border-b border-white/[0.06] bg-slate-950/40 text-xs text-slate-400">
                <div className="flex items-center gap-2 truncate">
                  <span className="font-semibold text-slate-200 truncate">{activeThreadTitle}</span>
                  {merges.length > 0 && (
                    <span className="rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.2 text-[10px] font-mono">
                      {merges.length} {merges.length === 1 ? 'merge' : 'merges'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsTemplatesOpen(true)}
                    className="flex items-center gap-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-indigo-300 border border-indigo-500/20 transition-colors"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Templates</span>
                  </button>

                  {merges.length > 0 && (
                    <button
                      onClick={() => setIsMergeHistoryOpen(true)}
                      className="flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-emerald-300 border border-emerald-500/20 transition-colors"
                    >
                      <History className="h-3 w-3" />
                      <span>Merge History</span>
                    </button>
                  )}

                  <button
                    onClick={() => setIsExportOpen(true)}
                    className="flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-300 border border-white/[0.08] transition-colors"
                  >
                    <Download className="h-3 w-3" />
                    <span>Export</span>
                  </button>
                </div>
              </div>

              {/* Responses Arena Canvas */}
              <div className="flex-1 overflow-y-auto p-4 lg:p-6">
                <div className="mx-auto max-w-7xl h-full flex flex-col">
                  <ArenaPanes
                    prompt={turns[turns.length - 1]?.userPrompt || promptInput}
                    selectedModels={selectedModels}
                    responses={activeResponses}
                    isStreaming={isStreaming}
                    onRetryPane={handleRetryPane}
                    onOpenMerge={handleOpenMerge}
                  />
                </div>
              </div>

              {/* Bottom Floating Prompt Composer */}
              <div className="glass-header border-t border-white/[0.08] p-4 lg:px-6">
                <div className="mx-auto max-w-4xl">
                  <form onSubmit={handleSubmit} className="relative flex items-center">
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
                      rows={1}
                      placeholder={`Ask ${selectedModels.length} models simultaneously... (Enter to fan-out, Shift+Enter for newline)`}
                      className="w-full rounded-2xl bg-slate-900/90 border border-white/[0.1] pl-4 pr-28 py-3.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-xl resize-none font-sans"
                    />

                    <div className="absolute right-2.5 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsTemplatesOpen(true)}
                        className="p-1.5 text-slate-400 hover:text-indigo-300 transition-colors"
                        title="Browse prompt templates"
                      >
                        <Sparkles className="h-4 w-4 text-indigo-400" />
                      </button>

                      {isStreaming ? (
                        <button
                          type="button"
                          onClick={handleStopStream}
                          className="flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-500 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-red-600/30 transition-all"
                        >
                          <StopCircle className="h-3.5 w-3.5" />
                          <span>Stop</span>
                        </button>
                      ) : (
                        <button
                          type="submit"
                          disabled={!promptInput.trim()}
                          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition-all active:scale-[0.98]"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Fan Out</span>
                        </button>
                      )}
                    </div>
                  </form>
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
