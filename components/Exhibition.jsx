'use client';
// 🎁 전시관: 닫힌 대문 → 초인종 "딩동" → 문 안으로 → 금빛 별과 트리 장식볼에 아이 이름이 둥둥
import { useEffect, useMemo, useRef, useState } from 'react';
import Snow from './Snow';
import { playDingDong } from '@/lib/client';
import { bgmHold } from './Bgm';

// 장식볼 색깔: 하얀 진주색 / 노란 금색 (화려한 배경에서도 잘 보이게)
const BALLS = ['ball-pearl', 'ball-gold'];

// 금빛 별 그림
function Star() {
  return (
    <svg className="star" viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <radialGradient id="starGold" cx=".4" cy=".35">
          <stop offset="0" stopColor="#fffdf0" />
          <stop offset=".55" stopColor="#ffe27a" />
          <stop offset="1" stopColor="#e2a62a" />
        </radialGradient>
      </defs>
      <path
        d="M50 4l13.5 29 31.5 3.6-23.5 21.5 6.6 31.2L50 73.6 21.9 89.3l6.6-31.2L5 36.6l31.5-3.6z"
        fill="url(#starGold)"
        stroke="#fff"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 같은 아이는 항상 같은 자리, 같은 색이 되도록 "정해진 랜덤"을 만들어요
function seeded(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 10000) / 10000;
  };
}

export default function Exhibition({ space }) {
  const [stage, setStage] = useState('door'); // door | opening | inside
  const [recs, setRecs] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState(-1); // -1 = 전체
  const [playing, setPlaying] = useState(null);
  const [progress, setProgress] = useState(0);
  const [played, setPlayed] = useState(() => new Set());
  const [width, setWidth] = useState(390);
  const [insideSrc, setInsideSrc] = useState(null); // 안쪽 그림은 대문 그림이 다 온 뒤에 불러와요
  const loadInside = () => setInsideSrc((v) => v || '/inside.webp');
  const audioRef = useRef(null);

  // 녹음 목록 미리 가져오기
  useEffect(() => {
    let alive = true;
    fetch(`/api/spaces/${space.code}/recordings`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!alive) return;
        if (!ok) throw new Error(d.error);
        setRecs(d.recordings);
      })
      .catch((e) => alive && setLoadError(e.message || '목록을 불러오지 못했어요.'));
    return () => {
      alive = false;
    };
  }, [space.code]);

  useEffect(() => {
    const t = setTimeout(loadInside, 2500); // 대문 그림이 늦어도 2.5초 뒤엔 불러와요
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  function ringBell() {
    if (stage !== 'door') return;
    loadInside();
    playDingDong();
    if (navigator.vibrate) navigator.vibrate([60, 120, 60]);
    // 휴대폰에서 소리가 나도록 미리 준비해 둬요
    const a = audioRef.current;
    if (a) {
      a.muted = true;
      a.play().catch(() => {});
      a.pause();
      a.muted = false;
    }
    setTimeout(() => setStage('opening'), 650);
    setTimeout(() => setStage('inside'), 2600);
  }

  const counts = useMemo(() => {
    const c = space.classes.map(() => 0);
    (recs || []).forEach((r) => {
      if (c[r.classIdx] !== undefined) c[r.classIdx]++;
    });
    return c;
  }, [recs, space.classes]);

  const visible = useMemo(
    () => (recs || []).filter((r) => filter === -1 || r.classIdx === filter),
    [recs, filter]
  );

  // 선물상자 자리 정하기: 칸을 나누고, 칸 안에서 살짝씩 비뚤게
  const layout = useMemo(() => {
    const n = visible.length;
    const maxCols = Math.max(2, Math.min(6, Math.floor(width / 120)));
    const cols = n <= 1 ? 1 : n <= 4 ? Math.min(2, maxCols) : Math.min(maxCols, n <= 9 ? 3 : maxCols);
    const rows = Math.max(1, Math.ceil(n / cols));
    const items = visible.map((r, i) => {
      const rnd = seeded(r.id);
      const row = Math.floor(i / cols);
      const col = i % cols;
      const inRow = row === rows - 1 ? n - row * cols : cols; // 마지막 줄은 가운데로
      const offset = (cols - inRow) / 2;
      // 화면 양쪽 끝에 잘리지 않게 가운데 72% 안에만 놓아요
      const x = 14 + ((col + offset + 0.5 + (rnd() - 0.5) * 0.35) / cols) * 72;
      const y = ((row + 0.5 + (rnd() - 0.5) * 0.3) / rows) * 100;
      return {
        r,
        x,
        y,
        kind: i % 2 === 0 ? 'star' : 'ball', // 별과 장식볼을 번갈아 놓아요
        ball: BALLS[Math.floor(rnd() * BALLS.length)],
        size: 68 + Math.floor(rnd() * 12),
        dur: 5 + rnd() * 4,
        delay: -rnd() * 6,
      };
    });
    return { items, rows };
  }, [visible, width]);

  function play(rec) {
    const a = audioRef.current;
    if (!a) return;
    if (playing && playing.id === rec.id) {
      a.pause();
      setPlaying(null);
      bgmHold(false);
      return;
    }
    bgmHold(true); // 목소리가 잘 들리게 캐롤은 잠깐 쉬어요
    a.src = rec.url;
    a.currentTime = 0;
    setProgress(0);
    setPlaying(rec);
    a.play().catch(() => {
      setPlaying(null);
      bgmHold(false);
    });
    setPlayed((s) => new Set(s).add(rec.id));
  }

  function stop() {
    audioRef.current && audioRef.current.pause();
    setPlaying(null);
    bgmHold(false);
  }

  const open = stage !== 'door';
  const inside = stage === 'inside';

  return (
    <div className="stage">
      <audio
        ref={audioRef}
        preload="none"
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          if (a.duration) setProgress((a.currentTime / a.duration) * 100);
        }}
        onEnded={() => {
          setProgress(100);
          setTimeout(() => setPlaying(null), 500);
          bgmHold(false);
        }}
        style={{ display: 'none' }}
      />

      {/* 안쪽 (문이 열리면 보여요) */}
      <div className="inside-layer" style={{ position: 'absolute', inset: 0 }}>
        <div className="scene" style={open ? undefined : { animation: 'none' }}>
          {insideSrc && <img src={insideSrc} alt="크리스마스 장식이 가득한 집 안" decoding="async" />}
        </div>
      </div>

      {inside && (
        <>
          <Snow count={22} twinkles={22} />
          <div className="hall-top">
            <div className="hall-title">
              <small>{space.org}</small>
              🎁 크리스마스 편지 전시관
            </div>
            {space.classes.length > 1 && (
              <div className="chips" role="tablist">
                <button className={`chip ${filter === -1 ? 'on' : ''}`} onClick={() => setFilter(-1)}>
                  전체<span className="n">{recs ? recs.length : ''}</span>
                </button>
                {space.classes.map((c, i) => (
                  <button key={i} className={`chip ${filter === i ? 'on' : ''}`} onClick={() => setFilter(i)}>
                    {c}
                    <span className="n">{counts[i]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="gifts" style={{ top: space.classes.length > 1 ? 118 : 70, bottom: 80 }}>
            <div className="gifts-inner" style={{ height: layout.rows * 150, minHeight: '100%' }}>
              {layout.items.map(({ r, x, y, kind, ball, size, dur, delay }) => (
                <button
                  key={r.id}
                  className={`gift gift-${kind} ${playing && playing.id === r.id ? 'playing' : ''} ${played.has(r.id) ? 'played' : ''}`}
                  style={{
                    left: x + '%',
                    top: y + '%',
                    animationDuration: dur + 's',
                    animationDelay: delay + 's',
                    '--size': size + 'px',
                    '--tag-size': r.name.length > 4 ? '15px' : '18px',
                    '--ball-font': r.name.length > 3 ? '14px' : '17px',
                  }}
                  onClick={() => play(r)}
                  aria-label={`${r.name}에게 온 편지 듣기`}
                >
                  {kind === 'star' ? (
                    <>
                      <Star />
                      <span className="tag">{r.name}</span>
                    </>
                  ) : (
                    <>
                      <span className="hook" />
                      <span className="cap" />
                      <span className={`ball ${ball}`}>
                        <span className="ball-name">{r.name}</span>
                      </span>
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>

          {recs && visible.length === 0 && (
            <div className="empty">
              <div className="card">
                <span className="ribbon">🎄</span>
                <p>
                  {filter === -1 ? '아직 도착한 편지가 없어요.' : `${space.classes[filter]}에는 아직 편지가 없어요.`}
                  <br />첫 번째 편지를 보내 주세요!
                </p>
                <a className="btn btn-red" href={`/s/${space.code}/record`}>🎙️ 편지 녹음하기</a>
              </div>
            </div>
          )}
          {!recs && (
            <div className="empty">
              <div className="card">
                {loadError ? <p>{loadError}</p> : <><div className="spinner" /><p>별을 달고 있어요…</p></>}
              </div>
            </div>
          )}

          {playing && (
            <div className="player" role="status">
              <div className="notes" aria-hidden="true">
                <span style={{ '--nx': '-30px' }}>🎵</span>
                <span style={{ '--nx': '24px', animationDelay: '.5s' }}>🎶</span>
                <span style={{ '--nx': '-6px', animationDelay: '1s' }}>✨</span>
              </div>
              <div style={{ fontSize: 34 }}>💌</div>
              <div className="who">
                <div className="cls">{space.classes[playing.classIdx]}</div>
                <div className="nm">{playing.name}에게 온 편지</div>
                <div className="bar"><i style={{ width: progress + '%' }} /></div>
              </div>
              <button className="close" onClick={stop} aria-label="그만 듣기">■</button>
            </div>
          )}

          <div className="hall-bottom">
            <a className="btn btn-red" href={`/s/${space.code}/record`}>🎙️ 편지 녹음하기</a>
            <a className="icon-btn" href={`/s/${space.code}/admin`} aria-label="관리">⚙️</a>
          </div>
        </>
      )}

      {/* 닫힌 대문 */}
      {stage !== 'inside' && (
        <div className={`door-layer ${open ? 'opening' : ''}`} style={{ position: 'absolute', inset: 0 }}>
          <div className="scene">
            <img src="/door.webp" alt="크리스마스 장식이 달린 빨간 대문" fetchPriority="high" onLoad={loadInside} />
            <button className="bell" onClick={ringBell} aria-label="초인종 누르기" />
            <div className="bell-tip">🔔 초인종을 눌러 주세요!</div>
          </div>
          <Snow count={30} twinkles={14} />
          <div className="door-ui door-top">
            <div className="banner">
              <div className="org">{space.org}</div>
              <div className="name">크리스마스 편지 전시관</div>
            </div>
          </div>
          <div className="door-ui door-bottom">
            <button className="btn btn-gold" onClick={ringBell}>🔔 딩동! 들어가기</button>
          </div>
        </div>
      )}
    </div>
  );
}
