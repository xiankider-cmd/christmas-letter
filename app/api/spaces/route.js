// ✨ "새 전시관 만들기" 버튼을 누르면 여기로 와요
import { createSpace, cleanText } from '@/lib/spaces';
import { handle, ok, fail } from '@/lib/api';

export const POST = handle(async (req) => {
  const body = await req.json().catch(() => ({}));
  const org = cleanText(body.org, 30);
  const classes = (Array.isArray(body.classes) ? body.classes : [])
    .map((c) => cleanText(c, 15))
    .filter(Boolean);
  const uniqueClasses = [...new Set(classes)];
  const password = String(body.password ?? '');

  if (!org) return fail('기관 이름을 적어 주세요.');
  if (uniqueClasses.length === 0) return fail('반 이름을 하나 이상 적어 주세요.');
  if (uniqueClasses.length > 12) return fail('반은 최대 12개까지 만들 수 있어요.');
  if (!/^\d{4,8}$/.test(password)) return fail('비밀번호는 숫자 4~8자리로 적어 주세요.');

  const code = await createSpace({ org, classes: uniqueClasses, password });
  return ok({ code });
});
