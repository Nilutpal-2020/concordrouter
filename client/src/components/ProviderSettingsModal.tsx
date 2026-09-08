'use client';

import React, { useState } from 'react';
import { ProviderStatus } from '@/lib/types';
import { saveProviderKey, deleteProviderKey } from '@/lib/api';
import { X, Key, ShieldCheck, Server, AlertCircle, CheckCircle2, Loader2, Trash2 } from 'lucide-react';

interface ProviderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  providers: ProviderStatus[];
  onRefreshProviders: () => Promise<void>;
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

  const currentProvider = providers.find((p) => p.id === activeTab) || providers[0];

  const handleSave = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await saveProviderKey(activeTab, apiKey, customUrl);
      setSuccessMsg(`Successfully validated and connected ${currentProvider?.name}!`);
      setApiKey('');
      await onRefreshProviders();
    } catch (err: any) {
      setErrorMsg(err.message || 'Validation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await deleteProviderKey(activeTab);
      setSuccessMsg(`Disconnected ${currentProvider?.name}.`);
      setApiKey('');
      setCustomUrl('');
      await onRefreshProviders();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to disconnect');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 px-6 py-4 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Key className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">BYOA Provider Credentials</h2>
              <p className="text-xs text-slate-400">Your keys are encrypted at rest with AES-256-GCM. We never mark up or route usage through platform keys.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex flex-col sm:flex-row min-h-[380px]">
          {/* Provider Tabs Sidebar */}
          <div className="w-full sm:w-48 border-b sm:border-b-0 sm:border-r border-slate-800 bg-slate-950/30 p-2 space-y-1">
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
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 font-semibold'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <span className="capitalize">{p.id}</span>
                  {p.isConnected ? (
                    <span className="flex h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20" />
                  ) : (
                    <span className="flex h-2 w-2 rounded-full bg-slate-700" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Provider Detail Pane */}
          <div className="flex-1 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-white">{currentProvider?.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-400">Auth Mode:</span>
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-300 uppercase">
                      {currentProvider?.authMode}
                    </span>
                    {currentProvider?.isConnected && (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="h-3 w-3" /> Connected
                      </span>
                    )}
                  </div>
                </div>

                {currentProvider?.isConnected && currentProvider.id !== 'mock' && (
                  <button
                    onClick={handleDisconnect}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1.5 rounded-lg border border-red-500/20 transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Disconnect
                  </button>
                )}
              </div>

              {currentProvider?.keyPreview && (
                <div className="mb-4 rounded-xl bg-slate-950/60 border border-slate-800 p-3 text-xs text-slate-400">
                  <span className="text-slate-500">Active Key:</span> <code className="text-blue-400 font-mono">{currentProvider.keyPreview}</code>
                </div>
              )}

              {/* Input Forms */}
              {currentProvider?.id === 'mock' ? (
                <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 text-xs text-blue-300 space-y-2">
                  <p className="font-semibold text-blue-200">Simulated Testing Provider Active</p>
                  <p>
                    The Mock provider generates deterministic response fixtures for fast benchmarking, multi-pane streaming, and cherry-pick testing with zero cost or configuration required.
                  </p>
                </div>
              ) : currentProvider?.id === 'ollama' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Ollama Endpoint URL
                    </label>
                    <input
                      type="text"
                      placeholder="http://localhost:11434"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">Make sure `ollama serve` is running on your machine.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      {currentProvider?.name} API Key
                    </label>
                    <input
                      type="password"
                      placeholder={currentProvider?.keyPreview ? 'Paste new key to rotate...' : 'sk-...'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Custom API Proxy / Gateway URL (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Status Feedback */}
              {errorMsg && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="mt-6 flex justify-end gap-2 border-t border-slate-800/80 pt-4">
              <button
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                Close
              </button>
              {currentProvider?.id !== 'mock' && (
                <button
                  onClick={handleSave}
                  disabled={isLoading || (currentProvider?.id !== 'ollama' && !apiKey && !currentProvider?.isConnected)}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/30 transition-all active:scale-[0.98]"
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
