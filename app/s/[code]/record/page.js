// 🎙️ 부모님 녹음 화면
import Recorder from '@/components/Recorder';
import { loadSpace, spaceMeta } from '@/lib/page-helpers';
import ErrorCard from '@/components/ErrorCard';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  return spaceMeta(params, '| 우리 아이에게 크리스마스 편지 보내기');
}

export default async function Page({ params }) {
  const { space, error } = await loadSpace(params);
  if (error) return <ErrorCard message={error} />;
  return <Recorder space={space} />;
}
