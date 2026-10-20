'use client';
// 🏠 첫 화면: "새 전시관 만들기" 와 "이미 만든 전시관 열기"
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Snow from '@/components/Snow';
import LinkBox from '@/components/LinkBox';
import { getRecent, saveRecent } from '@/lib/client';

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState('menu'); // menu | create | open | done
  const [org, setOrg] = useState('');
  const [classText, setClassText] = useState('');
  const [password, setPassword] = useState('');
  const [openCode, setOpenCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);
  const [recent, setRecent] = useState([]);
  const [toast, setToast] = useState('');

  useEffect(() => setRecent(getRecent()), []);

  const say = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  };

  const classes = classText
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  async function create(e) {
    e.preventDefault();
    setError('');
    if (!org.trim()) return setError('기관 이름을 적어 주세요.');
    if (classes.length === 0) return setError('반 이름을 한 줄에 하나씩 적어 주세요.');
    if (classes.length > 12) return setError(`반은 최대 12개까지예요. 지금 ${classes.length}개예요.`);
    if (!/^\d{4,8}$/.test(password)) return setError('비밀번호는 숫자 4~8자리로 적어 주세요.');
    setBusy(true);
    try {
      const r = await fetch('/api/spaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org, classes, password }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || '만들지 못했어요.');
      const space = { code: data.code, org: org.trim() };
      saveRecent(space);
      setRecent(getRecent());
      setCreated(space);
      setMode('done');
      window.scrollTo(0, 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function openSpace(e) {
    e.preventDefault();
    setError('');
    const code = openCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) return setError('공간 코드 6글자를 적어 주세요.');
    setBusy(true);
    try {
      const r = await fetch(`/api/spaces/${code}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      saveRecent(data);
      router.push(`/s/${code}/admin`);
    } catch (err) {
      setError(err.message || '전시관을 찾지 못했어요.');
      setBusy(false);
    }
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <main className="page">
      <div className="page-bg" />
      <Snow />
      <div className="wrap">
        <h1 className="title main-title">
          메리크리스마스!
          <br />
          <span className="gold">자이안에 온 편지</span>
        </h1>
        <p className="subtitle">
          엄마 아빠의 목소리가 선물상자에 담겨
          <br />
          우리 아이에게 찾아가요 🎁
        </p>

        {mode === 'menu' && (
          <>
            <div className="card stack">
              <span className="ribbon">🎀</span>
              <h2>선생님 메뉴</h2>
              <button className="btn btn-red" onClick={() => { setError(''); setMode('create'); }}>
                ✨ 새 전시관 만들기
              </button>
              <button className="btn btn-green" onClick={() => { setError(''); setMode('open'); }}>
                🔑 이미 만든 전시관 열기
              </button>
            </div>
            {recent.length > 0 && (
              <div className="card">
                <h2>최근에 연 전시관</h2>
                <div className="recent">
                  {recent.map((s) => (
                    <a key={s.code} href={`/s/${s.code}/admin`}>
                      <span>{s.org}</span>
                      <b>{s.code}</b>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {mode === 'create' && (
          <form className="card" onSubmit={create}>
            <span className="ribbon">🎁</span>
            <h2>새 전시관 만들기</h2>
            {error && <div className="error">{error}</div>}
            <div className="field">
              <label htmlFor="org">기관 이름</label>
              <input id="org" className="input" value={org} maxLength={30}
                onChange={(e) => setOrg(e.target.value)} placeholder="예) 자이안어린이집" />
            </div>
            <div className="field">
              <label htmlFor="classes">반 이름</label>
              <textarea id="classes" className="textarea" value={classText}
                onChange={(e) => setClassText(e.target.value)}
                placeholder={'한 줄에 하나씩 적어 주세요\n예)\n햇살반\n별빛반\n무지개반'} />
              <div className="hint">한 줄에 반 하나씩, 최대 12개 · 지금 {classes.length}개</div>
            </div>
            <div className="field">
              <label htmlFor="pw">관리 비밀번호</label>
              <input id="pw" className="input" value={password} inputMode="numeric" maxLength={8}
                onChange={(e) => setPassword(e.target.value.replace(/\D/g, ''))} placeholder="숫자 4~8자리" />
              <div className="hint">잘못 올라온 녹음을 지울 때 써요. 꼭 기억해 두세요!</div>
            </div>
            <div className="stack">
              <button className="btn btn-red" disabled={busy}>{busy ? '만드는 중…' : '🎄 전시관 만들기'}</button>
              <button type="button" className="btn btn-ghost" onClick={() => setMode('menu')}>← 처음으로</button>
            </div>
          </form>
        )}

        {mode === 'open' && (
          <form className="card" onSubmit={openSpace}>
            <span className="ribbon">🔑</span>
            <h2>이미 만든 전시관 열기</h2>
            {error && <div className="error">{error}</div>}
            <div className="field">
              <label htmlFor="code">공간 코드 6글자</label>
              <input id="code" className="input code" value={openCode} maxLength={6} autoCapitalize="characters"
                autoComplete="off" onChange={(e) => setOpenCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder="ABC123" />
            </div>
            <div className="stack">
              <button className="btn btn-green" disabled={busy}>{busy ? '찾는 중…' : '열기'}</button>
              <button type="button" className="btn btn-ghost" onClick={() => setMode('menu')}>← 처음으로</button>
            </div>
          </form>
        )}

        {mode === 'done' && created && (
          <div className="card">
            <span className="ribbon">🎉</span>
            <h2>{created.org} 전시관이 생겼어요!</h2>
            <div style={{ textAlign: 'center', fontSize: 15, color: 'var(--muted)' }}>공간 코드</div>
            <div className="code-box">{created.code}</div>
            <div className="notice" style={{ marginBottom: 14 }}>
              📝 공간 코드와 비밀번호를 꼭 적어 두세요. 나중에 전시관을 다시 열 때 필요해요.
            </div>
            <LinkBox
              label="🎙️ 부모님 녹음 주소"
              hint="이 주소를 카카오톡으로 부모님께 보내 주세요"
              url={`${origin}/s/${created.code}/record`}
              shareText={`🎄 ${created.org}\n우리 아이에게 크리스마스 편지를 목소리로 보내 주세요!`}
              say={say}
            />
            <LinkBox
              label="🏠 전시관 주소"
              hint="누구나 들어와서 목소리를 들을 수 있어요"
              url={`${origin}/s/${created.code}`}
              shareText={`🎁 ${created.org} 크리스마스 편지 전시관에 놀러 오세요!`}
              say={say}
            />
            <div className="stack" style={{ marginTop: 14 }}>
              <a className="btn btn-gold" href={`/s/${created.code}`}>🔔 전시관 들어가 보기</a>
              <a className="btn btn-ghost" href={`/s/${created.code}/admin`}>⚙️ 관리 화면</a>
            </div>
          </div>
        )}

        <p className="foot">크리스마스 우리아이에게 편지보내기</p>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}
