// 🎙️ 녹음 목록 보기(GET)와 녹음 올리기(POST)
import { getSpace, getRecordings, addRecording, cleanText, MAX_RECORDINGS } from '@/lib/spaces';
import { handle, ok, fail } from '@/lib/api';

export const GET = handle(async (req, { params }) => {
  const { code } = await params;
  const cfg = await getSpace(code);
  if (!cfg) return fail('전시관을 찾을 수 없어요.', 404);
  const recordings = await getRecordings(code);
  return ok({ recordings });
});

const MAX_BYTES = 1.5 * 1024 * 1024; // 1.5MB (60초 녹음은 보통 0.3MB 정도예요)

// 진짜 mp3 파일인지 맨 앞부분을 보고 확인해요
function looksLikeMp3(buf) {
  if (buf.length < 4) return false;
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) return true; // "ID3"
  return buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0;
}

export const POST = handle(async (req, { params }) => {
  const { code } = await params;
  const cfg = await getSpace(code);
  if (!cfg) return fail('전시관을 찾을 수 없어요.', 404);

  const form = await req.formData().catch(() => null);
  if (!form) return fail('올린 내용을 읽지 못했어요.');

  const classIdx = Number(form.get('classIdx'));
  const name = cleanText(form.get('name'), 12);
  const audio = form.get('audio');

  if (!Number.isInteger(classIdx) || classIdx < 0 || classIdx >= cfg.classes.length)
    return fail('반을 다시 골라 주세요.');
  if (!name) return fail('아이 이름을 적어 주세요.');
  if (!audio || typeof audio.arrayBuffer !== 'function') return fail('녹음 파일이 없어요.');
  if (audio.size > MAX_BYTES) return fail('녹음 파일이 너무 커요. 60초 이내로 녹음해 주세요.');

  const buf = Buffer.from(await audio.arrayBuffer());
  if (!looksLikeMp3(buf)) return fail('녹음 파일 형식이 올바르지 않아요.');

  const count = (await getRecordings(code)).length;
  if (count >= MAX_RECORDINGS) return fail('이 전시관에는 더 이상 녹음을 올릴 수 없어요. 선생님께 알려 주세요.');

  await addRecording(code, classIdx, name, buf);
  return ok({ ok: true });
});
