export interface ModelInfo {
  id: string;
  name: string;
  providerId: string;
  description?: string;
  contextLen?: number;
  inputPricePer1k?: number;
  outputPricePer1k?: number;
}

export interface ProviderStatus {
  id: string;
  name: string;
  authMode: 'api_key' | 'oauth' | 'none' | 'unsupported';
  isConnected: boolean;
  customUrl?: string;
  keyPreview?: string;
  models: ModelInfo[];
}

export interface TargetModel {
  providerId: string;
  model: string;
}

export interface ModelResponse {
  id: string;
  turnId: string;
  providerId: string;
  model: string;
  content: string;
  status: 'streaming' | 'completed' | 'error';
  error?: string;
  latencyMs: number;
  tokens: number;
  createdAt: string;
}

export interface MessageTurn {
  id: string;
  threadId: string;
  userPrompt: string;
  createdAt: string;
  responses: Record<string, ModelResponse>; // keyed by `${providerId}:${model}`
}

export interface Thread {
  id: string;
  title: string;
  firstPrompt?: string;
  turnCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChunkSegment {
  id: string;
  index: number;
  source: string;
  type: 'paragraph' | 'sentence' | 'header' | 'code' | 'bullet' | 'blockquote' | 'table' | 'list_group';
  content: string;
}

export interface MergeRecord {
  id: string;
  threadId: string;
  turnId: string;
  sourceModels: string[];
  mergedText: string;
  segments?: ChunkSegment[];
  strategy: 'manual_cherrypick' | 'diff_structured' | 'ai_synthesis';
  createdAt: string;
}

export interface GatingDecision {
  eligible: boolean;
  isConsensus: boolean;
  similarityScore: number;
  badgeText: string;
  reason: string;
}

export interface AlignedPair {
  id: string;
  leftChunk?: ChunkSegment;
  rightChunk?: ChunkSegment;
  score: number;
  relation: 'agree' | 'paraphrase' | 'conflict' | 'unique_left' | 'unique_right';
}

export interface AlignmentResult {
  pairs: AlignedPair[];
  similarityMatrix: number[][];
  leftSegments: ChunkSegment[];
  rightSegments: ChunkSegment[];
  overallAgreement: number;
}

export interface StreamChunk {
  providerId: string;
  model: string;
  delta?: string;
  fullText?: string;
  tokens?: number;
  done: boolean;
  error?: string;
  timestamp: string;
}

