'use client';

import React, { useState } from 'react';
import { ChunkSegment } from '@/lib/types';
import { Grid } from 'lucide-react';

interface SimilarityHeatmapProps {
  matrix: number[][];
  leftSegments: ChunkSegment[];
  rightSegments: ChunkSegment[];
  modelALabel: string;
  modelBLabel: string;
}

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

  // Color generator for cosine similarity (0.0 to 1.0)
  const getCellColor = (score: number) => {
    if (score >= 0.8) return 'bg-emerald-500 text-white font-semibold';
    if (score >= 0.6) return 'bg-amber-400 text-black font-semibold';
    if (score >= 0.4) return 'bg-amber-600/70 text-white font-medium';
    if (score >= 0.2) return 'bg-surface-secondary text-text-secondary';
    return 'bg-surface-secondary/40 text-text-muted';
  };

  return (
    <div className="flex flex-col space-y-3.5 p-4 bg-surface-secondary/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Grid className="h-4 w-4 text-brand-terracotta" />
          <h4 className="text-xs font-semibold text-foreground">
            Pairwise Semantic Matrix
          </h4>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-text-secondary">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-emerald-500" /> High (≥80%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-amber-400" /> Match (40–79%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-surface-secondary border border-border" /> Divergent (&lt;40%)
          </span>
        </div>
      </div>

      {/* Matrix Grid */}
      <div className="overflow-x-auto pb-2">
        <div className="inline-block min-w-full">
          <table className="border-collapse">
            <thead>
              <tr>
                <th className="p-1.5 text-[10px] text-text-muted font-mono text-left">
                  {modelALabel.slice(0, 10)} ↓ / {modelBLabel.slice(0, 10)} →
                </th>
                {rightSegments.map((_, j) => (
                  <th
                    key={j}
                    className="p-1 text-[10px] text-text-muted font-mono text-center w-8 max-w-[32px]"
                  >
                    B{j + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leftSegments.map((segA, i) => (
                <tr key={i}>
                  <td className="p-1 text-[10px] text-text-muted font-mono pr-2">
                    A{i + 1}
                  </td>
                  {rightSegments.map((segB, j) => {
                    const score = matrix[i]?.[j] ?? 0;
                    return (
                      <td
                        key={j}
                        onMouseEnter={() => setHoveredCell({ i, j, score })}
                        onMouseLeave={() => setHoveredCell(null)}
                        className={`h-8 w-8 text-center text-[10px] font-mono cursor-pointer rounded-sm border border-border transition-transform hover:scale-110 hover:z-10 ${getCellColor(
                          score
                        )}`}
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

      {/* Hover Inspection Drawer */}
      {hoveredCell && (
        <div className="rounded-xl bg-surface border border-border p-3 text-xs text-foreground space-y-2 shadow-sm animate-in fade-in">
          <div className="flex items-center justify-between text-[11px] font-mono text-text-secondary">
            <span>
              Comparing: <strong>Chunk A{hoveredCell.i + 1}</strong> vs{' '}
              <strong>Chunk B{hoveredCell.j + 1}</strong>
            </span>
            <span className="font-semibold text-foreground bg-surface-secondary px-2 py-0.5 rounded border border-border">
              Score: {(hoveredCell.score * 100).toFixed(0)}%
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs pt-1">
            <div className="rounded-lg bg-surface-secondary/50 border border-border p-2.5">
              <span className="text-[10px] uppercase font-mono text-text-muted block mb-1">
                Chunk A{hoveredCell.i + 1}
              </span>
              <p className="line-clamp-3 text-text-secondary">{leftSegments[hoveredCell.i]?.content}</p>
            </div>
            <div className="rounded-lg bg-surface-secondary/50 border border-border p-2.5">
              <span className="text-[10px] uppercase font-mono text-text-muted block mb-1">
                Chunk B{hoveredCell.j + 1}
              </span>
              <p className="line-clamp-3 text-text-secondary">{rightSegments[hoveredCell.j]?.content}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
