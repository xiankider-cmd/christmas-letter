# 🎄 크리스마스 우리아이에게 편지보내기

부모님이 아이에게 크리스마스 편지를 목소리로 녹음하면,
크리스마스 집 안에 아이 이름이 적힌 선물상자가 둥둥 떠다니고,
누르면 부모님 목소리가 나오는 온라인 전시관이에요.

## 📁 무엇이 어디에 있나요? (아주 쉽게)

| 폴더 / 파일 | 하는 일 |
|---|---|
| `app/page.js` | 첫 화면 (새 전시관 만들기, 전시관 열기) |
| `components/Exhibition.jsx` | 전시관 (초인종 → 문 열림 → 떠다니는 선물상자) |
| `components/Recorder.jsx` | 부모님 녹음 화면 |
| `components/Admin.jsx` | 관리 화면 (주소 보내기, 녹음 지우기) |
| `app/globals.css` | 색깔, 글씨, 모양 |
| `lib/mp3.js` | 녹음 파일을 작게 줄이기 (60초 ≈ 0.24MB) |
| `lib/spaces.js` | 전시관·녹음을 창고에 넣고 꺼내기 |
| `public/door.jpg` | 닫힌 대문 배경 |
| `public/inside.jpg` | 문 안쪽 배경 |
| `public/og.jpg` | 카카오톡 미리보기 사진 |

## 🔗 주소 모양

- 첫 화면: `https://내주소.vercel.app`
- 전시관: `https://내주소.vercel.app/s/공간코드`
- 부모님 녹음: `https://내주소.vercel.app/s/공간코드/record`
- 관리: `https://내주소.vercel.app/s/공간코드/admin`

## 🧺 저장공간

Vercel Blob(무료: 1GB)을 사용해요. 녹음 하나가 약 0.1~0.24MB라서
4,000개 넘게 저장할 수 있어요.

⚠️ Blob 저장공간을 지우거나 새로 만들면 모든 전시관과 녹음이 사라져요.
