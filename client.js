// 🧰 휴대폰 화면에서 쓰는 작은 도구들 (소리, 복사, 공유, 최근 전시관 기억)

// "딩~동" 초인종 소리를 직접 만들어요 (소리 파일이 필요 없어요)
export function playDingDong() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();
    const tone = (freq, start, len) => {
      const o = ctx.createOscillator();
      const o2 = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o2.type = 'triangle';
      o.frequency.value = freq;
      o2.frequency.value = freq * 2;
      const g2 = ctx.createGain();
      g2.gain.value = 0.15;
      o.connect(g);
      o2.connect(g2).connect(g);
      g.connect(ctx.destination);
      const t = ctx.currentTime + start;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      o.start(t);
      o2.start(t);
      o.stop(t + len);
      o2.stop(t + len);
    };
    tone(659.25, 0, 1.1); // 딩 (미)
    tone(523.25, 0.55, 1.6); // 동 (도)
    setTimeout(() => ctx.close && ctx.close(), 2600);
  } catch {
    /* 소리가 안 나도 괜찮아요 */
  }
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {}
    ta.remove();
    return ok;
  }
}

// 휴대폰의 "공유하기"(카카오톡 등) 창을 열어요. 안 되면 주소를 복사해요.
export async function shareLink({ title, text, url }) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return 'shared';
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancel';
    }
  }
  return (await copyText(`${text}\n${url}`)) ? 'copied' : 'fail';
}

const KEY = 'xmas-letter-spaces';
export function getRecent() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}
export function saveRecent(space) {
  try {
    const list = getRecent().filter((s) => s.code !== space.code);
    list.unshift({ code: space.code, org: space.org });
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 5)));
  } catch {}
}

export function isKakaoInApp() {
  return typeof navigator !== 'undefined' && /KAKAOTALK/i.test(navigator.userAgent);
}

// 카카오톡 안에서 열렸을 때, 휴대폰 기본 인터넷(사파리/크롬)으로 다시 열어요
export function openInExternalBrowser() {
  location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(location.href);
}
