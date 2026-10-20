// 🔐 관리자: 비밀번호 확인, 녹음 지우기
import { getSpace, checkPassword, deleteRecording } from '@/lib/spaces';
import { handle, ok, fail } from '@/lib/api';

export const POST = handle(async (req, { params }) => {
  const { code } = await params;
  const cfg = await getSpace(code);
  if (!cfg) return fail('전시관을 찾을 수 없어요.', 404);

  const body = await req.json().catch(() => ({}));
  if (!checkPassword(cfg, String(body.password ?? ''))) {
    await new Promise((r) => setTimeout(r, 800)); // 마구 눌러보기 방지
    return fail('비밀번호가 맞지 않아요.', 401);
  }

  if (body.action === 'delete') {
    const done = await deleteRecording(code, String(body.id ?? ''));
    if (!done) return fail('이미 지워졌거나 찾을 수 없는 녹음이에요.', 404);
  }
  return ok({ ok: true });
});
