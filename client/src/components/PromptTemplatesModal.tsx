'use client';

import React, { useState } from 'react';
import { TargetModel } from '@/lib/types';
import { Sparkles, Code2, Terminal, BookOpen, CheckSquare, X, ArrowRight } from 'lucide-react';

interface PromptTemplate {
  title: string;
  category: string;
  prompt: string;
  description: string;
  recommendedModels: TargetModel[];
}

interface PromptTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (prompt: string, models?: TargetModel[]) => void;
}

export const PromptTemplatesModal: React.FC<PromptTemplatesModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  if (!isOpen) return null;

  const templates: PromptTemplate[] = [
    {
      title: 'Concurrency: Goroutines & Channels vs Mutexes',
      category: 'Architecture',
      description: 'Test how models compare lock-based vs communication-based concurrency patterns.',
      prompt:
        'Compare Go channels vs sync.Mutex for high-throughput state synchronization. Detail the performance trade-offs, deadlock pitfalls, and provide idiomatic code examples for both approaches.',
      recommendedModels: [
        { providerId: 'mock', model: 'mock-concise' },
        { providerId: 'mock', model: 'mock-verbose' },
      ],
    },
    {
      title: 'System Design: Distributed Cache Invalidation',
      category: 'Architecture',
      description: 'Reconcile competing distributed cache architectures and consistency models.',
      prompt:
        'Design a high-scale distributed caching layer for an e-commerce catalog. Compare Write-Through, Write-Behind, and Cache-Aside strategies, analyzing how each handles cache invalidation and eventual consistency.',
      recommendedModels: [
        { providerId: 'mock', model: 'mock-verbose' },
        { providerId: 'mock', model: 'mock-creative' },
      ],
    },
    {
      title: 'Code Review & Security Vulnerability Audit',
      category: 'Code Review',
      description: 'Fan out code review prompts to cross-check security audits and performance bugs.',
      prompt:
        'Review the following authentication handler logic for timing attacks, SQL/NoSQL injection, and token leakage vulnerabilities. Propose a hardened drop-in refactoring.',
      recommendedModels: [
        { providerId: 'mock', model: 'mock-concise' },
        { providerId: 'mock', model: 'mock-creative' },
      ],
    },
    {
      title: 'Fact Reconciler: Quantum Supremacy Milestones',
      category: 'Fact Checking',
      description: 'Cross-check subtle facts, historical timelines, and technological claims.',
      prompt:
        'Explain the milestone achievements in quantum supremacy from Google (Sycamore) to recent neutral-atom and photonics breakthroughs. Differentiate theoretical claims from practical error-corrected quantum computing.',
      recommendedModels: [
        { providerId: 'mock', model: 'mock-concise' },
        { providerId: 'mock', model: 'mock-verbose' },
      ],
    },
  ];

  const categories = ['all', 'Architecture', 'Code Review', 'Fact Checking'];
  const filtered = activeCategory === 'all' ? templates : templates.filter((t) => t.category === activeCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-2xl max-h-[85vh] rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Prompt Template Library</h2>
              <p className="text-xs text-slate-400">Curated benchmark prompts tailored for multi-model comparison.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-1.5 px-6 py-3 border-b border-slate-800/80 bg-slate-950/40">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-lg px-3 py-1 text-xs font-medium capitalize transition-colors ${
                activeCategory === cat
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              {cat === 'all' ? 'All Templates' : cat}
            </button>
          ))}
        </div>

        {/* List of Templates */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3.5">
          {filtered.map((tpl, idx) => (
            <div
              key={idx}
              onClick={() => {
                onSelectTemplate(tpl.prompt, tpl.recommendedModels);
                onClose();
              }}
              className="glass-card rounded-2xl p-4 border border-white/[0.08] hover:border-indigo-500/40 cursor-pointer space-y-2.5 group transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white group-hover:text-indigo-200 transition-colors">
                  {tpl.title}
                </span>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-indigo-300">
                  {tpl.category}
                </span>
              </div>
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                {tpl.description}
              </p>
              <div className="pt-2 flex items-center justify-between text-[11px] text-indigo-400 font-medium">
                <span>Click to load into arena composer</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-800 px-6 py-3 bg-slate-950/80">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-1.5 text-xs font-medium text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
