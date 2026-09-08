'use client';

import React from 'react';
import { AlignedPair, ChunkSegment } from '@/lib/types';
import { Plus, Split, Code2, Quote, TableProperties } from 'lucide-react';

/** Renders a chunk with type-aware visual styling */
const ChunkContent: React.FC<{ chunk: ChunkSegment }> = ({ chunk }) => {
  switch (chunk.type) {
    case 'code':
      return (
        <div className="rounded-lg bg-surface-secondary border border-border p-2.5 overflow-x-auto">
          <div className="flex items-center gap-1.5 text-[10px] text-text-muted font-mono mb-1.5">
            <Code2 className="h-3 w-3" />
            <span>CODE BLOCK</span>
          </div>
          <pre className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 whitespace-pre-wrap leading-relaxed">
            {chunk.content}
          </pre>
        </div>
      );
    case 'blockquote':
      return (
        <div className="border-l-2 border-brand-terracotta pl-3 py-1">
          <div className="flex items-center gap-1.5 text-[10px] text-text-muted font-mono mb-1">
            <Quote className="h-3 w-3" />
            <span>BLOCKQUOTE</span>
          </div>
          <div className="whitespace-pre-wrap text-text-secondary italic">{chunk.content}</div>
        </div>
      );
    case 'table':
      return (
        <div className="rounded-lg bg-surface-secondary border border-border p-2.5 overflow-x-auto">
          <div className="flex items-center gap-1.5 text-[10px] text-text-muted font-mono mb-1.5">
            <TableProperties className="h-3 w-3" />
            <span>TABLE</span>
          </div>
          <pre className="text-[11px] font-mono text-foreground whitespace-pre-wrap leading-relaxed">
            {chunk.content}
          </pre>
        </div>
      );
    case 'header':
      return (
        <div className="whitespace-pre-wrap font-semibold text-foreground">{chunk.content}</div>
      );
    default:
      return <div className="whitespace-pre-wrap text-foreground">{chunk.content}</div>;
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
      <div className="p-8 text-center text-xs text-text-muted">
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

        const badgeColor = isAgree
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
          : isParaphrase
          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
          : isConflict
          ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
          : 'bg-surface-secondary text-text-secondary border-border';

        const badgeLabel = isAgree
          ? `Consensus (${Math.round(pair.score * 100)}%)`
          : isParaphrase
          ? `Paraphrase (${Math.round(pair.score * 100)}%)`
          : isConflict
          ? `Divergence (${Math.round(pair.score * 100)}%)`
          : isUniqueLeft
          ? `Unique to ${modelALabel}`
          : `Unique to ${modelBLabel}`;

        return (
          <div
            key={pair.id || idx}
            className="rounded-xl bg-surface border border-border p-3.5 shadow-sm space-y-3 transition-all hover:border-border-strong"
          >
            {/* Header / Badges */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium border ${badgeColor}`}>
                  {badgeLabel}
                </span>
              </div>

              {/* Per-Hunk Actions */}
              <div className="flex items-center gap-1.5 text-xs">
                {pair.leftChunk && (
                  <button
                    onClick={() => onAcceptLeft(pair.leftChunk!.content)}
                    className="flex items-center gap-1 rounded-lg bg-surface-secondary hover:bg-surface-hover border border-border text-foreground px-2.5 py-1 text-[11px] font-medium transition-colors shadow-sm"
                    title="Accept A"
                  >
                    <Plus className="h-3 w-3 text-text-muted" /> Accept A
                  </button>
                )}

                {pair.rightChunk && (
                  <button
                    onClick={() => onAcceptRight(pair.rightChunk!.content)}
                    className="flex items-center gap-1 rounded-lg bg-surface-secondary hover:bg-surface-hover border border-border text-foreground px-2.5 py-1 text-[11px] font-medium transition-colors shadow-sm"
                    title="Accept B"
                  >
                    <Plus className="h-3 w-3 text-text-muted" /> Accept B
                  </button>
                )}

                {pair.leftChunk && pair.rightChunk && (
                  <button
                    onClick={() => onAcceptBoth(pair.leftChunk!.content, pair.rightChunk!.content)}
                    className="flex items-center gap-1 rounded-lg bg-surface-secondary hover:bg-surface-hover border border-border text-foreground px-2.5 py-1 text-[11px] font-medium transition-colors shadow-sm"
                    title="Accept Both (A + B)"
                  >
                    <Split className="h-3 w-3 text-brand-terracotta" /> Accept Both
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
                    ? 'bg-surface-secondary/40 border-border text-foreground'
                    : 'bg-surface-secondary/20 border-dashed border-border text-text-muted italic flex items-center justify-center'
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
                    ? 'bg-surface-secondary/40 border-border text-foreground'
                    : 'bg-surface-secondary/20 border-dashed border-border text-text-muted italic flex items-center justify-center'
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
