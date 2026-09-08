import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ConcordRouter — Multi-Model AI Arena & Synthesis',
  description: 'Fan out prompts across OpenAI, Anthropic, Gemini, Ollama, and reconcile outputs with cherry-pick merging.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-neutral-700 selection:text-white">
        {children}
      </body>
    </html>
  );
}
