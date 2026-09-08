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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div className="flex w-full max-w-xl flex-col rounded-2xl bg-[#11141b] border border-white/[0.08] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4 bg-[#0e1117]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Target Model Selection</h2>
              <p className="text-xs text-slate-400">
                Choose 1 to 4 models to fan-out your prompts to concurrently
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

        {/* Modal Body */}
        <div className="max-h-[60vh] overflow-y-auto p-6 space-y-6">
          {providers.map((p) => {
            const isConnected = p.isConnected;
            return (
              <div key={p.id} className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs capitalize text-slate-200">{p.name}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-mono ${
                        isConnected
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-[#191d28] text-slate-400 border border-white/[0.06]'
                      }`}
                    >
                      {isConnected ? 'Connected' : 'Setup Required'}
                    </span>
                  </div>

                  {!isConnected && (
                    <button
                      onClick={onOpenSettings}
                      className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold hover:underline"
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
                        className={`flex items-center justify-between rounded-xl p-3 text-xs cursor-pointer border transition-all ${
                          selected
                            ? 'bg-amber-500/15 border-amber-500/50 shadow-sm shadow-amber-500/10'
                            : 'bg-[#141822] border-white/[0.06] text-slate-300 hover:border-amber-500/30'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <Cpu className={`h-3.5 w-3.5 shrink-0 ${selected ? 'text-amber-400' : 'text-slate-500'}`} />
                          <span className={`truncate font-mono ${selected ? 'text-white font-bold' : 'text-slate-300'}`}>
                            {model.name}
                          </span>
                        </div>

                        <div
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${
                            selected
                              ? 'bg-amber-500 border-amber-500 text-black font-bold'
                              : 'border-white/[0.2] bg-black/40'
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
        <div className="flex items-center justify-between border-t border-white/[0.06] px-6 py-3.5 bg-[#0e1117]">
          <div className="text-xs text-slate-400">
            <span className="font-mono text-amber-400 font-bold">{selectedModels.length}</span> model(s) selected
          </div>
          <button
            onClick={onClose}
            className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 px-5 py-2 text-xs font-bold text-black shadow-md shadow-amber-500/20 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
