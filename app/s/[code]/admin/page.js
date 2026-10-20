// ⚙️ 관리 화면 (주소 보내기, 녹음 목록, 지우기)
import Admin from '@/components/Admin';
import { loadSpace } from '@/lib/page-helpers';
import ErrorCard from '@/components/ErrorCard';

export const dynamic = 'force-dynamic';
export const metadata = { title: '전시관 관리', robots: { index: false } };

export default async function Page({ params }) {
  const { space, error } = await loadSpace(params);
  if (error) return <ErrorCard message={error} />;
  return <Admin space={space} />;
}
