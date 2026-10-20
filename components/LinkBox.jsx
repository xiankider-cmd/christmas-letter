'use client';
// 🔗 주소 하나를 보여주고, 복사하기 / 카톡 보내기 버튼을 달아요
import { copyText, shareLink } from '@/lib/client';

export default function LinkBox({ label, hint, url, shareText, say }) {
  return (
    <div className="link-box">
      <div className="label">{label}</div>
      <div className="url">{url}</div>
      {hint && <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 10 }}>{hint}</div>}
      <div className="btn-row">
        <button type="button" className="btn btn-ghost" onClick={async () => say((await copyText(url)) ? '주소를 복사했어요 📋' : '복사하지 못했어요')}>
          📋 복사
        </button>
        <button type="button" className="btn btn-green" onClick={async () => {
          const r = await shareLink({ title: label, text: shareText, url });
          if (r === 'copied') say('주소와 안내 문구를 복사했어요. 카톡에 붙여 넣으세요!');
        }}>
          💬 보내기
        </button>
      </div>
    </div>
  );
}
