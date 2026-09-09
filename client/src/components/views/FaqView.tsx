'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

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
        'A Deterministic Diff cherry-picks exact paragraphs and assertions written by the source models. An AI Synthesis sends both answers to an LLM with explicit consensus instructions to draft a newly de-duplicated summary. AI syntheses are explicitly badged to maintain trust boundaries.',
    },
    {
      category: 'Merge Mechanics',
      question: 'When is the Merge Workbench offered?',
      answer:
        'Phase 4 Gating Heuristics automatically evaluate response length and cosine similarity. Trivial turns (e.g. "Hi", "Thanks") skip the merge affordance. Near-identical answers (>90% agreement) receive a "Models in Consensus" badge, while divergent turns offer 1-click merge launch.',
    },
    {
      category: 'Humanize & AI Detection',
      question: 'What is the Humanize post-processing stage and how does it work?',
      answer:
        'AI detectors (GPTZero, Originality.ai, Turnitin, DetectGPT-style curvature scoring) largely key off two statistical signals: perplexity (word predictability under a language model) and burstiness (variance in sentence length and structure). LLM output is characteristically low-perplexity and structurally uniform. The /api/v1/merge/humanize stage is a non-generative, rule-based NLP pipeline that perturbs sentence length distributions (splitting long sentences, joining short ones), removes tell-word cliches (delve, testament, tapestry, moreover), and smooths repeating n-gram skeletons to push the mathematical signature toward human baselines.',
    },
    {
      category: 'Humanize & AI Detection',
      question: 'Why not just prompt an LLM to "rewrite this text to sound more human"?',
      answer:
        'Invoking another LLM simply produces another low-perplexity generation with identical statistical artifacts that detectors easily identify. Because AI detectors test mathematical distributions rather than subjective "style", deterministic rule-based perturbation changes the statistical signature while faithfully preserving your reconciled draft’s original meaning — without consuming tokens or adding latency.',
    },
    {
      category: 'Humanize & AI Detection',
      question: 'Can I preview and revert humanized changes before saving?',
      answer:
        'Yes! When you click "Humanize" in the Reconciled Merged Draft toolbar, an interactive inspection bar appears showing exact before/after metrics: Burstiness score changes, number and names of AI-tell words replaced, and Flesch-Kincaid readability shifts. A 1-click "Revert" button is always available to restore your original draft.',
    },
    {
      category: 'Self-Hosting',
      question: 'Can I run ConcordRouter completely offline?',
      answer:
        'Yes! The Go backend compiles to a standalone binary with pure-Go embedded SQLite (no CGo or Docker required). You can pair it with local open-weights models running via Ollama (Llama 3.2, DeepSeek R1, Mistral) for 100% offline and private operation.',
    },
  ];

  const categories = ['all', 'General', 'Providers & Keys', 'Merge Mechanics', 'Humanize & AI Detection', 'Self-Hosting'];

  const filteredFaqs = faqs.filter(
    (item) => activeCategory === 'all' || item.category === activeCategory
  );

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 lg:px-12 bg-background text-foreground transition-colors">
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Header Hero */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-surface-secondary px-3 py-1 text-xs font-medium text-text-secondary border border-border">
            <Sparkles className="h-3.5 w-3.5 text-brand-terracotta" />
            <span>Questions & Guidance</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">
            Frequently Asked Questions
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            Everything you need to know about multi-model fan-out, sequence alignment, and BYOA keys.
          </p>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 pb-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`rounded-full px-3 py-1 text-xs transition-all ${
                activeCategory === c
                  ? 'bg-foreground text-background font-medium shadow-sm'
                  : 'text-text-secondary hover:text-foreground hover:bg-surface-secondary'
              }`}
            >
              {c === 'all' ? 'All Questions' : c}
            </button>
          ))}
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-2.5">
          {filteredFaqs.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-surface border border-border transition-all shadow-card overflow-hidden"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between p-4 text-left text-xs sm:text-sm font-medium text-foreground hover:text-foreground/80 transition-colors"
                >
                  <span className="pr-4">{item.question}</span>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-text-muted shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-text-muted shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="border-t border-border/50 p-4 pt-3 text-xs sm:text-sm leading-relaxed text-text-secondary bg-surface-secondary/20">
                    <p>{item.answer}</p>
                    <span className="mt-3 inline-block rounded-full bg-surface-secondary px-2 py-0.2 text-[9px] font-mono text-text-muted border border-border">
                      {item.category}
                    </span>
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
