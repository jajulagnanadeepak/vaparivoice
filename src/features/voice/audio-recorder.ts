/**
 * Audio capture adapter (MediaRecorder). Produces a Blob that is uploaded to the backend
 * for transcription; no browser speech-recognition API is required.
 */
export type RecorderErrorCode = 'unsupported' | 'permission_denied' | 'no_microphone' | 'failed';

export class RecorderError extends Error {
  constructor(readonly code: RecorderErrorCode) {
    super(code);
    this.name = 'RecorderError';
  }
}

const MIME_PREFERENCE = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

export function isRecordingSupported(): boolean {
  return typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof window.MediaRecorder !== 'undefined';
}

export interface ActiveRecording {
  stop: () => Promise<{ blob: Blob; durationMs: number }>;
  cancel: () => void;
}

export async function startRecording(opts: { onLevel?: (level: number) => void; maxSeconds: number; onAutoStop: () => void }): Promise<ActiveRecording> {
  if (!isRecordingSupported()) throw new RecorderError('unsupported');

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
  } catch (e) {
    const name = (e as DOMException)?.name;
    if (name === 'NotAllowedError' || name === 'SecurityError') throw new RecorderError('permission_denied');
    if (name === 'NotFoundError' || name === 'OverconstrainedError') throw new RecorderError('no_microphone');
    throw new RecorderError('failed');
  }

  const mimeType = MIME_PREFERENCE.find((m) => MediaRecorder.isTypeSupported(m));
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };

  // Audio level meter (visual feedback only)
  let raf = 0;
  let ctx: AudioContext | null = null;
  try {
    ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const v of data) sum += ((v - 128) / 128) ** 2;
      opts.onLevel?.(Math.min(1, Math.sqrt(sum / data.length) * 3));
      raf = requestAnimationFrame(tick);
    };
    tick();
  } catch { /* meter is optional */ }

  const started = performance.now();
  const autoStop = window.setTimeout(opts.onAutoStop, opts.maxSeconds * 1000);
  recorder.start(250);

  const release = () => {
    window.clearTimeout(autoStop);
    cancelAnimationFrame(raf);
    stream.getTracks().forEach((tr) => tr.stop());
    void ctx?.close().catch(() => undefined);
    opts.onLevel?.(0);
  };

  return {
    stop: () => new Promise((resolve) => {
      recorder.onstop = () => {
        release();
        resolve({ blob: new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }), durationMs: performance.now() - started });
      };
      if (recorder.state !== 'inactive') recorder.stop(); else recorder.onstop(new Event('stop'));
    }),
    cancel: () => {
      recorder.onstop = null;
      if (recorder.state !== 'inactive') recorder.stop();
      release();
    },
  };
}
