'use client';

import React from 'react';
import { AlignedPair } from '@/lib/types';
import { Check, Plus, ArrowRight, GitCommit, Split, Sparkles, Code2, Quote, TableProperties } from 'lucide-react';
import { ChunkSegment } from '@/lib/types';

/** Renders a chunk with type-aware visual styling */
const ChunkContent: React.FC<{ chunk: ChunkSegment }> = ({ chunk }) => {
  switch (chunk.type) {
    case 'code':
      return (
        <div className="rounded-lg bg-black/60 border border-slate-700/50 p-2.5 overflow-x-auto">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono mb-1.5">
            <Code2 className="h-3 w-3" />
            <span>CODE BLOCK</span>
          </div>
          <pre className="text-[11px] font-mono text-emerald-300/90 whitespace-pre-wrap leading-relaxed">{chunk.content}</pre>
        </div>
      );
    case 'blockquote':
      return (
        <div className="border-l-2 border-amber-500/50 pl-3 py-1">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono mb-1">
            <Quote className="h-3 w-3" />
            <span>BLOCKQUOTE</span>
          </div>
          <div className="whitespace-pre-wrap text-slate-300 italic">{chunk.content}</div>
        </div>
      );
    case 'table':
      return (
        <div className="rounded-lg bg-slate-950/50 border border-slate-700/40 p-2.5 overflow-x-auto">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono mb-1.5">
            <TableProperties className="h-3 w-3" />
            <span>TABLE</span>
          </div>
          <pre className="text-[11px] font-mono text-slate-200 whitespace-pre-wrap leading-relaxed">{chunk.content}</pre>
        </div>
      );
    case 'header':
      return (
        <div className="whitespace-pre-wrap font-semibold text-white">{chunk.content}</div>
      );
    default:
      return (
        <div className="whitespace-pre-wrap">{chunk.content}</div>
      );
  }
};

interface AlignmentDiffViewProps {
  pairs: AlignedPair[];
  modelALabel: string;
  modelBLabel: string;
  onAcceptLeft: (content: string) => void;
  onAcceptRight: (content: string) => void;
  onAcceptBoth: (leftContent: string, rightContent: string) => void;
}

export const AlignmentDiffView: React.FC<AlignmentDiffViewProps> = ({
  pairs,
  modelALabel,
  modelBLabel,
  onAcceptLeft,
  onAcceptRight,
  onAcceptBoth,
}) => {
  if (pairs.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        No alignment pairs calculated.
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-3 p-4 overflow-y-auto max-h-full">
      {pairs.map((pair, idx) => {
        const isAgree = pair.relation === 'agree';
        const isParaphrase = pair.relation === 'paraphrase';
        const isConflict = pair.relation === 'conflict';
        const isUniqueLeft = pair.relation === 'unique_left';
        const isUniqueRight = pair.relation === 'unique_right';

        const badgeColor = isAgree
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          : isParaphrase
          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          : isConflict
          ? 'bg-red-500/10 text-red-400 border-red-500/30'
          : 'bg-slate-800 text-slate-400 border-slate-700';

        const badgeLabel = isAgree
          ? `Consensus (${Math.round(pair.score * 100)}%)`
          : isParaphrase
          ? `Paraphrase (${Math.round(pair.score * 100)}%)`
          : isConflict
          ? `Divergence / Conflict (${Math.round(pair.score * 100)}%)`
          : isUniqueLeft
          ? `Unique to ${modelALabel}`
          : `Unique to ${modelBLabel}`;

        return (
          <div
            key={pair.id || idx}
            className="rounded-2xl bg-slate-900/90 border border-slate-800/90 p-3.5 shadow-md space-y-3 transition-all hover:border-slate-700"
          >
            {/* Header / Badges */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${badgeColor}`}>
                  {badgeLabel}
                </span>
              </div>

              {/* Per-Hunk Actions */}
              <div className="flex items-center gap-1.5 text-xs">
                {pair.leftChunk && (
                  <button
                    onClick={() => onAcceptLeft(pair.leftChunk!.content)}
                    className="flex items-center gap-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 px-2.5 py-1 text-[11px] font-semibold transition-colors"
                    title="Accept A"
                  >
                    <Plus className="h-3 w-3" /> Accept A
                  </button>
                )}

                {pair.rightChunk && (
                  <button
                    onClick={() => onAcceptRight(pair.rightChunk!.content)}
                    className="flex items-center gap-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 px-2.5 py-1 text-[11px] font-semibold transition-colors"
                    title="Accept B"
                  >
                    <Plus className="h-3 w-3" /> Accept B
                  </button>
                )}

                {pair.leftChunk && pair.rightChunk && (
                  <button
                    onClick={() => onAcceptBoth(pair.leftChunk!.content, pair.rightChunk!.content)}
                    className="flex items-center gap-1 rounded-lg bg-[#181d28] hover:bg-[#202736] border border-white/[0.1] text-slate-200 px-2.5 py-1 text-[11px] font-semibold transition-colors"
                    title="Accept Both (A + B)"
                  >
                    <Split className="h-3 w-3 text-amber-400" /> Accept Both
                  </button>
                )}
              </div>
            </div>

            {/* Split Comparison Boxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-relaxed">
              {/* Left Side */}
              <div
                className={`rounded-xl p-3 border ${
                  pair.leftChunk
                    ? 'bg-[#0c0f15] border-white/[0.08] text-slate-200'
                    : 'bg-[#090b0e] border-dashed border-white/[0.06] text-slate-600 italic flex items-center justify-center'
                }`}
              >
                {pair.leftChunk ? (
                  <ChunkContent chunk={pair.leftChunk} />
                ) : (
                  <span>[No corresponding chunk in {modelALabel}]</span>
                )}
              </div>

              {/* Right Side */}
              <div
                className={`rounded-xl p-3 border ${
                  pair.rightChunk
                    ? 'bg-[#0c0f15] border-white/[0.08] text-slate-200'
                    : 'bg-[#090b0e] border-dashed border-white/[0.06] text-slate-600 italic flex items-center justify-center'
                }`}
              >
                {pair.rightChunk ? (
                  <ChunkContent chunk={pair.rightChunk} />
                ) : (
                  <span>[No corresponding chunk in {modelBLabel}]</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
