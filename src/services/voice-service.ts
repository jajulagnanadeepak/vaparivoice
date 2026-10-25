import { apiClient, IDEMPOTENCY_HEADER } from '@/lib/api-client';
import type { ConfirmCommandRequest, InterpretRequest, InterpretedCommand, LanguageCode, StockMovement, TranscriptionResponse, VoiceCapabilities } from '@/types';

/**
 * Provider integrations (STT, NLU, TTS) live behind the backend. The frontend
 * only uploads audio and receives structured results.
 */
export const voiceService = {
  capabilities: () => apiClient.get<VoiceCapabilities>('/voice/capabilities').then((r) => r.data),
  transcribe: (audio: Blob, language?: LanguageCode) => {
    const form = new FormData();
    const ext = audio.type.includes('mp4') ? 'm4a' : audio.type.includes('ogg') ? 'ogg' : 'webm';
    form.append('audio', audio, `command.${ext}`);
    if (language) form.append('language_hint', language);
    return apiClient.post<TranscriptionResponse>('/voice/transcribe', form, { timeout: 45_000 }).then((r) => r.data);
  },
  interpret: (body: InterpretRequest) => apiClient.post<InterpretedCommand>('/voice/interpret', body).then((r) => r.data),
  confirm: (body: ConfirmCommandRequest, key: string) =>
    apiClient.post<StockMovement>('/voice/confirm', body, { headers: { [IDEMPOTENCY_HEADER]: key } }).then((r) => r.data),
  speak: (text: string, language: LanguageCode) =>
    apiClient.post<Blob>('/voice/speak', { text, language }, { responseType: 'blob' }).then((r) => r.data),
};
