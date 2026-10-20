'use client';
// ⚙️ 관리 화면: 주소 보내기 + (비밀번호 넣으면) 전체 녹음 목록, 듣기, 지우기
import { useEffect, useRef, useState } from 'react';
import Snow from './Snow';
import LinkBox from './LinkBox';
import { saveRecent } from '@/lib/client';

export default function Admin({ space }) {
  const [origin, setOrigin] = useState('');
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [recs, setRecs] = useState(null);
  const [playingId, setPlayingId] = useState(null);
  const [toast, setToast] = useState('');
  const audioRef = useRef(null);
  const KEY = `xmas-admin-${space.code}`;

  const say = (m) => {
    setToast(m);
    setTimeout(() => setToast(''), 2200);
  };

  useEffect(() => {
    setOrigin(window.location.origin);
    saveRecent(space);
    try {
      const saved = sessionStorage.getItem(KEY);
      if (saved) login(saved, true);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadList() {
    const r = await fetch(`/api/spaces/${space.code}/recordings`, { cache: 'no-store' });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    setRecs(d.recordings.slice().reverse());
  }

  async function login(pw, silent) {
    setBusy(true);
    setError('');
    try {
      const r = await fetch(`/api/spaces/${space.code}/admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw, action: 'verify' }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setPassword(pw);
      setAuthed(true);
      try {
        sessionStorage.setItem(KEY, pw);
      } catch {}
      await loadList();
    } catch (e) {
      if (!silent) setError(e.message || '확인하지 못했어요.');
      try {
        sessionStorage.removeItem(KEY);
      } catch {}
    } finally {
      setBusy(false);
    }
  }

  async function remove(rec) {
    if (!confirm(`"${rec.name}" (${space.classes[rec.classIdx]}) 녹음을 지울까요?\n지우면 되돌릴 수 없어요.`)) return;
    try {
      const r = await fetch(`/api/spaces/${space.code}/admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, action: 'delete', id: rec.id }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setRecs((list) => list.filter((x) => x.id !== rec.id));
      say('지웠어요 🗑️');
    } catch (e) {
      say(e.message || '지우지 못했어요.');
    }
  }

  function play(rec) {
    const a = audioRef.current;
    if (playingId === rec.id) {
      a.pause();
      setPlayingId(null);
      return;
    }
    a.src = rec.url;
    a.play().catch(() => {});
    setPlayingId(rec.id);
  }

  const fmt = (t) =>
    new Date(t).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  return (
    <main className="page">
      <div className="page-bg" />
      <Snow count={18} twinkles={10} />
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} style={{ display: 'none' }} />
      <div className="wrap">
        <h1 className="title" style={{ fontSize: 26 }}>
          <span className="gold">{space.org}</span>
          <br />
          전시관 관리 ⚙️
        </h1>

        <div className="card">
          <span className="ribbon">🎀</span>
          <h2>주소 보내기</h2>
          <div style={{ textAlign: 'center', fontSize: 15, color: 'var(--muted)' }}>공간 코드</div>
          <div className="code-box" style={{ fontSize: 36 }}>{space.code}</div>
          {origin && (
            <>
              <LinkBox
                label="🎙️ 부모님 녹음 주소"
                hint="카카오톡으로 부모님께 보내 주세요"
                url={`${origin}/s/${space.code}/record`}
                shareText={`🎄 ${space.org}\n우리 아이에게 크리스마스 편지를 목소리로 보내 주세요!`}
                say={say}
              />
              <LinkBox
                label="🏠 전시관 주소"
                url={`${origin}/s/${space.code}`}
                shareText={`🎁 ${space.org} 크리스마스 편지 전시관에 놀러 오세요!`}
                say={say}
              />
            </>
          )}
          <a className="btn btn-gold" href={`/s/${space.code}`} style={{ marginTop: 6 }}>🔔 전시관 들어가기</a>
        </div>

        {!authed ? (
          <form
            className="card"
            onSubmit={(e) => {
              e.preventDefault();
              if (!/^\d{4,8}$/.test(password)) return setError('비밀번호 숫자 4~8자리를 적어 주세요.');
              login(password);
            }}
          >
            <span className="ribbon">🔐</span>
            <h2>녹음 목록 보기</h2>
            {error && <div className="error">{error}</div>}
            <div className="field">
              <label htmlFor="pw">관리 비밀번호</label>
              <input id="pw" className="input" type="password" inputMode="numeric" maxLength={8} value={password}
                onChange={(e) => setPassword(e.target.value.replace(/\D/g, ''))} placeholder="숫자 4~8자리" />
            </div>
            <button className="btn btn-green" disabled={busy}>{busy ? '확인 중…' : '확인'}</button>
          </form>
        ) : (
          <div className="card">
            <span className="ribbon">📋</span>
            <h2>전체 녹음 목록</h2>
            {!recs ? (
              <div className="spinner" />
            ) : (
              <>
                <div className="stat">지금까지 <b>{recs.length}</b>개의 편지가 왔어요</div>
                {recs.length === 0 && <p style={{ textAlign: 'center', color: 'var(--muted)' }}>아직 녹음이 없어요.</p>}
                {space.classes.map((c, ci) => {
                  const list = recs.filter((r) => r.classIdx === ci);
                  if (!list.length) return null;
                  return (
                    <div className="adm-group" key={ci}>
                      <h3>{c} ({list.length})</h3>
                      {list.map((r) => (
                        <div className="adm-row" key={r.id}>
                          <div className="nm">
                            {r.name}
                            <small>{fmt(r.at)}</small>
                          </div>
                          <button className="play" onClick={() => play(r)} aria-label="듣기">
                            {playingId === r.id ? '■' : '▶'}
                          </button>
                          <button className="del" onClick={() => remove(r)}>지우기</button>
                        </div>
                      ))}
                    </div>
                  );
                })}
                <button className="btn btn-ghost" style={{ marginTop: 14 }} onClick={() => { setRecs(null); loadList().catch(() => setRecs([])); }}>
                  🔄 새로고침
                </button>
              </>
            )}
          </div>
        )}
        <a className="btn btn-ghost" href="/" style={{ maxWidth: 460 }}>🏠 처음 화면</a>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}
