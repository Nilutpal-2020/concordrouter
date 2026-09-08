'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ModelResponse, ChunkSegment, AlignmentResult, TargetModel, StreamChunk } from '@/lib/types';
import { segmentResponseText, saveMergeRecord, fetchSemanticAlignment, streamSynthesis } from '@/lib/api';
import { AlignmentDiffView } from './AlignmentDiffView';
import { SimilarityHeatmap } from './SimilarityHeatmap';
import { MarkdownRenderer } from './MarkdownRenderer';
import {
  GitMerge,
  X,
  Sparkles,
  Copy,
  Send,
  Plus,
  Trash2,
  Layers,
  Grid,
  Bot,
  Loader2,
  Check,
  Split,
  AlertTriangle,
  Code2,
  Quote,
  TableProperties,
  List,
} from 'lucide-react';

/** Returns icon, label, and extra CSS for a segment type */
const getSegmentMeta = (type: ChunkSegment['type']) => {
  switch (type) {
    case 'code':
      return {
        icon: Code2,
        label: 'Code',
        extraClass: 'bg-surface-secondary border-border',
        textClass: 'font-mono text-emerald-600 dark:text-emerald-400 text-[11px]',
      };
    case 'blockquote':
      return {
        icon: Quote,
        label: 'Quote',
        extraClass: 'border-l-2 border-brand-terracotta',
        textClass: '',
      };
    case 'table':
      return {
        icon: TableProperties,
        label: 'Table',
        extraClass: 'bg-surface-secondary border-border',
        textClass: 'font-mono text-[11px]',
      };
    case 'header':
      return { icon: Layers, label: 'Heading', extraClass: '', textClass: 'font-semibold text-foreground' };
    case 'bullet':
    case 'list_group':
      return { icon: List, label: 'List Item', extraClass: '', textClass: '' };
    case 'sentence':
      return { icon: null, label: 'Sentence', extraClass: '', textClass: '' };
    default:
      return { icon: null, label: 'Paragraph', extraClass: '', textClass: '' };
  }
};

interface MergeWorkbenchProps {
  isOpen: boolean;
  onClose: () => void;
  threadId: string;
  turnId: string;
  userPrompt?: string;
  modelAKey: string;
  modelBKey: string;
  responseA: ModelResponse;
  responseB: ModelResponse;
  availableModels?: TargetModel[];
  onContinueFromMerge: (mergedText: string) => void;
}

export const MergeWorkbench: React.FC<MergeWorkbenchProps> = ({
  isOpen,
  onClose,
  threadId,
  turnId,
  userPrompt = '',
  modelAKey,
  modelBKey,
  responseA,
  responseB,
  availableModels = [{ providerId: 'mock', model: 'mock-concise' }],
  onContinueFromMerge,
}) => {
  const [activeTab, setActiveTab] = useState<'cherrypick' | 'semantic' | 'synthesis'>('semantic');
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);

  // Data states
  const [segmentsA, setSegmentsA] = useState<ChunkSegment[]>([]);
  const [segmentsB, setSegmentsB] = useState<ChunkSegment[]>([]);
  const [alignmentResult, setAlignmentResult] = useState<AlignmentResult | null>(null);
  const [pickedSegments, setPickedSegments] = useState<ChunkSegment[]>([]);
  const [draftText, setDraftText] = useState<string>('');

  // AI Synthesis state (Phase 6)
  const [synthesisModel, setSynthesisModel] = useState<TargetModel>(
    availableModels[0] || { providerId: 'mock', model: 'mock-concise' }
  );
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [isAISynthesized, setIsAISynthesized] = useState<boolean>(false);
  const abortSynthesisRef = useRef<(() => void) | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [draftViewMode, setDraftViewMode] = useState<'edit' | 'preview'>('edit');

  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    setIsAISynthesized(false);

    const loadData = async () => {
      try {
        const [segsA, segsB] = await Promise.all([
          segmentResponseText(responseA?.content || '', modelAKey),
          segmentResponseText(responseB?.content || '', modelBKey),
        ]);

        setSegmentsA(segsA);
        setSegmentsB(segsB);

        try {
          const alignRes = await fetchSemanticAlignment(
            modelAKey,
            responseA?.content || '',
            modelBKey,
            responseB?.content || ''
          );
          setAlignmentResult(alignRes);
        } catch (alignErr) {
          console.error('Failed to compute semantic alignment:', alignErr);
        }
      } catch (err) {
        console.error('Failed to segment responses:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isOpen, responseA?.content, responseB?.content]);

  if (!isOpen) return null;

  const handleAddSegment = (seg: ChunkSegment) => {
    setPickedSegments((prev) => [...prev, seg]);
    setDraftText((prev) => (prev ? `${prev}\n\n${seg.content}` : seg.content));
    setIsAISynthesized(false);
  };

  const handleAcceptAllA = () => {
    setPickedSegments((prev) => [...prev, ...segmentsA]);
    const added = segmentsA.map((s) => s.content).join('\n\n');
    setDraftText((prev) => (prev ? `${prev}\n\n${added}` : added));
    setIsAISynthesized(false);
  };

  const handleAcceptAllB = () => {
    setPickedSegments((prev) => [...prev, ...segmentsB]);
    const added = segmentsB.map((s) => s.content).join('\n\n');
    setDraftText((prev) => (prev ? `${prev}\n\n${added}` : added));
    setIsAISynthesized(false);
  };

  const handleAppendText = (content: string) => {
    setDraftText((prev) => (prev ? `${prev}\n\n${content}` : content));
    setIsAISynthesized(false);
  };

  const handleAcceptBoth = (left: string, right: string) => {
    const combined = `${left}\n\n${right}`;
    setDraftText((prev) => (prev ? `${prev}\n\n${combined}` : combined));
    setIsAISynthesized(false);
  };

  const handleGenerateSynthesis = async () => {
    setIsSynthesizing(true);
    setIsAISynthesized(true);
    setDraftText('');

    try {
      const abortFn = await streamSynthesis(
        threadId,
        userPrompt,
        modelAKey,
        responseA?.content || '',
        modelBKey,
        responseB?.content || '',
        synthesisModel,
        (chunk: StreamChunk) => {
          if (chunk.delta) {
            setDraftText((prev) => prev + chunk.delta);
          }
          if (chunk.fullText) {
            setDraftText(chunk.fullText);
          }
        },
        (err) => {
          console.error('Synthesis error:', err);
          setIsSynthesizing(false);
        },
        () => {
          setIsSynthesizing(false);
        }
      );
      abortSynthesisRef.current = abortFn;
    } catch (err) {
      console.error('Failed to trigger synthesis:', err);
      setIsSynthesizing(false);
    }
  };

  const handleSaveAndContinue = async () => {
    if (!draftText.trim()) return;

    try {
      const strategy: 'ai_synthesis' | 'diff_structured' | 'manual_cherrypick' = isAISynthesized
        ? 'ai_synthesis'
        : activeTab === 'semantic'
        ? 'diff_structured'
        : 'manual_cherrypick';

      await saveMergeRecord(threadId, {
        turnId,
        sourceModels: [modelAKey, modelBKey],
        mergedText: draftText,
        strategy,
        segments: pickedSegments,
      });
      onContinueFromMerge(draftText);
      onClose();
    } catch (e) {
      console.error('Failed to save merge record', e);
      onContinueFromMerge(draftText);
      onClose();
    }
  };

  const handleCopyDraft = () => {
    navigator.clipboard.writeText(draftText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-[1360px] h-[92vh] rounded-2xl bg-surface border border-border shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3 bg-surface-secondary/40">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface border border-border text-foreground">
              <GitMerge className="h-4 w-4 text-brand-terracotta" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                Response Reconciliation Workbench
                {alignmentResult && (
                  <span className="text-[10px] bg-surface text-text-secondary border border-border rounded-full px-2 py-0.2 font-mono">
                    {Math.round(alignmentResult.overallAgreement * 100)}% Consensus
                  </span>
                )}
              </h2>
              <p className="text-xs text-text-secondary">
                Comparing <span className="font-medium text-foreground">{modelAKey}</span> vs{' '}
                <span className="font-medium text-foreground">{modelBKey}</span>
              </p>
            </div>
          </div>

          {/* Mode Selector Tabs */}
          <div className="flex items-center gap-1 rounded-xl bg-surface-secondary p-0.5 border border-border text-xs">
            <button
              onClick={() => setActiveTab('semantic')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all ${
                activeTab === 'semantic'
                  ? 'bg-surface text-foreground shadow-sm'
                  : 'text-text-muted hover:text-foreground'
              }`}
            >
              <Split className="h-3.5 w-3.5" />
              <span>Semantic Diff</span>
            </button>

            <button
              onClick={() => setActiveTab('cherrypick')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all ${
                activeTab === 'cherrypick'
                  ? 'bg-surface text-foreground shadow-sm'
                  : 'text-text-muted hover:text-foreground'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Chunk Picker</span>
            </button>

            <button
              onClick={() => setActiveTab('synthesis')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all ${
                activeTab === 'synthesis'
                  ? 'bg-surface text-foreground shadow-sm'
                  : 'text-text-muted hover:text-foreground'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-brand-terracotta" />
              <span>AI Synthesis</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Main 2-Pane Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-border">
          {/* Left / Center Area: Comparison Mode Content */}
          <div className="lg:col-span-7 flex flex-col h-full bg-surface-secondary/20 overflow-hidden">
            {isLoading ? (
              <div className="flex flex-1 items-center justify-center text-text-muted gap-2 text-xs">
                <Loader2 className="h-4 w-4 animate-spin text-foreground" />
                <span>Computing sequence alignment & similarity matrix...</span>
              </div>
            ) : activeTab === 'semantic' ? (
              /* Phase 5: Semantic Diff View + Heatmap Toggle */
              <div className="flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-4 py-2 bg-surface-secondary/40">
                  <span className="text-xs font-medium text-text-secondary">
                    Aligned Hunks
                  </span>
                  <button
                    onClick={() => setShowHeatmap(!showHeatmap)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                      showHeatmap
                        ? 'bg-surface text-foreground border-border shadow-sm'
                        : 'bg-surface-secondary text-text-muted border-border hover:text-foreground'
                    }`}
                  >
                    <Grid className="h-3.5 w-3.5" />
                    <span>{showHeatmap ? 'Hide Heatmap' : 'Show Matrix Heatmap'}</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {showHeatmap && alignmentResult && (
                    <div className="border-b border-border bg-surface-secondary/30">
                      <SimilarityHeatmap
                        matrix={alignmentResult.similarityMatrix}
                        leftSegments={alignmentResult.leftSegments}
                        rightSegments={alignmentResult.rightSegments}
                        modelALabel={modelAKey}
                        modelBLabel={modelBKey}
                      />
                    </div>
                  )}

                  <AlignmentDiffView
                    pairs={alignmentResult?.pairs || []}
                    modelALabel={modelAKey}
                    modelBLabel={modelBKey}
                    onAcceptLeft={handleAppendText}
                    onAcceptRight={handleAppendText}
                    onAcceptBoth={handleAcceptBoth}
                  />
                </div>
              </div>
            ) : activeTab === 'cherrypick' ? (
              /* Phase 3: Manual Cherry-Pick 2-Column Split */
              <div className="grid grid-cols-2 flex-1 overflow-hidden divide-x divide-border">
                {/* Model A Column */}
                <div className="flex flex-col h-full overflow-hidden">
                  <div className="flex items-center justify-between px-3.5 py-2 border-b border-border bg-surface-secondary/40">
                    <span className="text-xs font-medium text-foreground truncate">{modelAKey}</span>
                    <button
                      onClick={handleAcceptAllA}
                      className="text-[11px] text-text-secondary hover:text-foreground font-medium"
                    >
                      Accept All →
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {segmentsA.map((seg) => {
                      const meta = getSegmentMeta(seg.type);
                      const SegIcon = meta.icon;
                      return (
                        <div
                          key={seg.id}
                          onClick={() => handleAddSegment(seg)}
                          className={`group relative rounded-xl bg-surface hover:bg-surface-hover border border-border hover:border-border-strong p-2.5 text-xs text-foreground cursor-pointer transition-all shadow-sm ${meta.extraClass}`}
                        >
                          <div className="flex items-center justify-between text-[10px] text-text-muted font-mono mb-1">
                            <span className="flex items-center gap-1 uppercase">
                              {SegIcon && <SegIcon className="h-3 w-3" />}
                              {meta.label}
                            </span>
                            <span className="opacity-0 group-hover:opacity-100 text-foreground flex items-center gap-1 font-sans transition-opacity">
                              <Plus className="h-3 w-3" /> Pick
                            </span>
                          </div>
                          <div className={`whitespace-pre-wrap ${meta.textClass}`}>{seg.content}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Model B Column */}
                <div className="flex flex-col h-full overflow-hidden">
                  <div className="flex items-center justify-between px-3.5 py-2 border-b border-border bg-surface-secondary/40">
                    <span className="text-xs font-medium text-foreground truncate">{modelBKey}</span>
                    <button
                      onClick={handleAcceptAllB}
                      className="text-[11px] text-text-secondary hover:text-foreground font-medium"
                    >
                      Accept All →
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {segmentsB.map((seg) => {
                      const meta = getSegmentMeta(seg.type);
                      const SegIcon = meta.icon;
                      return (
                        <div
                          key={seg.id}
                          onClick={() => handleAddSegment(seg)}
                          className={`group relative rounded-xl bg-surface hover:bg-surface-hover border border-border hover:border-border-strong p-2.5 text-xs text-foreground cursor-pointer transition-all shadow-sm ${meta.extraClass}`}
                        >
                          <div className="flex items-center justify-between text-[10px] text-text-muted font-mono mb-1">
                            <span className="flex items-center gap-1 uppercase">
                              {SegIcon && <SegIcon className="h-3 w-3" />}
                              {meta.label}
                            </span>
                            <span className="opacity-0 group-hover:opacity-100 text-foreground flex items-center gap-1 font-sans transition-opacity">
                              <Plus className="h-3 w-3" /> Pick
                            </span>
                          </div>
                          <div className={`whitespace-pre-wrap ${meta.textClass}`}>{seg.content}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* Phase 6: AI-Assisted Synthesis Hub */
              <div className="flex flex-col flex-1 p-6 space-y-5 overflow-y-auto">
                <div className="rounded-2xl bg-surface border border-border p-5 space-y-3 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Sparkles className="h-4 w-4 text-brand-terracotta" />
                    <span>LLM Synthesis Engine</span>
                  </div>
                  <p className="text-xs leading-relaxed text-text-secondary">
                    Sends both responses with reconciliation instructions to an LLM to produce a cohesive, de-duplicated answer draft.
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-muted">Synthesize using:</span>
                      <select
                        value={`${synthesisModel.providerId}:${synthesisModel.model}`}
                        onChange={(e) => {
                          const [pId, mod] = e.target.value.split(':');
                          setSynthesisModel({ providerId: pId, model: mod });
                        }}
                        className="rounded-xl bg-surface-secondary border border-border px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-border-strong font-mono"
                      >
                        <option value="mock:mock-concise">Mock Fast (Simulated)</option>
                        <option value="mock:mock-creative">Mock Creative (Simulated)</option>
                        <option value="anthropic:claude-3-7-sonnet-latest">Claude 3.7 Sonnet</option>
                        <option value="openai:gpt-4o">GPT-4o</option>
                        <option value="gemini:gemini-2.5-flash">Gemini 2.5 Flash</option>
                        <option value="ollama:llama3.2">Ollama Llama 3.2</option>
                      </select>
                    </div>

                    <button
                      onClick={handleGenerateSynthesis}
                      disabled={isSynthesizing}
                      className="flex items-center gap-2 rounded-full bg-foreground text-background hover:opacity-90 disabled:opacity-50 px-4 py-2 text-xs font-medium transition-all active:scale-[0.98] shadow-sm"
                    >
                      {isSynthesizing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Bot className="h-3.5 w-3.5" />
                      )}
                      <span>{isSynthesizing ? 'Synthesizing...' : 'Generate Synthesis Draft'}</span>
                    </button>
                  </div>
                </div>

                <div className="rounded-xl bg-surface border border-border p-4 text-xs text-text-secondary space-y-1.5">
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span>Trust Level Distinction</span>
                  </div>
                  <p className="leading-relaxed">
                    Unlike deterministic alignment diffs which are extracted verbatim from source models, AI Synthesis is a generated draft. It remains 100% user-editable before saving.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Area: Unified Reconciled Draft Editor */}
          <div className="lg:col-span-5 flex flex-col h-full bg-surface overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface-secondary/30">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs font-medium text-foreground">Reconciled Merged Draft</span>
                {isAISynthesized && (
                  <span className="rounded-full bg-surface-secondary text-text-secondary border border-border px-2 py-0.2 text-[9px] font-mono">
                    AI Synthesis
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center rounded-lg bg-surface-secondary p-0.5 text-xs border border-border mr-1">
                  <button
                    onClick={() => setDraftViewMode('edit')}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                      draftViewMode === 'edit'
                        ? 'bg-surface text-foreground font-semibold shadow-sm'
                        : 'text-text-muted hover:text-foreground'
                    }`}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDraftViewMode('preview')}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                      draftViewMode === 'preview'
                        ? 'bg-surface text-foreground font-semibold shadow-sm'
                        : 'text-text-muted hover:text-foreground'
                    }`}
                  >
                    Preview
                  </button>
                </div>
                <button
                  onClick={handleCopyDraft}
                  disabled={!draftText}
                  className="rounded-lg p-1.5 text-text-muted hover:bg-surface-hover hover:text-foreground disabled:opacity-30 transition-colors"
                  title="Copy draft"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                {draftText && (
                  <button
                    onClick={() => {
                      setPickedSegments([]);
                      setDraftText('');
                      setIsAISynthesized(false);
                    }}
                    className="rounded-lg p-1.5 text-text-muted hover:bg-surface-hover hover:text-red-500 transition-colors"
                    title="Clear draft"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 flex flex-col p-4 space-y-2 overflow-hidden bg-background">
              {draftViewMode === 'edit' ? (
                <textarea
                  value={draftText}
                  onChange={(e) => {
                    setDraftText(e.target.value);
                    setIsAISynthesized(false);
                  }}
                  placeholder="Accepted chunks and synthesis drafts appear here for live editing..."
                  className="flex-1 w-full rounded-xl bg-surface border border-border p-4 text-xs sm:text-sm leading-relaxed text-foreground placeholder-text-muted focus:border-border-strong focus:outline-none resize-none font-sans"
                />
              ) : (
                <div className="flex-1 w-full rounded-xl bg-surface border border-border p-4 overflow-y-auto">
                  <MarkdownRenderer
                    content={draftText || '*Accepted chunks and synthesis drafts will render formatted markdown here.*'}
                  />
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-text-muted font-mono px-1">
                <span>{draftText ? draftText.split(/\s+/).filter(Boolean).length : 0} words</span>
                <span>
                  {isAISynthesized ? 'AI Synthesis Draft' : `${pickedSegments.length} cherry-picked chunks`}
                </span>
              </div>
            </div>

            {/* Footer Action */}
            <div className="border-t border-border px-4 py-3 bg-surface-secondary/40 flex items-center justify-between">
              <button
                onClick={onClose}
                className="rounded-full px-4 py-1.5 text-xs text-text-secondary hover:bg-surface-hover hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAndContinue}
                disabled={!draftText.trim()}
                className="flex items-center gap-1.5 rounded-full bg-foreground text-background hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 text-xs font-medium transition-all active:scale-[0.98] shadow-sm"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Save & Continue Next Turn</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
