'use client';

import React, { useState } from 'react';
import { ProviderStatus } from '@/lib/types';
import { saveProviderKey, deleteProviderKey } from '@/lib/api';
import {
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Trash2,
  Lock,
} from 'lucide-react';

interface ProviderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  providers: ProviderStatus[];
  onRefreshProviders: () => void;
}

export const ProviderSettingsModal: React.FC<ProviderSettingsModalProps> = ({
  isOpen,
  onClose,
  providers,
  onRefreshProviders,
}) => {
  const [activeTab, setActiveTab] = useState<string>(providers[0]?.id || 'anthropic');
  const [apiKey, setApiKey] = useState<string>('');
  const [customUrl, setCustomUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentProvider = providers.find((p) => p.id === activeTab);

  const handleSave = async () => {
    if (!currentProvider) return;
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await saveProviderKey(currentProvider.id, apiKey, customUrl || '');
      setSuccessMsg(`Successfully connected and validated ${currentProvider.name}!`);
      setApiKey('');
      onRefreshProviders();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to authenticate provider key. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!currentProvider) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await deleteProviderKey(currentProvider.id);
      setSuccessMsg(`Disconnected ${currentProvider.name}.`);
      onRefreshProviders();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to disconnect provider');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-2xl flex-col rounded-2xl bg-surface border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5 bg-surface-secondary/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface border border-border text-foreground">
              <Lock className="h-4 w-4 text-brand-terracotta" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">BYOA Key Vault</h2>
              <p className="text-xs text-text-secondary">
                Credentials are encrypted at rest with local AES-256-GCM
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex flex-col sm:flex-row min-h-[360px]">
          {/* Provider Tabs Sidebar */}
          <div className="w-full sm:w-44 border-b sm:border-b-0 sm:border-r border-border bg-surface-secondary/30 p-2 space-y-0.5">
            {providers.map((p) => {
              const isSelected = p.id === activeTab;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setActiveTab(p.id);
                    setErrorMsg(null);
                    setSuccessMsg(null);
                    setApiKey('');
                    setCustomUrl(p.customUrl || '');
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-normal transition-all ${
                    isSelected
                      ? 'bg-surface text-foreground font-medium shadow-sm border border-border'
                      : 'text-text-secondary hover:bg-surface-hover hover:text-foreground'
                  }`}
                >
                  <span className="capitalize">{p.id}</span>
                  {p.isConnected ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-text-muted/40" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Provider Detail Pane */}
          <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between bg-surface">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{currentProvider?.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-text-muted">Auth Mode:</span>
                    <span className="rounded bg-surface-secondary px-1.5 py-0.2 text-[10px] font-mono text-text-secondary uppercase border border-border">
                      {currentProvider?.authMode}
                    </span>
                    {currentProvider?.isConnected && (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.2 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="h-3 w-3" /> Connected
                      </span>
                    )}
                  </div>
                </div>

                {currentProvider?.isConnected && currentProvider.id !== 'mock' && (
                  <button
                    onClick={handleDisconnect}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1 rounded-lg border border-red-500/20 transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Disconnect
                  </button>
                )}
              </div>

              {currentProvider?.keyPreview && (
                <div className="mb-4 rounded-xl bg-surface-secondary/60 border border-border p-3 text-xs text-text-secondary">
                  <span className="text-text-muted">Active Key:</span> <code className="text-foreground font-mono">{currentProvider.keyPreview}</code>
                </div>
              )}

              {/* Input Forms */}
              {currentProvider?.id === 'mock' ? (
                <div className="rounded-xl bg-surface-secondary border border-border p-4 text-xs text-text-secondary space-y-1.5">
                  <p className="font-semibold text-foreground">Simulated Testing Provider Active</p>
                  <p className="leading-relaxed">
                    The Mock provider generates deterministic response fixtures for fast benchmarking, multi-pane streaming, and cherry-pick testing with zero cost or configuration required.
                  </p>
                </div>
              ) : currentProvider?.id === 'ollama' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Ollama Endpoint URL
                    </label>
                    <input
                      type="text"
                      placeholder="http://localhost:11434"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      className="w-full rounded-xl bg-surface-secondary border border-border px-3 py-2 text-xs text-foreground placeholder-text-muted focus:border-border-strong focus:outline-none font-mono"
                    />
                    <p className="mt-1 text-[11px] text-text-muted">Ensure `ollama serve` is running locally.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      {currentProvider?.name} API Key
                    </label>
                    <input
                      type="password"
                      placeholder={currentProvider?.keyPreview ? 'Paste new key to rotate...' : 'sk-...'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full rounded-xl bg-surface-secondary border border-border px-3 py-2 text-xs text-foreground placeholder-text-muted focus:border-border-strong focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Custom API Proxy / Gateway URL (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      className="w-full rounded-xl bg-surface-secondary border border-border px-3 py-2 text-xs text-foreground placeholder-text-muted focus:border-border-strong focus:outline-none font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Status Feedback */}
              {errorMsg && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-2.5 text-xs text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="mt-5 flex justify-end gap-2 border-t border-border pt-3.5">
              <button
                onClick={onClose}
                className="rounded-full px-4 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-hover hover:text-foreground transition-colors"
              >
                Close
              </button>
              {currentProvider?.id !== 'mock' && (
                <button
                  onClick={handleSave}
                  disabled={isLoading || (currentProvider?.id !== 'ollama' && !apiKey && !currentProvider?.isConnected)}
                  className="flex items-center gap-1.5 rounded-full bg-foreground text-background hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-1.5 text-xs font-medium shadow-sm transition-all active:scale-95"
                >
                  {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                  <span>Test & Save Key</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
