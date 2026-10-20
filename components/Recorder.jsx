'use client';
// 🎙️ 부모님 녹음 화면: 반 고르기 → 이름 적기 → 녹음 → 다시 듣기 → 올리기
import { useEffect, useRef, useState } from 'react';
import Snow from './Snow';
import { toSmallMp3 } from '@/lib/mp3';
import { isKakaoInApp, openInExternalBrowser } from '@/lib/client';
import { bgmHold } from './Bgm';

const MAX_SEC = 60;

// 이름 끝 글자에 받침이 있으면 "아", 없으면 "야" (하은아 / 지우야)
function callName(name) {
  const last = name.charCodeAt(name.length - 1);
  if (last >= 0xac00 && last <= 0xd7a3) return name + ((last - 0xac00) % 28 ? '아' : '야');
  return name + '야';
}

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  const list = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/aac'];
  return list.find((t) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '';
}

export default function Recorder({ space }) {
  const [step, setStep] = useState(1); // 1 반 2 이름 3 녹음 4 듣기 5 완료
  const [classIdx, setClassIdx] = useState(space.classes.length === 1 ? 0 : -1);
  const [name, setName] = useState('');
  const [recording, setRecording] = useState(false);
  const [sec, setSec] = useState(0);
  const [level, setLevel] = useState(0);
  const [packing, setPacking] = useState(false);
  const [result, setResult] = useState(null); // { blob, url, seconds }
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [kakao, setKakao] = useState(false);

  const recRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startRef = useRef(0);
  const meterRef = useRef(null);

  useEffect(() => {
    setKakao(isKakaoInApp());
    if (space.classes.length === 1) setStep(2);
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 녹음하고 다시 듣는 동안에는 캐롤이 녹음에 섞이지 않게 멈춰요
  useEffect(() => {
    bgmHold(step === 3 || step === 4);
  }, [step]);
  useEffect(() => () => bgmHold(false), []);

  function cleanup() {
    clearInterval(timerRef.current);
    if (meterRef.current) {
      cancelAnimationFrame(meterRef.current.raf);
      meterRef.current.ctx.close && meterRef.current.ctx.close();
      meterRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  async function startRecording() {
    setError('');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError(
        kakao
          ? '카카오톡 안에서는 녹음이 안 될 수 있어요. 아래 "인터넷으로 열기" 버튼을 눌러 주세요.'
          : '이 브라우저에서는 녹음이 안 돼요. 휴대폰 기본 인터넷(사파리/크롬)으로 열어 주세요.'
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data && e.data.size && chunksRef.current.push(e.data);
      rec.onstop = onStopped;
      rec.start(250);
      recRef.current = rec;
      startRef.current = Date.now();
      setSec(0);
      setRecording(true);
      timerRef.current = setInterval(() => {
        const s = (Date.now() - startRef.current) / 1000;
        setSec(s);
        if (s >= MAX_SEC) stopRecording();
      }, 200);

      // 목소리 크기에 맞춰 버튼이 반짝이게
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        const ctx = new AC();
        const an = ctx.createAnalyser();
        an.fftSize = 256;
        ctx.createMediaStreamSource(stream).connect(an);
        const data = new Uint8Array(an.fftSize);
        const tick = () => {
          an.getByteTimeDomainData(data);
          let max = 0;
          for (const v of data) max = Math.max(max, Math.abs(v - 128));
          setLevel(Math.min(26, max / 2.5));
          meterRef.current.raf = requestAnimationFrame(tick);
        };
        meterRef.current = { ctx, raf: requestAnimationFrame(tick) };
      } catch {}
    } catch (e) {
      cleanup();
      setError(
        e && e.name === 'NotAllowedError'
          ? '마이크 사용이 막혀 있어요. 주소창 옆 설정에서 마이크를 "허용"으로 바꾼 뒤 다시 눌러 주세요.'
          : kakao
          ? '카카오톡 안에서는 녹음이 안 될 수 있어요. 아래 "인터넷으로 열기" 버튼을 눌러 주세요.'
          : '마이크를 켜지 못했어요. 다시 한 번 눌러 주세요.'
      );
    }
  }

  function stopRecording() {
    clearInterval(timerRef.current);
    const rec = recRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
    setRecording(false);
    setLevel(0);
  }

  async function onStopped() {
    const rec = recRef.current;
    const type = (rec && rec.mimeType) || 'audio/webm';
    const raw = new Blob(chunksRef.current, { type });
    const seconds = (Date.now() - startRef.current) / 1000;
    cleanup();
    if (seconds < 1.2 || raw.size < 1000) {
      setError('녹음이 너무 짧아요. 버튼을 누르고 천천히 말씀해 주세요.');
      return;
    }
    setPacking(true);
    try {
      const small = await toSmallMp3(raw);
      setResult({ blob: small.blob, url: URL.createObjectURL(small.blob), seconds: small.seconds });
      setStep(4);
    } catch (e) {
      console.error(e);
      setError('녹음을 정리하지 못했어요. 한 번 더 녹음해 주세요.');
    } finally {
      setPacking(false);
    }
  }

  function retry() {
    if (result) URL.revokeObjectURL(result.url);
    setResult(null);
    setSec(0);
    setError('');
    setStep(3);
  }

  async function upload() {
    if (!result) return;
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('classIdx', String(classIdx));
      fd.append('name', name.trim());
      fd.append('audio', result.blob, 'letter.mp3');
      const r = await fetch(`/api/spaces/${space.code}/recordings`, { method: 'POST', body: fd });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || '올리지 못했어요.');
      setStep(5);
    } catch (e) {
      setError(e.message || '올리지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.');
    } finally {
      setUploading(false);
    }
  }

  function again() {
    if (result) URL.revokeObjectURL(result.url);
    setResult(null);
    setName('');
    setSec(0);
    setStep(space.classes.length === 1 ? 2 : 1);
  }

  const left = Math.max(0, Math.ceil(MAX_SEC - sec));
  const totalSteps = 4;
  const dot = Math.min(step, 4);

  return (
    <main className="page">
      <div className="page-bg" />
      <Snow count={24} twinkles={12} />
      <div className="wrap">
        <h1 className="title" style={{ fontSize: 25 }}>
          <span className="gold">{space.org}</span>
          <br />
          우리 아이에게
          <br />
          크리스마스 편지 🎄
        </h1>
        {step < 5 && (
          <div className="steps" aria-hidden="true">
            {Array.from({ length: totalSteps }, (_, i) => (
              <i key={i} className={i < dot ? 'on' : ''} />
            ))}
          </div>
        )}

        {kakao && step === 3 && (
          <div className="card" style={{ padding: 14 }}>
            <div className="notice" style={{ marginBottom: 10 }}>
              카카오톡 안에서는 녹음이 안 될 수도 있어요. 녹음이 안 되면 아래 버튼을 눌러 주세요.
            </div>
            <button className="btn btn-ghost" onClick={openInExternalBrowser}>🌐 인터넷(사파리·크롬)으로 열기</button>
          </div>
        )}

        {step === 1 && (
          <div className="card">
            <span className="ribbon">🎀</span>
            <h2>우리 아이 반을 골라 주세요</h2>
            <div className="class-grid">
              {space.classes.map((c, i) => (
                <button
                  key={i}
                  className={`btn ${i % 2 ? 'btn-green' : 'btn-red'} ${classIdx === i ? 'sel' : ''}`}
                  onClick={() => {
                    setClassIdx(i);
                    setStep(2);
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <form
            className="card"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return setError('아이 이름을 적어 주세요.');
              setError('');
              setStep(3);
            }}
          >
            <span className="ribbon">🎁</span>
            <h2>아이 이름을 적어 주세요</h2>
            {error && <div className="error">{error}</div>}
            <div className="field">
              <label htmlFor="nm">{space.classes[classIdx]} 친구 이름</label>
              <input id="nm" className="input" value={name} maxLength={12} autoComplete="off"
                onChange={(e) => setName(e.target.value)} placeholder="예) 김하은" style={{ fontSize: 24, textAlign: 'center' }} />
              <div className="hint">선물상자 위에 이 이름이 둥둥 떠다녀요 ✨</div>
            </div>
            <div className="stack">
              <button className="btn btn-red">다음 →</button>
              {space.classes.length > 1 && (
                <button type="button" className="btn btn-ghost" onClick={() => { setError(''); setStep(1); }}>← 반 다시 고르기</button>
              )}
            </div>
          </form>
        )}

        {step === 3 && (
          <div className="card">
            <span className="ribbon">🎙️</span>
            <h2>{name.trim()}에게 편지를 들려주세요</h2>
            {error && <div className="error">{error}</div>}
            {!recording && !packing && (
              <div className="example">
                💡 이렇게 말해 보세요<br />
                &quot;사랑하는 {callName(name.trim())}, 메리 크리스마스! 올해도 씩씩하게 자라 줘서 고마워. 엄마 아빠가 많이 많이 사랑해!&quot;
              </div>
            )}
            <div className="mic-wrap">
              {packing ? (
                <>
                  <div className="spinner" />
                  <p className="guide">목소리를 선물상자에 포장하는 중… 🎁</p>
                </>
              ) : (
                <>
                  <button
                    className={`mic ${recording ? 'rec' : ''}`}
                    style={{ '--lvl': level + 'px' }}
                    onClick={recording ? stopRecording : startRecording}
                    aria-label={recording ? '녹음 멈추기' : '녹음 시작하기'}
                  >
                    {recording ? <span className="stop" /> : '🎙️'}
                  </button>
                  <div className="timer">
                    {recording ? <>{left}<small>초 남았어요</small></> : <small>최대 60초</small>}
                  </div>
                  <p className="guide">
                    {recording ? '다 말씀하셨으면 네모 버튼을 눌러 주세요' : '빨간 버튼을 누르면 녹음이 시작돼요'}
                  </p>
                </>
              )}
            </div>
            {!recording && !packing && (
              <button className="btn btn-ghost" onClick={() => { setError(''); setStep(2); }}>← 이름 다시 적기</button>
            )}
          </div>
        )}

        {step === 4 && result && (
          <div className="card">
            <span className="ribbon">🎧</span>
            <h2>잘 녹음됐는지 들어 보세요</h2>
            {error && <div className="error">{error}</div>}
            <div style={{ textAlign: 'center', fontFamily: 'var(--font-title)', fontSize: 18, color: 'var(--green-deep)' }}>
              {space.classes[classIdx]} · {name.trim()} · {Math.round(result.seconds)}초
            </div>
            <audio controls src={result.url} />
            <div className="stack">
              <button className="btn btn-red" onClick={upload} disabled={uploading}>
                {uploading ? '선물 보내는 중… 🎁' : '🎁 선물상자에 담아 보내기'}
              </button>
              <button className="btn btn-ghost" onClick={retry} disabled={uploading}>🔄 다시 녹음하기</button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="card" style={{ textAlign: 'center' }}>
            <div className="done-gift">🎁</div>
            <h2>편지가 도착했어요!</h2>
            <p style={{ fontSize: 17, lineHeight: 1.7, margin: '0 0 18px', wordBreak: 'keep-all' }}>
              {name.trim()}의 이름이 적힌 선물상자가
              <br />
              전시관에 둥둥 떠다니고 있어요 ✨
            </p>
            <div className="stack">
              <a className="btn btn-gold" href={`/s/${space.code}`}>🔔 전시관 구경하기</a>
              <button className="btn btn-ghost" onClick={again}>🎙️ 다른 아이 편지도 녹음하기</button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
