// 📄 전시관 화면들이 같이 쓰는 도우미: 공간 코드로 전시관 정보를 꺼내요
import { notFound } from 'next/navigation';
import { getSpace, publicSpace } from './spaces';

export async function loadSpace(params) {
  const { code } = await params;
  const upper = String(code).toUpperCase();
  let cfg = null;
  try {
    cfg = await getSpace(upper);
  } catch (e) {
    console.error(e);
    return { error: '저장공간이 아직 준비되지 않았어요. 잠시 후 다시 열어 주세요.' };
  }
  if (!cfg) notFound();
  return { space: publicSpace(cfg) };
}

export async function spaceMeta(params, suffix) {
  try {
    const { code } = await params;
    const cfg = await getSpace(String(code).toUpperCase());
    if (!cfg) return {};
    const title = `${cfg.org} ${suffix}`;
    const description = '엄마 아빠의 목소리가 선물상자에 담겨 우리 아이에게 찾아가요 🎁';
    return {
      title,
      description,
      openGraph: {
        title: `🎄 ${title}`,
        description,
        images: [{ url: '/og.jpg', width: 1200, height: 630 }],
        type: 'website',
        locale: 'ko_KR',
      },
    };
  } catch {
    return {};
  }
}
