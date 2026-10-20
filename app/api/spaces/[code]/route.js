// 🔎 공간 코드로 전시관이 있는지 확인해요
import { getSpace, publicSpace } from '@/lib/spaces';
import { handle, ok, fail } from '@/lib/api';

export const GET = handle(async (req, { params }) => {
  const { code } = await params;
  const cfg = await getSpace(String(code).toUpperCase());
  if (!cfg) return fail('그런 전시관을 찾을 수 없어요. 코드를 다시 확인해 주세요.', 404);
  return ok(publicSpace(cfg));
});
