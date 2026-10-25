import type { InterpretedCommand } from '@/types';

export type VoiceErrorReason =
  | 'unsupported_browser' | 'permission_denied' | 'no_microphone' | 'too_short'
  | 'service_unavailable' | 'unknown_command' | 'request_failed';

export type VoiceState =
  | { s: 'idle' }
  | { s: 'requesting_permission' }
  | { s: 'recording'; startedAt: number }
  | { s: 'transcribing' }
  | { s: 'interpreting'; transcript: string }
  /** Something is missing or ambiguous: the user must fill it in before confirming. */
  | { s: 'clarification'; transcript: string; command: InterpretedCommand }
  | { s: 'confirmation'; transcript: string; command: InterpretedCommand }
  /** A question (how much is left, what is low) — nothing to save. */
  | { s: 'answer'; transcript: string; command: InterpretedCommand }
  /** Saving and its outcome are tracked by useStockSubmission; success only comes from the server. */
  | { s: 'committing'; transcript: string; command: InterpretedCommand }
  | { s: 'error'; reason: VoiceErrorReason; error?: unknown };

export type VoiceEvent =
  | { type: 'REQUEST_MIC' }
  | { type: 'MIC_READY'; at: number }
  | { type: 'STOP' }
  | { type: 'TRANSCRIBED'; text: string }
  | { type: 'TEXT_SUBMITTED'; text: string }
  | { type: 'INTERPRETED'; command: InterpretedCommand }
  | { type: 'COMMIT' }
  | { type: 'FAIL'; reason: VoiceErrorReason; error?: unknown }
  | { type: 'RESET' };

/** Pure decision: which review state does an interpreted command lead to? */
export function stateForCommand(transcript: string, command: InterpretedCommand): VoiceState {
  switch (command.action) {
    case 'unknown':
      return { s: 'error', reason: 'unknown_command' };
    case 'query_stock':
    case 'list_low_stock':
    case 'list_reorder':
      return { s: 'answer', transcript, command };
    default: {
      const ambiguous = command.product_candidates.length !== 1;
      const missing = !command.quantity || !command.unit_code;
      if (command.clarification_question || ambiguous || missing) return { s: 'clarification', transcript, command };
      // Stock changes ALWAYS go through confirmation, whatever `requires_confirmation` says.
      return { s: 'confirmation', transcript, command };
    }
  }
}

export function voiceReducer(state: VoiceState, event: VoiceEvent): VoiceState {
  switch (event.type) {
    case 'REQUEST_MIC':
      return state.s === 'recording' ? state : { s: 'requesting_permission' };
    case 'MIC_READY':
      return state.s === 'requesting_permission' ? { s: 'recording', startedAt: event.at } : state;
    case 'STOP':
      return state.s === 'recording' ? { s: 'transcribing' } : state;
    case 'TRANSCRIBED':
      return state.s === 'transcribing' ? { s: 'interpreting', transcript: event.text } : state;
    case 'TEXT_SUBMITTED':
      return { s: 'interpreting', transcript: event.text };
    case 'INTERPRETED':
      return state.s === 'interpreting' ? stateForCommand(state.transcript, event.command) : state;
    case 'COMMIT':
      return state.s === 'confirmation' || state.s === 'clarification' ? { s: 'committing', transcript: state.transcript, command: state.command } : state;
    case 'FAIL':
      return { s: 'error', reason: event.reason, error: event.error };
    case 'RESET':
      return { s: 'idle' };
  }
}

export const BUSY_STATES: VoiceState['s'][] = ['requesting_permission', 'transcribing', 'interpreting', 'committing'];
