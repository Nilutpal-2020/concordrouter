'use client';

import React, { useState } from 'react';
import { ChunkSegment } from '@/lib/types';
import { Grid, Sparkles, ArrowRight } from 'lucide-react';

interface SimilarityHeatmapProps {
  matrix: number[][];
  leftSegments: ChunkSegment[];
  rightSegments: ChunkSegment[];
  modelALabel: string;
  modelBLabel: string;
}

interface ColorTier {
  min: number;
  label: string;
  shortLabel: string;
  bgClass: string;
  dotColor: string;
}

const COLOR_TIERS: ColorTier[] = [
  {
    min: 0.85,
    label: 'High Consensus (≥85%)',
    shortLabel: 'Consensus',
    bgClass: 'bg-emerald-500 text-white font-bold shadow-sm ring-1 ring-emerald-400/30',
    dotColor: 'bg-emerald-500',
  },
  {
    min: 0.70,
    label: 'Strong Match (70–84%)',
    shortLabel: 'Strong',
    bgClass: 'bg-teal-500 text-white font-bold',
    dotColor: 'bg-teal-500',
  },
  {
    min: 0.50,
    label: 'Paraphrase (50–69%)',
    shortLabel: 'Paraphrase',
    bgClass: 'bg-amber-400 text-neutral-950 font-bold',
    dotColor: 'bg-amber-400',
  },
  {
    min: 0.30,
    label: 'Partial Match (30–49%)',
    shortLabel: 'Partial',
    bgClass: 'bg-orange-500 text-white font-medium',
    dotColor: 'bg-orange-500',
  },
  {
    min: 0.15,
    label: 'Low Match (15–29%)',
    shortLabel: 'Low',
    bgClass: 'bg-indigo-600/80 text-white font-medium',
    dotColor: 'bg-indigo-600/80',
  },
  {
    min: 0.00,
    label: 'Divergent (<15%)',
    shortLabel: 'Divergent',
    bgClass: 'bg-surface-secondary text-text-muted border border-border/80',
    dotColor: 'bg-surface-secondary border border-border',
  },
];

const getCellMeta = (score: number): ColorTier => {
  for (const tier of COLOR_TIERS) {
    if (score >= tier.min) return tier;
  }
  return COLOR_TIERS[COLOR_TIERS.length - 1];
};

export const SimilarityHeatmap: React.FC<SimilarityHeatmapProps> = ({
  matrix,
  leftSegments,
  rightSegments,
  modelALabel,
  modelBLabel,
}) => {
  const [hoveredCell, setHoveredCell] = useState<{
    i: number;
    j: number;
    score: number;
  } | null>(null);

  if (!matrix || matrix.length === 0 || !matrix[0] || matrix[0].length === 0) {
    return (
      <div className="p-6 text-center text-xs text-text-muted">
        Insufficient segments to render pairwise similarity matrix.
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-3.5 p-4 bg-surface-secondary/40 border-b border-border transition-colors">
      {/* Heatmap Header & Rich Color Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface border border-border text-brand-terracotta">
            <Grid className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <span>Pairwise Semantic Heatmap</span>
              <span className="text-[10px] font-mono font-normal text-text-muted">
                ({leftSegments.length} × {rightSegments.length} Matrix)
              </span>
            </h4>
          </div>
        </div>

        {/* Multi-Stop Chromatic Spectrum Legend */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-secondary bg-surface px-3 py-1.5 rounded-xl border border-border shadow-sm">
          {COLOR_TIERS.map((tier) => (
            <span key={tier.min} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-sm ${tier.dotColor}`} />
              <span className="text-[10px] font-medium">{tier.shortLabel}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Heatmap Table Matrix */}
      <div className="overflow-x-auto pb-1">
        <div className="inline-block min-w-full">
          <table className="border-collapse">
            <thead>
              <tr>
                <th className="p-1.5 text-[10px] text-text-muted font-mono text-left whitespace-nowrap pr-3">
                  <span className="text-brand-terracotta font-semibold">{modelALabel.slice(0, 10)}</span> ↓ /{' '}
                  <span className="text-brand-emerald font-semibold">{modelBLabel.slice(0, 10)}</span> →
                </th>
                {rightSegments.map((_, j) => (
                  <th
                    key={j}
                    className="p-1 text-[10px] text-text-muted font-mono text-center w-10 max-w-[40px]"
                  >
                    B{j + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leftSegments.map((segA, i) => (
                <tr key={i}>
                  <td className="p-1 text-[10px] text-text-muted font-mono pr-3 whitespace-nowrap">
                    A{i + 1}
                  </td>
                  {rightSegments.map((segB, j) => {
                    const score = matrix[i]?.[j] ?? 0;
                    const meta = getCellMeta(score);
                    const isHovered = hoveredCell?.i === i && hoveredCell?.j === j;

                    return (
                      <td
                        key={j}
                        onMouseEnter={() => setHoveredCell({ i, j, score })}
                        onMouseLeave={() => setHoveredCell(null)}
                        className={`h-9 w-10 text-center text-[11px] font-mono cursor-pointer rounded-md border border-background/30 transition-all select-none ${
                          meta.bgClass
                        } ${
                          isHovered
                            ? 'scale-125 z-30 shadow-lg ring-2 ring-foreground font-extrabold'
                            : 'hover:scale-110 hover:z-20 hover:shadow-md'
                        }`}
                        title={`A${i + 1} vs B${j + 1}: ${(score * 100).toFixed(1)}% match`}
                      >
                        {Math.round(score * 100)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hover Inspection Drawer with Color Pill */}
      {hoveredCell && (
        <div className="rounded-xl bg-surface border border-border p-3.5 text-xs text-foreground space-y-2.5 shadow-sm animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-[11px] font-mono text-text-secondary">
            <span className="flex items-center gap-1.5">
              <span className="font-semibold text-foreground">A{hoveredCell.i + 1}</span>
              <ArrowRight className="h-3 w-3 text-text-muted" />
              <span className="font-semibold text-foreground">B{hoveredCell.j + 1}</span>
            </span>

            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                  getCellMeta(hoveredCell.score).bgClass
                }`}
              >
                {getCellMeta(hoveredCell.score).label}
              </span>
              <span className="font-bold text-foreground bg-surface-secondary px-2 py-0.5 rounded-md border border-border">
                {(hoveredCell.score * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg bg-surface-secondary/50 border border-border p-2.5">
              <div className="flex items-center justify-between text-[10px] font-mono text-text-muted mb-1">
                <span className="font-semibold text-foreground">
                  Chunk A{hoveredCell.i + 1} ({modelALabel})
                </span>
                <span>{leftSegments[hoveredCell.i]?.content.split(/\s+/).filter(Boolean).length || 0} words</span>
              </div>
              <p className="line-clamp-3 text-text-secondary leading-relaxed">
                {leftSegments[hoveredCell.i]?.content}
              </p>
            </div>

            <div className="rounded-lg bg-surface-secondary/50 border border-border p-2.5">
              <div className="flex items-center justify-between text-[10px] font-mono text-text-muted mb-1">
                <span className="font-semibold text-foreground">
                  Chunk B{hoveredCell.j + 1} ({modelBLabel})
                </span>
                <span>{rightSegments[hoveredCell.j]?.content.split(/\s+/).filter(Boolean).length || 0} words</span>
              </div>
              <p className="line-clamp-3 text-text-secondary leading-relaxed">
                {rightSegments[hoveredCell.j]?.content}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
