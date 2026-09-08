'use client';

import React from 'react';
import { ProviderStatus, TargetModel } from '@/lib/types';
import { X, Check, Cpu, Sparkles, Layers } from 'lucide-react';

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-3xl max-h-[85vh] rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 px-6 py-4 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Target Models Fan-Out</h2>
              <p className="text-xs text-slate-400">Select 2+ target models to execute concurrent side-by-side prompt fan-out.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Models List by Provider */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {providers.map((p) => {
            return (
              <div key={p.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">{p.name}</span>
                    {p.isConnected ? (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                        Ready
                      </span>
                    ) : (
                      <button
                        onClick={onOpenSettings}
                        className="rounded-full bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-400 border border-amber-500/20 transition-colors"
                      >
                        Requires Key →
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {p.models.map((model) => {
                    const isSelected = selectedModels.some(
                      (sm) => sm.providerId === p.id && sm.model === model.id
                    );

                    return (
                      <div
                        key={model.id}
                        onClick={() => onToggleModel(p.id, model.id)}
                        className={`group relative flex flex-col justify-between rounded-xl p-3.5 cursor-pointer border transition-all ${
                          isSelected
                            ? 'bg-blue-600/15 border-blue-500/50 shadow-sm shadow-blue-500/10'
                            : 'bg-slate-950/60 hover:bg-slate-800/50 border-slate-800/80 text-slate-400'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Cpu className={`h-4 w-4 ${isSelected ? 'text-blue-400' : 'text-slate-500'}`} />
                            <h4 className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                              {model.name}
                            </h4>
                          </div>

                          <div
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                              isSelected
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'border-slate-700 group-hover:border-slate-500'
                            }`}
                          >
                            {isSelected && <Check className="h-3 w-3" />}
                          </div>
                        </div>

                        {model.description && (
                          <p className="mt-1.5 text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                            {model.description}
                          </p>
                        )}

                        <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                          <span>{model.contextLen ? `${(model.contextLen / 1000).toFixed(0)}k context` : 'Local context'}</span>
                          <span>{model.inputPricePer1k ? `$${model.inputPricePer1k}/1k in` : 'Free / BYO'}</span>
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
        <div className="flex items-center justify-between border-t border-slate-800/80 px-6 py-3.5 bg-slate-950/60">
          <div className="text-xs text-slate-400">
            <span className="font-semibold text-white">{selectedModels.length}</span> models selected for fan-out
          </div>
          <button
            onClick={onClose}
            className="rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/30 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
