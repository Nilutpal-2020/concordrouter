import {
  ProviderStatus,
  Thread,
  MessageTurn,
  MergeRecord,
  TargetModel,
  StreamChunk,
  ChunkSegment,
  GatingDecision,
  AlignmentResult,
} from './types';

const API_BASE = '/api/v1';

export async function fetchProviders(): Promise<ProviderStatus[]> {
  const res = await fetch(`${API_BASE}/providers`);
  if (!res.ok) throw new Error('Failed to fetch providers');
  const data = await res.json();
  return data.providers || [];
}

export async function saveProviderKey(providerId: string, apiKey: string, customUrl: string = ''): Promise<{ success: boolean; keyPreview?: string }> {
  const res = await fetch(`${API_BASE}/providers/keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ providerId, apiKey, customUrl }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to save provider key');
  }
  return data;
}

export async function deleteProviderKey(providerId: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/providers/keys/${providerId}`, {
    method: 'DELETE',
  });
  return res.ok;
}

export async function fetchThreads(): Promise<Thread[]> {
  const res = await fetch(`${API_BASE}/threads`);
  if (!res.ok) throw new Error('Failed to fetch threads');
  const data = await res.json();
  return data.threads || [];
}

export async function searchThreads(query: string): Promise<Thread[]> {
  const res = await fetch(`${API_BASE}/threads/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Failed to search threads');
  const data = await res.json();
  return data.threads || [];
}

export async function createThread(title: string = 'New Arena Session'): Promise<Thread> {
  const res = await fetch(`${API_BASE}/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error('Failed to create thread');
  return res.json();
}

export async function fetchThreadDetails(threadId: string): Promise<{ thread: Thread; turns: MessageTurn[]; merges: MergeRecord[] }> {
  const res = await fetch(`${API_BASE}/threads/${threadId}`);
  if (!res.ok) throw new Error('Failed to fetch thread details');
  return res.json();
}

export async function deleteThread(threadId: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/threads/${threadId}`, {
    method: 'DELETE',
  });
  return res.ok;
}

export async function segmentResponseText(text: string, source: string): Promise<ChunkSegment[]> {
  const res = await fetch(`${API_BASE}/segment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, source }),
  });
  if (!res.ok) throw new Error('Failed to segment text');
  const data = await res.json();
  return data.segments || [];
}

export async function evaluateMergeGating(
  prompt: string,
  responseA: string,
  responseB: string
): Promise<GatingDecision> {
  const res = await fetch(`${API_BASE}/merge/gate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, responseA, responseB }),
  });
  if (!res.ok) throw new Error('Failed to evaluate gating');
  return res.json();
}

export async function fetchSemanticAlignment(
  modelALabel: string,
  responseA: string,
  modelBLabel: string,
  responseB: string
): Promise<AlignmentResult> {
  const res = await fetch(`${API_BASE}/merge/align`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modelALabel, responseA, modelBLabel, responseB }),
  });
  if (!res.ok) throw new Error('Failed to compute alignment');
  return res.json();
}

export async function streamSynthesis(
  threadId: string,
  prompt: string,
  modelALabel: string,
  responseA: string,
  modelBLabel: string,
  responseB: string,
  synthesisModel: TargetModel,
  onChunk: (chunk: StreamChunk) => void,
  onError: (err: string) => void,
  onComplete: () => void
): Promise<() => void> {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(`${API_BASE}/merge/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId,
          prompt,
          modelALabel,
          responseA,
          modelBLabel,
          responseB,
          synthesisModel,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Synthesis failed' }));
        onError(errData.error || `HTTP ${res.status}`);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const block of lines) {
          if (!block.trim()) continue;
          const dataMatch = block.match(/^data:\s*(.+)$/m);
          if (dataMatch) {
            try {
              const parsed = JSON.parse(dataMatch[1].trim());
              if (parsed.error) {
                onError(parsed.error);
              } else if (parsed.delta !== undefined || parsed.fullText !== undefined) {
                onChunk(parsed);
              }
            } catch (e) {}
          }
        }
      }
      onComplete();
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        onError(err.message || 'Synthesis stream interrupted');
      }
    }
  })();

  return () => {
    controller.abort();
  };
}

export async function saveMergeRecord(threadId: string, record: Partial<MergeRecord>): Promise<MergeRecord> {
  const res = await fetch(`${API_BASE}/threads/${threadId}/merge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  });
  if (!res.ok) throw new Error('Failed to save merge');
  return res.json();
}

export async function streamFanOut(
  threadId: string,
  prompt: string,
  targetModels: TargetModel[],
  onInit: (turnId: string) => void,
  onChunk: (chunk: StreamChunk) => void,
  onError: (err: string) => void,
  onComplete: () => void
): Promise<() => void> {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(`${API_BASE}/threads/${threadId}/turns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, targetModels }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Request failed' }));
        onError(errData.error || `HTTP ${res.status}`);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        onError('ReadableStream not supported');
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const block of lines) {
          if (!block.trim()) continue;
          const eventMatch = block.match(/^event:\s*(.+)$/m);
          const dataMatch = block.match(/^data:\s*(.+)$/m);

          const eventType = eventMatch ? eventMatch[1].trim() : 'message';
          const dataStr = dataMatch ? dataMatch[1].trim() : '';

          if (!dataStr) continue;

          try {
            const parsed = JSON.parse(dataStr);
            if (eventType === 'init') {
              onInit(parsed.turnId);
            } else if (eventType === 'chunk') {
              onChunk(parsed as StreamChunk);
            } else if (eventType === 'error') {
              onError(parsed.error);
            } else if (eventType === 'complete') {
              onComplete();
            }
          } catch (e) {
            console.error('Error parsing SSE event:', e, dataStr);
          }
        }
      }
      onComplete();
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        onError(err.message || 'Stream connection failed');
      }
    }
  })();

  return () => {
    controller.abort();
  };
}

export async function streamRetry(
  threadId: string,
  turnId: string,
  prompt: string,
  targetModel: TargetModel,
  onChunk: (chunk: StreamChunk) => void,
  onError: (err: string) => void,
  onComplete: () => void
): Promise<() => void> {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(`${API_BASE}/threads/${threadId}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turnId, prompt, targetModel }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Retry failed' }));
        onError(errData.error || `HTTP ${res.status}`);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const block of lines) {
          if (!block.trim()) continue;
          const dataMatch = block.match(/^data:\s*(.+)$/m);
          if (dataMatch) {
            try {
              const parsed = JSON.parse(dataMatch[1].trim());
              if (parsed.error) {
                onError(parsed.error);
              } else if (parsed.providerId) {
                onChunk(parsed);
              }
            } catch (e) {}
          }
        }
      }
      onComplete();
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        onError(err.message || 'Retry stream failed');
      }
    }
  })();

  return () => {
    controller.abort();
  };
}
