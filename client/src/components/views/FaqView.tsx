'use client';

import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Sparkles, Layers, ShieldCheck, Cpu } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
  category: string;
}

export const FaqView: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const faqs: FaqItem[] = [
    {
      category: 'General',
      question: 'What is ConcordRouter and why fan out across multiple LLMs?',
      answer:
        'Every LLM has unique reasoning strengths and subtle blindspots. ConcordRouter allows you to send a single prompt to multiple foundation models simultaneously (e.g. Claude 3.7, GPT-4o, Gemini 2.5), review side-by-side responses in real-time, and reconcile conflicting or complementary answers into one cohesive response.',
    },
    {
      category: 'General',
      question: 'How does the Merge Workbench differ from standard text diff tools?',
      answer:
        'Traditional git diff tools (like Myers diff) compare literal line numbers and characters, which fails when two models explain the same concept using different sentence structures. ConcordRouter uses Needleman-Wunsch sequence alignment based on semantic cosine similarity to pair up corresponding thoughts by meaning rather than formatting.',
    },
    {
      category: 'Providers & Keys',
      question: 'Do I need paid subscriptions or API keys to use ConcordRouter?',
      answer:
        'ConcordRouter comes with a built-in "Simulated Mock Arena" that lets you test multi-pane streaming and cherry-pick merges immediately with zero keys or cost. To connect live foundation models, enter your official API keys in the BYOA Vault, or connect to a local Ollama instance (`localhost:11434`) completely free and offline.',
    },
    {
      category: 'Providers & Keys',
      question: 'How are my API keys stored and secured?',
      answer:
        'Your keys are encrypted at rest using AES-256-GCM authenticated encryption. The server only returns masked previews (e.g. sk-ant-...4x9f) back to your browser after validation. ConcordRouter never marks up your tokens or proxies your billing.',
    },
    {
      category: 'Merge Mechanics',
      question: 'What is the difference between Deterministic Diff and AI Synthesis?',
      answer:
        'A Deterministic Diff (Phases 3 & 5) cherry-picks exact paragraphs and assertions written by the source models. An AI Synthesis (Phase 6) sends both answers to an LLM with explicit consensus instructions to draft a newly de-duplicated summary. AI syntheses are explicitly badged to maintain trust boundaries.',
    },
    {
      category: 'Merge Mechanics',
      question: 'When is the Merge Workbench offered?',
      answer:
        'Phase 4 Gating Heuristics automatically evaluate response length and cosine similarity. Trivial turns (e.g. "Hi", "Thanks") skip the merge affordance. Near-identical answers (>90% agreement) receive a "✨ Models in Consensus" badge, while divergent turns offer 1-click merge launch.',
    },
    {
      category: 'Self-Hosting',
      question: 'Can I run ConcordRouter completely offline?',
      answer:
        'Yes! The Go backend compiles to a standalone binary with pure-Go embedded SQLite (no CGo or Docker required). You can pair it with local open-weights models running via Ollama (Llama 3.2, DeepSeek R1, Mistral) for 100% offline and private operation.',
    },
  ];

  const categories = ['all', 'General', 'Providers & Keys', 'Merge Mechanics', 'Self-Hosting'];

  const filteredFaqs =
    activeCategory === 'all'
      ? faqs
      : faqs.filter((item) => item.category.toLowerCase() === activeCategory.toLowerCase());

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 lg:px-12 bg-[#090b0e]">
      <div className="mx-auto max-w-4xl space-y-10">
        {/* Header Hero */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#141822] px-3.5 py-1 text-xs font-mono text-amber-400 border border-amber-500/20">
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Knowledge Base & FAQ</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Frequently Asked Questions
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            Everything you need to know about concurrent fan-out, sequence alignment diffing, BYOA encryption, and local self-hosting.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-xl px-4 py-2 text-xs font-medium capitalize transition-all ${
                activeCategory === cat
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold shadow-md shadow-amber-500/10'
                  : 'bg-[#11141b] text-slate-400 hover:text-white border border-white/[0.08] hover:border-amber-500/30'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Accordion List */}
        <div className="space-y-3">
          {filteredFaqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-[#11141b] border border-white/[0.08] overflow-hidden transition-all hover:border-amber-500/30"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between p-5 text-left transition-colors"
                >
                  <span className="font-semibold text-white text-sm sm:text-base pr-4">
                    {faq.question}
                  </span>
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-black/40 border border-white/[0.08] text-amber-400">
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-[13px] text-slate-300 leading-relaxed border-t border-white/[0.06]">
                    <p>{faq.answer}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="rounded bg-black/40 px-2 py-0.5 text-[10px] font-mono text-amber-400 border border-amber-500/20">
                        Category: {faq.category}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
