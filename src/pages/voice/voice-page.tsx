import { useCallback, useEffect, useReducer, useRef, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowDownToLine, Keyboard, Mic, ShoppingCart, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/common/page-header';
import { MovementList } from '@/components/inventory/movement-list';
import { ProductName } from '@/components/inventory/product-name';
import { SubmissionStatus } from '@/components/inventory/submission-status';
import { CommandReview } from '@/components/voice/command-review';
import { LevelMeter, MicButton } from '@/components/voice/mic-button';
import { useI18n } from '@/features/i18n/i18n-provider';
import { useShop } from '@/features/shops/shop-provider';
import { useStockSubmission } from '@/features/inventory/use-stock-submission';
import { useProduct } from '@/features/products/queries';
import { isRecordingSupported, RecorderError, startRecording, type ActiveRecording } from '@/features/voice/audio-recorder';
import { BUSY_STATES, voiceReducer, type VoiceErrorReason } from '@/features/voice/voice-machine';
import { useErrorMessage } from '@/hooks/use-error-message';
import { formatQuantity } from '@/lib/format';
import { ApiError } from '@/lib/api-error';
import { ALL_LANGUAGES, LANGUAGE_REGISTRY } from '@/locales';
import type { TranslationKey } from '@/locales';
import { inventoryService } from '@/services/inventory-service';
import { voiceService } from '@/services/voice-service';
import type { ConfirmCommandRequest, InterpretedCommand, LanguageCode } from '@/types';

const MIN_RECORDING_MS = 700;
const ERROR_TEXT: Record<VoiceErrorReason, TranslationKey> = {
  unsupported_browser: 'voice.unsupportedBrowser', permission_denied: 'voice.permissionDenied', no_microphone: 'voice.noMicrophone',
  too_short: 'voice.tooShort', service_unavailable: 'voice.serviceUnavailable', unknown_command: 'voice.unknownCommand', request_failed: 'voice.errorTitle',
};

function useSpeak(language: LanguageCode, enabled: boolean) {
  const [playing, setPlaying] = useState(false);
  const speak = useCallback(async (text: string) => {
    if (!enabled) return;
    setPlaying(true);
    try {
      const blob = await voiceService.speak(text, language);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => { URL.revokeObjectURL(url); setPlaying(false); };
      await audio.play();
    } catch { setPlaying(false); }
  }, [language, enabled]);
  return { speak, playing };
}

function StockAnswer({ command, speechLang, ttsEnabled }: { command: InterpretedCommand; speechLang: LanguageCode; ttsEnabled: boolean }) {
  const { t, locale } = useI18n();
  const candidate = command.product_candidates.length === 1 ? command.product_candidates[0] : undefined;
  const product = useProduct(candidate?.id ?? '');
  const { speak, playing } = useSpeak(speechLang, ttsEnabled);
  if (command.action !== 'query_stock') {
    return <Button asChild size="xl" className="w-full"><Link to="/alerts"><AlertTriangle aria-hidden />{t('voice.lowStockAnswer')}</Link></Button>;
  }
  if (!candidate) return <p className="text-base">{t('voice.chooseProduct')} <Link to="/stock/check" className="font-medium text-primary underline">{t('nav.checkStock')}</Link></p>;
  if (!product.data) return <p className="text-muted-foreground">{t('common.loading')}</p>;
  const qty = formatQuantity(product.data.current_stock, product.data.base_unit.code, locale);
  const sentence = t('voice.answerStock', { product: product.data.name, qty });
  return (
    <div className="space-y-3 text-center">
      <p className="text-lg"><ProductName name={product.data.name} className="font-semibold" /></p>
      <p className="text-5xl font-bold tabular" aria-live="polite">{qty}</p>
      {ttsEnabled && <Button variant="outline" onClick={() => void speak(sentence)} loading={playing}><Volume2 aria-hidden />{t('voice.playAnswer')}</Button>}
    </div>
  );
}

export default function VoicePage() {
  const { t } = useI18n();
  const errorMessage = useErrorMessage();
  const { activeShop } = useShop();
  const [state, dispatch] = useReducer(voiceReducer, { s: 'idle' });
  const [level, setLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [typed, setTyped] = useState('');
  const recordingRef = useRef<ActiveRecording | null>(null);

  // What the configured speech service really supports — never assumed.
  const caps = useQuery({ queryKey: ['voice', 'capabilities'], queryFn: voiceService.capabilities, staleTime: 10 * 60_000, retry: 1 });
  const sttLangs = caps.data?.speech_to_text.available ? caps.data.speech_to_text.languages : [];
  const [speechLang, setSpeechLang] = useState<LanguageCode | null>(null);
  useEffect(() => {
    if (speechLang || !caps.data) return;
    const preferred = activeShop?.voice_language;
    setSpeechLang(preferred && sttLangs.includes(preferred) ? preferred : (sttLangs[0] ?? preferred ?? 'en'));
  }, [caps.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const lang = speechLang ?? activeShop?.voice_language ?? 'en';
  const ttsEnabled = !!caps.data?.text_to_speech.available && caps.data.text_to_speech.languages.includes(lang);

  const micBlock: TranslationKey | null =
    !isRecordingSupported() ? 'voice.unsupportedBrowser'
    : caps.isError || (caps.data && !caps.data.speech_to_text.available) ? 'voice.serviceUnavailable'
    : caps.data && !sttLangs.includes(lang) ? 'voice.languageUnavailable'
    : null;

  const submission = useStockSubmission<ConfirmCommandRequest>(voiceService.confirm);

  // Recording timer
  useEffect(() => {
    if (state.s !== 'recording') { setElapsed(0); return; }
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - state.startedAt) / 1000)), 250);
    return () => window.clearInterval(id);
  }, [state]);

  // Release the microphone if the user leaves the page mid-recording.
  useEffect(() => () => recordingRef.current?.cancel(), []);

  const interpret = useCallback(async (text: string, transcriptId?: string) => {
    try {
      const command = await voiceService.interpret({ text, transcript_id: transcriptId, language_hint: lang, input: transcriptId ? 'speech' : 'typed' });
      dispatch({ type: 'INTERPRETED', command });
    } catch (error) {
      dispatch({ type: 'FAIL', reason: error instanceof ApiError && (error.status === 501 || error.status === 503) ? 'service_unavailable' : 'request_failed', error });
    }
  }, [lang]);

  const stopAndProcess = useCallback(async () => {
    const rec = recordingRef.current;
    if (!rec) return;
    recordingRef.current = null;
    dispatch({ type: 'STOP' });
    const { blob, durationMs } = await rec.stop();
    if (durationMs < MIN_RECORDING_MS || blob.size < 800) { dispatch({ type: 'FAIL', reason: 'too_short' }); return; }
    try {
      const tr = await voiceService.transcribe(blob, lang);
      if (!tr.text.trim()) { dispatch({ type: 'FAIL', reason: 'too_short' }); return; }
      dispatch({ type: 'TRANSCRIBED', text: tr.text });
      await interpret(tr.text, tr.transcript_id);
    } catch (error) {
      dispatch({ type: 'FAIL', reason: error instanceof ApiError && (error.status === 501 || error.status === 503) ? 'service_unavailable' : 'request_failed', error });
    }
  }, [interpret, lang]);

  const onMic = async () => {
    if (state.s === 'recording') { void stopAndProcess(); return; }
    submission.reset();
    dispatch({ type: 'REQUEST_MIC' });
    try {
      recordingRef.current = await startRecording({ onLevel: setLevel, maxSeconds: caps.data?.max_recording_seconds ?? 15, onAutoStop: () => void stopAndProcess() });
      dispatch({ type: 'MIC_READY', at: Date.now() });
    } catch (e) {
      const code = e instanceof RecorderError ? e.code : 'failed';
      dispatch({ type: 'FAIL', reason: code === 'permission_denied' ? 'permission_denied' : code === 'no_microphone' ? 'no_microphone' : code === 'unsupported' ? 'unsupported_browser' : 'request_failed' });
    }
  };

  const onTyped = (e: FormEvent) => {
    e.preventDefault();
    const text = typed.trim();
    if (!text) return;
    submission.reset();
    dispatch({ type: 'TEXT_SUBMITTED', text });
    void interpret(text);
  };

  const reset = () => { submission.reset(); dispatch({ type: 'RESET' }); };

  const recent = useQuery({ queryKey: ['movements', 'recent-voice'], queryFn: () => inventoryService.movements({ source: 'voice', page_size: 5 }).then((r) => r.items) });

  const busy = BUSY_STATES.includes(state.s) && state.s !== 'committing';
  const micMode = micBlock ? 'disabled' : state.s === 'recording' ? 'recording' : busy ? 'busy' : 'ready';
  const statusText =
    micBlock ? t(micBlock, { language: LANGUAGE_REGISTRY[lang].nativeName })
    : state.s === 'requesting_permission' ? t('voice.requesting')
    : state.s === 'recording' ? t('voice.recording')
    : state.s === 'transcribing' ? t('voice.transcribing')
    : state.s === 'interpreting' ? t('voice.interpreting')
    : state.s === 'clarification' ? t('voice.clarification')
    : state.s === 'confirmation' ? t('voice.confirmation')
    : t('voice.idle');
  const inReview = state.s === 'clarification' || state.s === 'confirmation';

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t('voice.title')} description={t('voice.subtitle')} />

      {/* Speech language — separate from the app language; options come from the speech service. */}
      <Card className="mb-4 flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
        <Label htmlFor="speech-lang" className="text-base">{t('voice.speechLanguage')}</Label>
        <NativeSelect id="speech-lang" className="sm:w-64" value={lang} onChange={(e) => setSpeechLang(e.target.value as LanguageCode)} disabled={state.s === 'recording' || busy}>
          {ALL_LANGUAGES.map((l) => {
            const ok = sttLangs.includes(l);
            return <option key={l} value={l} disabled={!!caps.data && !ok}>{LANGUAGE_REGISTRY[l].nativeName}{caps.data && !ok ? ` (${t('voice.notSupported')})` : ''}</option>;
          })}
        </NativeSelect>
      </Card>

      {state.s === 'committing' ? (
        <SubmissionStatus
          state={submission.state}
          onRetry={submission.retry}
          onCheck={() => void submission.checkStatus()}
          onBackToEdit={() => { submission.reset(); dispatch({ type: 'RESET' }); }}
          successActions={<><Button size="lg" onClick={reset}><Mic aria-hidden />{t('voice.retry')}</Button><Button size="lg" variant="ghost" asChild><Link to="/">{t('common.goHome')}</Link></Button></>}
        />
      ) : inReview ? (
        <CommandReview
          key={state.command.command_id}
          transcript={state.transcript}
          command={state.command}
          onCancel={reset}
          onConfirm={(body) => { dispatch({ type: 'COMMIT' }); void submission.submit(body); }}
        />
      ) : (
        <Card className="flex flex-col items-center gap-4 p-6">
          <MicButton mode={micMode} level={level} label={micBlock ? t('voice.typeInstead') : state.s === 'recording' ? t('voice.tapToStop') : t('voice.tapToSpeak')} onPress={() => void onMic()} />
          {state.s === 'recording' && (
            <div className="flex items-center gap-3"><LevelMeter level={level} /><span className="text-lg font-semibold tabular">{t('voice.seconds', { n: elapsed })}</span></div>
          )}
          {state.s !== 'error' && <p role="status" aria-live="polite" className="max-w-md text-center text-base">{statusText}</p>}

          {state.s === 'interpreting' && <p className="text-lg" dir="auto">“{state.transcript}”</p>}

          {state.s === 'error' && (
            <div role="alert" className="w-full rounded-lg border border-destructive/20 bg-destructive-soft p-4 text-center">
              <p className="font-semibold text-destructive">{t('voice.errorTitle')}</p>
              <p className="mt-1 text-base">{state.reason === 'request_failed' ? errorMessage(state.error) : t(ERROR_TEXT[state.reason])}</p>
              <div className="mt-3 flex flex-col justify-center gap-2 sm:flex-row">
                <Button onClick={reset}>{t('voice.retry')}</Button>
                <Button asChild variant="outline"><Link to="/stock/in">{t('nav.addStock')}</Link></Button>
                <Button asChild variant="outline"><Link to="/stock/sale">{t('nav.recordSale')}</Link></Button>
              </div>
            </div>
          )}

          {state.s === 'answer' && (
            <div className="w-full space-y-3 rounded-lg bg-muted/60 p-4">
              <p className="text-center text-sm text-muted-foreground" dir="auto">“{state.transcript}”</p>
              <StockAnswer command={state.command} speechLang={lang} ttsEnabled={ttsEnabled} />
            </div>
          )}

          {(state.s === 'idle' || state.s === 'error') && !micBlock && (
            <div className="w-full rounded-lg bg-muted/60 p-4 text-sm">
              <p className="mb-1 font-semibold">{t('voice.examples')}</p>
              <ul className="space-y-1 text-muted-foreground" dir="auto">
                <li>{t('voice.ex1')}</li><li>{t('voice.ex2')}</li><li>{t('voice.ex3')}</li><li>{t('voice.ex4')}</li>
              </ul>
            </div>
          )}
        </Card>
      )}

      {/* Manual fallback is always available */}
      {!inReview && state.s !== 'committing' && (
        <Card className="mt-4 p-4">
          <form onSubmit={onTyped} className="space-y-2">
            <Label htmlFor="typed-command" className="flex items-center gap-2 text-base"><Keyboard className="size-5" aria-hidden />{t('voice.typeInstead')}</Label>
            <div className="flex gap-2">
              <Input id="typed-command" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={t('voice.typePlaceholder')} dir="auto" enterKeyHint="send" className="h-12 text-base" disabled={busy || state.s === 'recording'} />
              <Button type="submit" size="lg" disabled={!typed.trim() || busy || state.s === 'recording'}>{t('voice.send')}</Button>
            </div>
          </form>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button asChild variant="outline" size="lg"><Link to="/stock/in"><ArrowDownToLine className="text-success" aria-hidden />{t('nav.addStock')}</Link></Button>
            <Button asChild variant="outline" size="lg"><Link to="/stock/sale"><ShoppingCart className="text-primary" aria-hidden />{t('nav.recordSale')}</Link></Button>
          </div>
        </Card>
      )}

      <Card className="mt-4 p-4">
        <h2 className="font-semibold">{t('voice.recent')}</h2>
        {recent.data?.length ? <MovementList items={recent.data} /> : <p className="py-4 text-sm text-muted-foreground">{recent.isError ? errorMessage(recent.error) : t('voice.noRecent')}</p>}
      </Card>
    </div>
  );
}
