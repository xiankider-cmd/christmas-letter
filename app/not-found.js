import ErrorCard from '@/components/ErrorCard';

export default function NotFound() {
  return <ErrorCard title="전시관을 찾을 수 없어요" message="주소나 공간 코드가 맞는지 다시 확인해 주세요." />;
}
