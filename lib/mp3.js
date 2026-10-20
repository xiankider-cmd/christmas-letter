// 🗜️ 녹음 파일을 작게 줄이는 도구
// 휴대폰이 녹음한 소리를 → 한 줄(모노) 소리로 → 22kHz로 → 32kbps mp3로 바꿔요.
// 60초 녹음이 약 0.24MB가 돼요. (어느 휴대폰에서나 잘 들리는 mp3 형식)

const TARGET_RATE = 22050;
const KBPS = 32;

async function decode(arrayBuffer) {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  try {
    return await new Promise((resolve, reject) => {
      const p = ctx.decodeAudioData(arrayBuffer, resolve, reject);
      if (p && p.then) p.then(resolve, reject);
    });
  } finally {
    ctx.close && ctx.close();
  }
}

async function toMono22k(audio) {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const length = Math.max(1, Math.ceil(audio.duration * TARGET_RATE));
  try {
    const off = new OAC(1, length, TARGET_RATE);
    const src = off.createBufferSource();
    src.buffer = audio;
    src.connect(off.destination);
    src.start(0);
    const rendered = await new Promise((resolve, reject) => {
      off.oncomplete = (e) => resolve(e.renderedBuffer);
      const p = off.startRendering();
      if (p && p.then) p.then(resolve, reject);
    });
    return rendered.getChannelData(0);
  } catch {
    // 예전 휴대폰용: 직접 줄이기
    const ch = audio.numberOfChannels;
    const mono = new Float32Array(audio.length);
    for (let c = 0; c < ch; c++) {
      const d = audio.getChannelData(c);
      for (let i = 0; i < d.length; i++) mono[i] += d[i] / ch;
    }
    const ratio = audio.sampleRate / TARGET_RATE;
    const out = new Float32Array(Math.floor(mono.length / ratio));
    for (let i = 0; i < out.length; i++) {
      const pos = i * ratio;
      const i0 = Math.floor(pos);
      const f = pos - i0;
      out[i] = mono[i0] * (1 - f) + (mono[i0 + 1] ?? mono[i0]) * f;
    }
    return out;
  }
}

export async function toSmallMp3(blob) {
  const { Mp3Encoder } = await import('@breezystack/lamejs');
  const audio = await decode(await blob.arrayBuffer());
  const samples = await toMono22k(audio);

  // 목소리가 작으면 조금 키워요 (최대 3배)
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i]);
    if (a > peak) peak = a;
  }
  const gain = peak > 0 ? Math.min(3, 0.95 / peak) : 1;

  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i] * gain));
    pcm[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }

  const enc = new Mp3Encoder(1, TARGET_RATE, KBPS);
  const chunks = [];
  const STEP = 1152;
  for (let i = 0; i < pcm.length; i += STEP) {
    const buf = enc.encodeBuffer(pcm.subarray(i, i + STEP));
    if (buf.length) chunks.push(new Uint8Array(buf));
  }
  const end = enc.flush();
  if (end.length) chunks.push(new Uint8Array(end));

  return {
    blob: new Blob(chunks, { type: 'audio/mpeg' }),
    seconds: audio.duration,
  };
}
