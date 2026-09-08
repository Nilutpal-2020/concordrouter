'use client';

import React, { useState } from 'react';
import { ChunkSegment } from '@/lib/types';
import { Grid, Info } from 'lucide-react';

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
      <div className="p-6 text-center text-xs text-slate-500">
        Insufficient segments to render pairwise similarity matrix.
      </div>
    );
  }

  // Color generator for cosine similarity (0.0 to 1.0)
  const getCellColor = (score: number) => {
    if (score >= 0.8) return 'bg-emerald-500 text-emerald-950';
    if (score >= 0.6) return 'bg-teal-500 text-teal-950';
    if (score >= 0.4) return 'bg-amber-500 text-amber-950';
    if (score >= 0.2) return 'bg-blue-600/40 text-blue-200';
    return 'bg-slate-900 text-slate-600';
  };

  return (
    <div className="flex flex-col space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Grid className="h-4 w-4 text-cyan-400" />
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            Pairwise Semantic Matrix
          </h4>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> High Match (≥80%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> Paraphrase (40-79%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-slate-900 border border-slate-800" /> Distinct (&lt;40%)
          </span>
        </div>
      </div>

      {/* Matrix Grid */}
      <div className="overflow-x-auto pb-2">
        <div className="inline-block min-w-full">
          <table className="border-collapse">
            <thead>
              <tr>
                <th className="p-1.5 text-[10px] text-slate-500 font-mono text-left">
                  {modelALabel.slice(0, 10)} ↓ / {modelBLabel.slice(0, 10)} →
                </th>
                {rightSegments.map((_, j) => (
                  <th
                    key={j}
                    className="p-1 text-[10px] text-slate-400 font-mono text-center w-9 max-w-[36px]"
                  >
                    B{j + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leftSegments.map((segA, i) => (
                <tr key={i}>
                  <td className="p-1 text-[10px] text-slate-400 font-mono pr-2">
                    A{i + 1}
                  </td>
                  {rightSegments.map((segB, j) => {
                    const score = matrix[i]?.[j] ?? 0;
                    return (
                      <td
                        key={j}
                        onMouseEnter={() => setHoveredCell({ i, j, score })}
                        onMouseLeave={() => setHoveredCell(null)}
                        className={`h-9 w-9 text-center text-[10px] font-mono font-bold cursor-pointer rounded-sm border border-slate-950 transition-transform hover:scale-110 hover:z-10 ${getCellColor(
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
        <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3.5 text-xs text-slate-300 space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>
              Comparing: <strong className="text-cyan-400">Chunk A{hoveredCell.i + 1}</strong> vs{' '}
              <strong className="text-purple-400">Chunk B{hoveredCell.j + 1}</strong>
            </span>
            <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
              Score: {(hoveredCell.score * 100).toFixed(0)}%
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
            <div className="rounded-lg bg-cyan-950/20 border border-cyan-500/20 p-2.5">
              <span className="text-[10px] uppercase font-mono text-cyan-400 block mb-1">
                Chunk A{hoveredCell.i + 1}
              </span>
              <p className="line-clamp-3 text-slate-300">{leftSegments[hoveredCell.i]?.content}</p>
            </div>
            <div className="rounded-lg bg-purple-950/20 border border-purple-500/20 p-2.5">
              <span className="text-[10px] uppercase font-mono text-purple-400 block mb-1">
                Chunk B{hoveredCell.j + 1}
              </span>
              <p className="line-clamp-3 text-slate-300">{rightSegments[hoveredCell.j]?.content}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
