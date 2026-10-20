'use client';
// 🎵 배경음악(캐롤): 화면을 처음 누르면 시작되고, 오른쪽 위 버튼으로 끄고 켤 수 있어요.
// 부모님 목소리가 나오거나 녹음하는 동안에는 잠깐 멈췄다가 끝나면 다시 나와요.
import { useEffect, useRef, useState } from 'react';

const KEY_OFF = 'xmas-bgm-off';
const KEY_POS = 'xmas-bgm-pos';

// 다른 화면에서 "잠깐 멈춰!" / "다시 틀어!" 를 부를 때 쓰는 함수
export function bgmHold(on) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('bgm:hold', { detail: !!on }));
}

export default function Bgm() {
  const audioRef = useRef(null);
  const holdRef = useRef(false);
  const offRef = useRef(false);
  const startedRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [off, setOff] = useState(false);

  useEffect(() => {
    const a = audioRef.current;
    let saved = 0;
    try {
      offRef.current = sessionStorage.getItem(KEY_OFF) === '1';
      saved = Number(sessionStorage.getItem(KEY_POS) || 0);
    } catch {}
    setOff(offRef.current);
    a.volume = 0.45;

    const tryPlay = () => {
      if (offRef.current || holdRef.current) return;
      if (!startedRef.current && saved > 0) {
        try {
          a.currentTime = saved;
        } catch {}
      }
      startedRef.current = true;
      a.play().catch(() => {});
    };

    // 브라우저 규칙: 사람이 화면을 한 번 눌러야 소리를 낼 수 있어요
    const firstTouch = () => {
      tryPlay();
      window.removeEventListener('pointerdown', firstTouch);
      window.removeEventListener('keydown', firstTouch);
    };
    window.addEventListener('pointerdown', firstTouch);
    window.addEventListener('keydown', firstTouch);

    const onHold = (e) => {
      holdRef.current = e.detail;
      if (e.detail) a.pause();
      else if (startedRef.current) tryPlay();
    };
    window.addEventListener('bgm:hold', onHold);

    const savePos = () => {
      try {
        sessionStorage.setItem(KEY_POS, String(a.currentTime || 0));
      } catch {}
    };
    window.addEventListener('pagehide', savePos);
    const timer = setInterval(savePos, 3000);

    return () => {
      window.removeEventListener('pointerdown', firstTouch);
      window.removeEventListener('keydown', firstTouch);
      window.removeEventListener('bgm:hold', onHold);
      window.removeEventListener('pagehide', savePos);
      clearInterval(timer);
    };
  }, []);

  function toggle(e) {
    e.stopPropagation();
    const a = audioRef.current;
    const next = !a.paused; // 나오고 있으면 끄고, 멈춰 있으면 켜요
    offRef.current = next;
    setOff(next);
    try {
      sessionStorage.setItem(KEY_OFF, next ? '1' : '0');
    } catch {}
    if (next) a.pause();
    else if (!holdRef.current) {
      startedRef.current = true;
      a.play().catch(() => {});
    }
  }

  return (
    <>
      <audio
        ref={audioRef}
        src="/bgm.mp3"
        loop
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      <button
        className={`bgm-btn ${playing ? 'on' : ''}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={toggle}
        aria-label={off ? '배경음악 켜기' : '배경음악 끄기'}
      >
        {off ? '🔇' : '🎵'}
      </button>
    </>
  );
}
