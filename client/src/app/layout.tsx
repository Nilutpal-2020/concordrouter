import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ConcordRouter — Multi-Model Prompt Arena & Synthesis',
  description: 'Fan out prompts across OpenAI, Anthropic, Gemini, Ollama, and reconcile outputs with cherry-pick merging.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#090b10] text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
