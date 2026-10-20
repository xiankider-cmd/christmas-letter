// 🏠 전시관 화면 (초인종 → 안으로 → 둥둥 떠다니는 선물상자)
import Exhibition from '@/components/Exhibition';
import { loadSpace, spaceMeta } from '@/lib/page-helpers';
import ErrorCard from '@/components/ErrorCard';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  return spaceMeta(params, '크리스마스 편지 전시관');
}

export default async function Page({ params }) {
  const { space, error } = await loadSpace(params);
  if (error) return <ErrorCard message={error} />;
  return <Exhibition space={space} />;
}
