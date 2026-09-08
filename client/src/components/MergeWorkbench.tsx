'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ModelResponse, ChunkSegment, AlignmentResult, TargetModel, StreamChunk } from '@/lib/types';
import { segmentResponseText, saveMergeRecord, fetchSemanticAlignment, streamSynthesis } from '@/lib/api';
import { AlignmentDiffView } from './AlignmentDiffView';
import { SimilarityHeatmap } from './SimilarityHeatmap';
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
      return { icon: Code2, label: 'Code', extraClass: 'bg-black/40 border-emerald-500/20', textClass: 'font-mono text-emerald-300/80 text-[11px]' };
    case 'blockquote':
      return { icon: Quote, label: 'Quote', extraClass: 'border-l-2 border-l-amber-500/40', textClass: '' };
    case 'table':
      return { icon: TableProperties, label: 'Table', extraClass: 'bg-slate-950/60 border-cyan-500/20', textClass: 'font-mono text-[11px]' };
    case 'header':
      return { icon: Layers, label: 'Heading', extraClass: '', textClass: 'font-semibold text-white' };
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
  const [synthesisModel, setSynthesisModel] = useState<TargetModel>(availableModels[0] || { providerId: 'mock', model: 'mock-concise' });
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [isAISynthesized, setIsAISynthesized] = useState<boolean>(false);
  const abortSynthesisRef = useRef<(() => void) | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    setIsAISynthesized(false);

    Promise.all([
      segmentResponseText(responseA?.content || '', modelAKey),
      segmentResponseText(responseB?.content || '', modelBKey),
      fetchSemanticAlignment(modelAKey, responseA?.content || '', modelBKey, responseB?.content || ''),
    ])
      .then(([segsA, segsB, alignment]) => {
        setSegmentsA(segsA);
        setSegmentsB(segsB);
        setAlignmentResult(alignment);
        setPickedSegments([]);
        setDraftText('');
      })
      .catch((err) => {
        console.error('Failed to load merge data:', err);
      })
      .finally(() => setIsLoading(false));
  }, [isOpen, modelAKey, modelBKey, responseA?.content, responseB?.content]);

  if (!isOpen) return null;

  // Chunk actions
  const handleAddSegment = (seg: ChunkSegment) => {
    setIsAISynthesized(false);
    const updated = [...pickedSegments, seg];
    setPickedSegments(updated);
    setDraftText((prev) => (prev ? prev + '\n\n' + seg.content : seg.content));
  };

  const handleAppendText = (content: string) => {
    setIsAISynthesized(false);
    setDraftText((prev) => (prev ? prev + '\n\n' + content : content));
  };

  const handleAcceptBoth = (textA: string, textB: string) => {
    setIsAISynthesized(false);
    setDraftText((prev) => (prev ? prev + '\n\n' + textA + '\n\n' + textB : textA + '\n\n' + textB));
  };

  const handleAcceptAllA = () => {
    setIsAISynthesized(false);
    setDraftText(responseA?.content || '');
    setPickedSegments(segmentsA);
  };

  const handleAcceptAllB = () => {
    setIsAISynthesized(false);
    setDraftText(responseB?.content || '');
    setPickedSegments(segmentsB);
  };

  // Phase 6: AI Synthesis Trigger
  const handleGenerateSynthesis = async () => {
    setIsSynthesizing(true);
    setDraftText('');
    setIsAISynthesized(true);

    const abortFn = await streamSynthesis(
      threadId,
      userPrompt || 'Synthesize both answers',
      modelAKey,
      responseA?.content || '',
      modelBKey,
      responseB?.content || '',
      synthesisModel,
      (chunk: StreamChunk) => {
        if (chunk.fullText) {
          setDraftText(chunk.fullText);
        } else if (chunk.delta) {
          setDraftText((prev) => prev + chunk.delta);
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
  };

  const handleSaveAndContinue = async () => {
    if (!draftText.trim()) return;

    const strategy = isAISynthesized
      ? 'ai_synthesis'
      : activeTab === 'semantic'
      ? 'diff_structured'
      : 'manual_cherrypick';

    try {
      await saveMergeRecord(threadId, {
        threadId,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-[1400px] h-[94vh] rounded-2xl bg-[#11141b] border border-white/[0.08] shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-6 py-3.5 bg-[#0e1117]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-600 to-amber-500 text-black font-bold shadow-md shadow-amber-500/20">
              <GitMerge className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Response Reconciliation Workbench
                {alignmentResult && (
                  <span className="text-[11px] bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-full px-2 py-0.2 font-mono">
                    {Math.round(alignmentResult.overallAgreement * 100)}% Consensus
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Comparing <span className="text-amber-400 font-semibold">{modelAKey}</span> vs{' '}
                <span className="text-emerald-400 font-semibold">{modelBKey}</span>
              </p>
            </div>
          </div>

          {/* Mode Selector Tabs */}
          <div className="flex items-center gap-1.5 rounded-xl bg-black/40 p-1 border border-white/[0.06] text-xs">
            <button
              onClick={() => setActiveTab('semantic')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'semantic'
                  ? 'bg-amber-500 text-black font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Split className="h-3.5 w-3.5" />
              <span>Semantic Diff</span>
            </button>

            <button
              onClick={() => setActiveTab('cherrypick')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'cherrypick'
                  ? 'bg-amber-500 text-black font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Chunk Picker</span>
            </button>

            <button
              onClick={() => setActiveTab('synthesis')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'synthesis'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI Synthesis</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Main 2-Pane Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-white/[0.06]">
          {/* Left / Center Area: Comparison Mode Content */}
          <div className="lg:col-span-7 flex flex-col h-full bg-black/20 overflow-hidden">
            {isLoading ? (
              <div className="flex flex-1 items-center justify-center text-slate-500 gap-2 text-xs">
                <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                <span>Computing sequence alignment & similarity matrix...</span>
              </div>
            ) : activeTab === 'semantic' ? (
              /* Phase 5: Semantic Diff View + Heatmap Toggle */
              <div className="flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5 bg-slate-950/80">
                  <span className="text-xs font-semibold text-slate-300">
                    Needleman-Wunsch Aligned Hunks
                  </span>
                  <button
                    onClick={() => setShowHeatmap(!showHeatmap)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                      showHeatmap
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <Grid className="h-3.5 w-3.5" />
                    <span>{showHeatmap ? 'Hide Heatmap' : 'Show Matrix Heatmap'}</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {showHeatmap && alignmentResult && (
                    <div className="border-b border-slate-800 bg-slate-950/90">
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
              <div className="grid grid-cols-2 flex-1 overflow-hidden divide-x divide-slate-800">
                {/* Model A Column */}
                <div className="flex flex-col h-full overflow-hidden">
                  <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-800 bg-slate-950/80">
                    <span className="text-xs font-semibold text-cyan-400 truncate">{modelAKey}</span>
                    <button
                      onClick={handleAcceptAllA}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium"
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
                          className={`group relative rounded-xl bg-slate-900/80 hover:bg-cyan-950/30 border border-slate-800 hover:border-cyan-500/40 p-2.5 text-xs text-slate-300 cursor-pointer transition-all ${meta.extraClass}`}
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mb-1">
                            <span className="flex items-center gap-1 uppercase">
                              {SegIcon && <SegIcon className="h-3 w-3" />}
                              {meta.label}
                            </span>
                            <span className="opacity-0 group-hover:opacity-100 text-cyan-400 flex items-center gap-1 font-sans transition-opacity">
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
                  <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-800 bg-slate-950/80">
                    <span className="text-xs font-semibold text-purple-400 truncate">{modelBKey}</span>
                    <button
                      onClick={handleAcceptAllB}
                      className="text-[11px] text-purple-400 hover:text-purple-300 font-medium"
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
                          className={`group relative rounded-xl bg-slate-900/80 hover:bg-purple-950/30 border border-slate-800 hover:border-purple-500/40 p-2.5 text-xs text-slate-300 cursor-pointer transition-all ${meta.extraClass}`}
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mb-1">
                            <span className="flex items-center gap-1 uppercase">
                              {SegIcon && <SegIcon className="h-3 w-3" />}
                              {meta.label}
                            </span>
                            <span className="opacity-0 group-hover:opacity-100 text-purple-400 flex items-center gap-1 font-sans transition-opacity">
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
                <div className="rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-slate-900 border border-purple-500/30 p-5 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Sparkles className="h-4 w-4 text-amber-300" />
                    <span>LLM Synthesis Engine</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-300">
                    Sends both full responses along with explicit reconciliation guidelines to an LLM to produce a cohesive, de-duplicated draft.
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Synthesize using:</span>
                      <select
                        value={`${synthesisModel.providerId}:${synthesisModel.model}`}
                        onChange={(e) => {
                          const [pId, mod] = e.target.value.split(':');
                          setSynthesisModel({ providerId: pId, model: mod });
                        }}
                        className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
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
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-purple-600/30 transition-all active:scale-[0.98]"
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

                <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-4 text-xs text-slate-400 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-slate-300">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <span>Trust Level Distinction (§4)</span>
                  </div>
                  <p>
                    Unlike deterministic alignment diffs which are mechanically extracted from source chunks, AI Synthesis is a freshly generated draft. It will be badged as such and remains 100% user-editable.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Area: Unified Reconciled Draft Editor */}
          <div className="lg:col-span-5 flex flex-col h-full bg-slate-900 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/80">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-semibold text-white">Reconciled Merged Draft</span>
                {isAISynthesized && (
                  <span className="rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30 px-2 py-0.2 text-[9px] font-mono">
                    AI Synthesis
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyDraft}
                  disabled={!draftText}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-30 transition-colors"
                  title="Copy draft"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                {draftText && (
                  <button
                    onClick={() => {
                      setPickedSegments([]);
                      setDraftText('');
                      setIsAISynthesized(false);
                    }}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors"
                    title="Clear draft"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 flex flex-col p-4 space-y-3 overflow-hidden">
              <textarea
                value={draftText}
                onChange={(e) => {
                  setDraftText(e.target.value);
                  setIsAISynthesized(false);
                }}
                placeholder="Accepted chunks and synthesis drafts appear here for live editing..."
                className="flex-1 w-full rounded-xl bg-slate-950 border border-slate-800 p-4 text-xs sm:text-sm leading-relaxed text-slate-100 placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none font-sans"
              />

              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono px-1">
                <span>{draftText ? draftText.split(/\s+/).filter(Boolean).length : 0} words</span>
                <span>
                  {isAISynthesized ? 'AI Synthesis Draft' : `${pickedSegments.length} cherry-picked chunks`}
                </span>
              </div>
            </div>

            {/* Footer Action */}
            <div className="border-t border-slate-800 px-4 py-3 bg-slate-950/80 flex items-center justify-between">
              <button
                onClick={onClose}
                className="rounded-xl px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAndContinue}
                disabled={!draftText.trim()}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-600/30 transition-all active:scale-[0.98]"
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
