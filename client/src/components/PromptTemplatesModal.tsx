'use client';

import React, { useState } from 'react';
import { TargetModel } from '@/lib/types';
import {
  Sparkles,
  X,
  Search,
  ArrowRight,
} from 'lucide-react';

interface PromptTemplate {
  id: string;
  category: string;
  title: string;
  description: string;
  prompt: string;
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
  const [searchFilter, setSearchFilter] = useState<string>('');

  if (!isOpen) return null;

  const templates: PromptTemplate[] = [
    {
      id: 'arch-distributed-cache',
      category: 'Architecture',
      title: 'Distributed Cache Architecture & Failover',
      description: 'Compare Redis Cluster vs Memcached vs Local Cache tradeoffs with consistency proofs.',
      prompt:
        'Compare distributed cache architecture tradeoffs between Redis Cluster, Memcached, and in-memory caches. Structure your answer covering consistency guarantees, network partition failover mechanics, throughput benchmarks, and memory overhead.',
      recommendedModels: [
        { providerId: 'mock', model: 'mock-concise' },
        { providerId: 'mock', model: 'mock-verbose' },
      ],
    },
    {
      id: 'sec-auth-audit',
      category: 'Security',
      title: 'JWT Auth & Token Rotation Security Audit',
      description: 'Identify token substitution, replay attacks, and key rotation strategies in microservices.',
      prompt:
        'Conduct a comprehensive security audit on standard stateless JWT authentication in microservices. Identify common vulnerability vectors including token substitution, weak "none" signing algorithms, replay attacks, and token revocation strategies. Provide concrete remediation code snippets.',
      recommendedModels: [
        { providerId: 'mock', model: 'mock-verbose' },
        { providerId: 'mock', model: 'mock-creative' },
      ],
    },
    {
      id: 'frontend-react-solid',
      category: 'Frontend',
      title: 'React 19 VDOM vs SolidJS Fine-Grained Signals',
      description: 'Contrast fiber reconciliation memory overhead against compile-time reactive signals.',
      prompt:
        'Provide an in-depth technical comparison between React 19 concurrent fiber reconciliation and SolidJS fine-grained signal reactivity. Contrast runtime memory overhead, CPU render bottlenecks, compiler transformations, and developer ergonomical tradeoffs.',
      recommendedModels: [
        { providerId: 'mock', model: 'mock-concise' },
        { providerId: 'mock', model: 'mock-creative' },
      ],
    },
    {
      id: 'db-postgres-mysql',
      category: 'Database',
      title: 'PostgreSQL MVCC vs MySQL InnoDB Undo Logs',
      description: 'Analyze concurrency control, bloat vacuuming, and transaction isolation levels.',
      prompt:
        'Compare Multi-Version Concurrency Control (MVCC) in PostgreSQL vs MySQL InnoDB. Contrast vacuuming and table bloat management against rollback segments / undo logs, and explain how each engine handles Repeatable Read vs Serializable isolation levels.',
      recommendedModels: [
        { providerId: 'mock', model: 'mock-concise' },
        { providerId: 'mock', model: 'mock-verbose' },
      ],
    },
    {
      id: 'go-concurrency-patterns',
      category: 'Backend',
      title: 'Go Channel Pipelines vs Worker Pool Queues',
      description: 'Benchmark bounded worker pools with backpressure vs unbounded goroutines.',
      prompt:
        'Explain idiomatic Go concurrency design patterns for high-throughput batch ingestion. Compare bounded worker pools with backpressure channels vs dynamic goroutine spawning with sync.ErrGroup. Provide resilient error handling and context cancellation patterns.',
      recommendedModels: [
        { providerId: 'mock', model: 'mock-concise' },
        { providerId: 'mock', model: 'mock-verbose' },
      ],
    },
  ];

  const categories = ['all', 'Architecture', 'Security', 'Frontend', 'Database', 'Backend'];

  const filteredTemplates = templates.filter((t) => {
    const matchesCat = activeCategory === 'all' || t.category.toLowerCase() === activeCategory.toLowerCase();
    const matchesSearch =
      !searchFilter.trim() ||
      t.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.description.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.prompt.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div className="flex w-full max-w-3xl max-h-[85vh] flex-col rounded-2xl bg-[#11141b] border border-white/[0.08] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4 bg-[#0e1117]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Prompt Template Library</h2>
              <p className="text-xs text-slate-400">
                Curated multi-model prompt benchmarks designed to test divergence and consensus
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-6 py-3 bg-[#0c0f15]">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                className={`rounded-lg px-2.5 py-1 text-xs capitalize transition-all ${
                  activeCategory === c
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                {c === 'all' ? 'All Templates' : c}
              </button>
            ))}
          </div>

          <div className="relative w-48 sm:w-60">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full rounded-xl bg-[#13161f] border border-white/[0.08] pl-8 pr-3 py-1 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Template List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3.5">
          {filteredTemplates.map((tpl, idx) => (
            <div
              key={tpl.id || idx}
              onClick={() => {
                onSelectTemplate(tpl.prompt, tpl.recommendedModels);
                onClose();
              }}
              className="glass-card rounded-2xl p-4 bg-[#141822] border border-white/[0.06] hover:border-amber-500/30 cursor-pointer space-y-2.5 group transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                  {tpl.title}
                </span>
                <span className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-mono text-amber-400 border border-white/[0.06]">
                  {tpl.category}
                </span>
              </div>
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                {tpl.description}
              </p>
              <div className="pt-2 flex items-center justify-between text-[11px] text-amber-400 font-medium border-t border-white/[0.04]">
                <span className="text-[10px] text-slate-500">
                  Suggested: {tpl.recommendedModels.map((m) => m.model).join(', ')}
                </span>
                <span className="flex items-center gap-1 font-semibold group-hover:translate-x-1 transition-transform">
                  Load into Arena <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-white/[0.06] px-6 py-3.5 bg-[#0e1117]">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
