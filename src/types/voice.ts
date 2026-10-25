import type { DecimalString, LanguageCode, UUID } from './common';

export type VoiceAction = 'stock_in' | 'stock_out' | 'query_stock' | 'list_low_stock' | 'list_reorder' | 'unknown';

export interface TranscriptionResponse {
  transcript_id: UUID;
  text: string;
  detected_language: LanguageCode | 'mixed' | null;
  confidence: number | null;
}

/** `transcript_id` is absent for typed commands (manual fallback). */
export interface InterpretRequest { transcript_id?: UUID; text: string; language_hint?: LanguageCode; input: 'speech' | 'typed' }

/** What the configured speech provider actually supports. The UI never claims more than this. */
export interface VoiceCapabilities {
  speech_to_text: { available: boolean; languages: LanguageCode[] };
  text_to_speech: { available: boolean; languages: LanguageCode[] };
  max_recording_seconds: number;
}

export interface InterpretedCommand {
  command_id: UUID;
  action: VoiceAction;
  product_candidates: { id: UUID; name: string; score: number }[];
  quantity: DecimalString | null;
  unit_code: string | null;
  current_stock: DecimalString | null;
  proposed_stock: DecimalString | null;
  clarification_question: string | null;
  warnings: string[];
  requires_confirmation: boolean;
}

export interface ConfirmCommandRequest {
  command_id: UUID;
  product_id: UUID;
  action: Extract<VoiceAction, 'stock_in' | 'stock_out'>;
  quantity: DecimalString;
  unit_code: string;
}
