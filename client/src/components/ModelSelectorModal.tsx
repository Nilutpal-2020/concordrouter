'use client';

import React from 'react';
import { ProviderStatus, TargetModel } from '@/lib/types';
import { X, Check, Cpu, Layers } from 'lucide-react';

interface ModelSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  providers: ProviderStatus[];
  selectedModels: TargetModel[];
  onToggleModel: (providerId: string, modelId: string) => void;
  onOpenSettings: () => void;
}

export const ModelSelectorModal: React.FC<ModelSelectorModalProps> = ({
  isOpen,
  onClose,
  providers,
  selectedModels,
  onToggleModel,
  onOpenSettings,
}) => {
  if (!isOpen) return null;

  const isModelSelected = (providerId: string, modelId: string) => {
    return selectedModels.some((m) => m.providerId === providerId && m.model === modelId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-lg flex-col rounded-2xl bg-surface border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5 bg-surface-secondary/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface border border-border text-foreground">
              <Layers className="h-4 w-4 text-brand-terracotta" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Target Model Selection</h2>
              <p className="text-xs text-text-secondary">
                Select models to fan-out queries simultaneously
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

        {/* Modal Body */}
        <div className="max-h-[60vh] overflow-y-auto p-5 space-y-5">
          {providers.map((p) => {
            const isConnected = p.isConnected;
            return (
              <div key={p.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-xs capitalize text-foreground">{p.name}</span>
                    <span
                      className={`rounded-full px-2 py-0.2 text-[9px] font-mono ${
                        isConnected
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-surface-secondary text-text-muted border border-border'
                      }`}
                    >
                      {isConnected ? 'Connected' : 'Setup Required'}
                    </span>
                  </div>

                  {!isConnected && (
                    <button
                      onClick={onOpenSettings}
                      className="text-[11px] text-text-secondary hover:text-foreground font-medium"
                    >
                      Configure Keys →
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {p.models.map((model) => {
                    const selected = isModelSelected(p.id, model.id);
                    return (
                      <div
                        key={model.id}
                        onClick={() => onToggleModel(p.id, model.id)}
                        className={`flex items-center justify-between rounded-xl p-2.5 text-xs cursor-pointer border transition-all ${
                          selected
                            ? 'bg-surface-secondary border-border-strong text-foreground shadow-sm'
                            : 'bg-surface hover:bg-surface-secondary/50 border-border text-text-secondary'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <Cpu className={`h-3.5 w-3.5 shrink-0 ${selected ? 'text-foreground' : 'text-text-muted'}`} />
                          <span className={`truncate font-mono ${selected ? 'font-semibold text-foreground' : ''}`}>
                            {model.name}
                          </span>
                        </div>

                        <div
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition-all ${
                            selected
                              ? 'bg-foreground border-foreground text-background font-bold'
                              : 'border-border bg-surface-secondary'
                          }`}
                        >
                          {selected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3 bg-surface-secondary/40">
          <div className="text-xs text-text-muted">
            <span className="font-mono text-foreground font-semibold">{selectedModels.length}</span> model(s) active
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-foreground text-background hover:opacity-90 px-4 py-1.5 text-xs font-medium transition-all shadow-sm active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
