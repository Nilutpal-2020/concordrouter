'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  isStreaming = false,
  className = '',
}) => {
  return (
    <div className={`arena-prose markdown-body ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom Code Block & Inline Code
          code({ node, inline, className: codeClassName, children, ...props }: any) {
            const match = /language-(\w+)/.exec(codeClassName || '');
            const codeString = String(children).replace(/\n$/, '');

            if (!inline && (match || codeString.includes('\n'))) {
              return <CodeBlock language={match ? match[1] : ''} code={codeString} />;
            }

            return (
              <code
                className="rounded-md bg-surface-secondary px-1.5 py-0.5 font-mono text-[0.85em] text-foreground border border-border"
                {...props}
              >
                {children}
              </code>
            );
          },
          table({ children }) {
            return (
              <div className="my-3 w-full overflow-x-auto rounded-xl border border-border shadow-sm">
                <table className="w-full text-left text-xs sm:text-sm border-collapse">{children}</table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-surface-secondary/80 border-b border-border text-foreground font-semibold">{children}</thead>;
          },
          tbody({ children }) {
            return <tbody className="divide-y divide-border/60 bg-surface/40">{children}</tbody>;
          },
          th({ children }) {
            return <th className="px-3.5 py-2 font-semibold text-foreground text-xs">{children}</th>;
          },
          td({ children }) {
            return <td className="px-3.5 py-2 text-text-secondary text-xs">{children}</td>;
          },
          h1({ children }) {
            return <h1 className="text-base sm:text-lg font-bold text-foreground mt-4 mb-2 first:mt-0 tracking-tight">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-sm sm:text-base font-semibold text-foreground mt-3 mb-1.5 first:mt-0 tracking-tight">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-xs sm:text-sm font-semibold text-foreground mt-2.5 mb-1 first:mt-0">{children}</h3>;
          },
          p({ children }) {
            return <p className="mb-2.5 last:mb-0 leading-relaxed text-foreground/90">{children}</p>;
          },
          ul({ children }) {
            return <ul className="my-2 ml-4 list-disc space-y-1 text-foreground/90">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="my-2 ml-4 list-decimal space-y-1 text-foreground/90">{children}</ol>;
          },
          li({ children }) {
            return <li className="leading-relaxed">{children}</li>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="my-2.5 border-l-2 border-primary/50 pl-3.5 italic text-text-secondary">
                {children}
              </blockquote>
            );
          },
          hr() {
            return <hr className="my-3.5 border-border" />;
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && <span className="streaming-cursor ml-0.5 inline-block" />}
    </div>
  );
};

const CodeBlock: React.FC<{ language: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-border bg-surface-secondary/70 text-xs shadow-sm font-mono">
      <div className="flex items-center justify-between border-b border-border/80 px-3 py-1.5 bg-surface/80 text-[11px] text-text-muted">
        <span className="font-sans font-medium uppercase tracking-wider text-[10px] text-text-secondary">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] hover:bg-surface hover:text-foreground transition-all active:scale-95"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-500" />
              <span className="text-emerald-500 text-[10px]">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span className="text-[10px]">Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5 text-xs text-foreground/95 leading-relaxed font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
};
