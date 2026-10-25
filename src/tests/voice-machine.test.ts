import { stateForCommand, voiceReducer, type VoiceState } from '@/features/voice/voice-machine';
import type { InterpretedCommand } from '@/types';

const cmd = (over: Partial<InterpretedCommand> = {}): InterpretedCommand => ({
  command_id: 'c1', action: 'stock_in', product_candidates: [{ id: 'p1', name: 'Rice', score: 0.95 }], quantity: '10', unit_code: 'bag',
  current_stock: '500', proposed_stock: '1000', clarification_question: null, warnings: [], requires_confirmation: false, ...over,
});

describe('voice state machine', () => {
  it('always asks for confirmation on a stock change, even if the backend says it is not required', () => {
    expect(stateForCommand('t', cmd()).s).toBe('confirmation');
  });
  it('asks for clarification when the product is ambiguous or missing', () => {
    expect(stateForCommand('t', cmd({ product_candidates: [{ id: 'a', name: 'A', score: 0.5 }, { id: 'b', name: 'B', score: 0.5 }] })).s).toBe('clarification');
    expect(stateForCommand('t', cmd({ product_candidates: [] })).s).toBe('clarification');
  });
  it('asks for clarification when quantity or unit is missing', () => {
    expect(stateForCommand('t', cmd({ quantity: null })).s).toBe('clarification');
    expect(stateForCommand('t', cmd({ unit_code: null })).s).toBe('clarification');
  });
  it('treats questions as answers with nothing to save', () => {
    expect(stateForCommand('t', cmd({ action: 'query_stock' })).s).toBe('answer');
    expect(stateForCommand('t', cmd({ action: 'unknown' }))).toEqual({ s: 'error', reason: 'unknown_command' });
  });
  it('walks the happy path and never reaches success on its own', () => {
    let s: VoiceState = { s: 'idle' };
    s = voiceReducer(s, { type: 'REQUEST_MIC' });
    expect(s.s).toBe('requesting_permission');
    s = voiceReducer(s, { type: 'MIC_READY', at: 1 });
    expect(s.s).toBe('recording');
    s = voiceReducer(s, { type: 'STOP' });
    expect(s.s).toBe('transcribing');
    s = voiceReducer(s, { type: 'TRANSCRIBED', text: 'add 10 bags rice' });
    expect(s).toEqual({ s: 'interpreting', transcript: 'add 10 bags rice' });
    s = voiceReducer(s, { type: 'INTERPRETED', command: cmd() });
    expect(s.s).toBe('confirmation');
    s = voiceReducer(s, { type: 'COMMIT' });
    expect(s.s).toBe('committing'); // success is decided by the server response, not the machine
  });
  it('ignores out-of-order events', () => {
    expect(voiceReducer({ s: 'idle' }, { type: 'STOP' })).toEqual({ s: 'idle' });
    expect(voiceReducer({ s: 'idle' }, { type: 'COMMIT' })).toEqual({ s: 'idle' });
  });
});
