// 🏠 전시관 담당 파일
// 전시관 만들기, 전시관 정보 꺼내기, 녹음 넣기/꺼내기/지우기를 해요.
// 기관마다 "spaces/공간코드/" 라는 자기만의 방을 써서, 다른 기관과 절대 섞이지 않아요.

import crypto from 'crypto';
import { unstable_cache, revalidateTag } from 'next/cache';
import { store } from './storage';

// 헷갈리는 글자(0, O, 1, I, L)는 빼고 코드를 만들어요
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const MAX_RECORDINGS = 400;

export function isCode(code) {
  return typeof code === 'string' && /^[A-Z0-9]{6}$/.test(code);
}

function newCode() {
  const bytes = crypto.randomBytes(6);
  let s = '';
  for (const b of bytes) s += CODE_CHARS[b % CODE_CHARS.length];
  return s;
}

// 비밀번호는 그대로 저장하지 않고, 알아볼 수 없게 꽁꽁 섞어서 저장해요
function hashPassword(pw, salt) {
  return crypto.scryptSync(String(pw), 'xmas:' + salt, 32, { N: 16384, r: 8, p: 1 }).toString('hex');
}

// 전시관 정보 파일 이름에 아무도 못 맞히는 긴 글자를 붙여서 숨겨 둬요
const configPrefix = (code) => `spaces/${code}/cfg-`;
const recPrefix = (code) => `spaces/${code}/rec/`;

async function findConfig(code) {
  const found = await store().list(configPrefix(code));
  return found[0] || null;
}

export function cleanText(s, max) {
  return String(s ?? '')
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/* ---------- 전시관 만들기 ---------- */
export async function createSpace({ org, classes, password }) {
  const s = store();
  for (let i = 0; i < 8; i++) {
    const code = newCode();
    if (await findConfig(code)) continue; // 이미 있는 코드면 다시 뽑기
    const salt = crypto.randomBytes(8).toString('hex');
    const config = {
      code,
      org,
      classes,
      salt,
      pw: hashPassword(password, salt),
      createdAt: new Date().toISOString(),
    };
    const hidden = crypto.randomBytes(16).toString('hex');
    await s.put(`${configPrefix(code)}${hidden}.json`, JSON.stringify(config), 'application/json');
    return code;
  }
  throw new Error('코드를 만들지 못했어요. 다시 시도해 주세요.');
}

/* ---------- 전시관 정보 꺼내기 (한 번 꺼내면 기억해 둬요) ---------- */
async function readSpace(code) {
  const f = await findConfig(code);
  if (!f) return null;
  return store().getJson(f.pathname);
}

export async function getSpace(code) {
  if (!isCode(code)) return null;
  const cfg = await unstable_cache(() => readSpace(code), ['space', code], {
    tags: [`space-${code}`],
    revalidate: 60 * 60 * 24,
  })();
  return cfg;
}

export function publicSpace(cfg) {
  return { code: cfg.code, org: cfg.org, classes: cfg.classes };
}

export function checkPassword(cfg, password) {
  if (!cfg || typeof password !== 'string') return false;
  const a = Buffer.from(hashPassword(password, cfg.salt), 'hex');
  const b = Buffer.from(cfg.pw, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ---------- 녹음 ---------- */
// 파일 이름 안에 반 번호와 아이 이름을 숨겨 둬요 → 목록 한 번에 다 알 수 있어요
function encodeName(name) {
  return Buffer.from(name, 'utf8').toString('base64url');
}
function decodeName(s) {
  try {
    return Buffer.from(s, 'base64url').toString('utf8');
  } catch {
    return '';
  }
}

function parseRecording(code, b) {
  // spaces/CODE/rec/{반번호}/{시간}-{랜덤}_{이름}.mp3
  const rest = b.pathname.slice(recPrefix(code).length);
  const m = rest.match(/^(\d+)\/(\d+)-([a-z0-9]+)_([A-Za-z0-9_-]+)\.mp3$/);
  if (!m) return null;
  return {
    id: `${m[1]}/${m[2]}-${m[3]}`,
    classIdx: Number(m[1]),
    name: decodeName(m[4]),
    at: Number(m[2]),
    url: b.url,
  };
}

async function readRecordings(code) {
  const blobs = await store().list(recPrefix(code));
  return blobs
    .map((b) => parseRecording(code, b))
    .filter(Boolean)
    .sort((a, b) => a.at - b.at);
}

export async function getRecordings(code) {
  return unstable_cache(() => readRecordings(code), ['recs', code], {
    tags: [`recs-${code}`],
    revalidate: 60 * 60 * 6,
  })();
}

export async function addRecording(code, classIdx, name, buffer) {
  const rand = crypto.randomBytes(3).toString('hex');
  const p = `${recPrefix(code)}${classIdx}/${Date.now()}-${rand}_${encodeName(name)}.mp3`;
  await store().put(p, buffer, 'audio/mpeg');
  revalidateTag(`recs-${code}`);
}

export async function deleteRecording(code, id) {
  const all = await readRecordings(code); // 지울 때는 기억 말고 창고를 직접 확인해요
  const found = all.find((r) => r.id === id);
  if (!found) return false;
  await store().del(found.url);
  revalidateTag(`recs-${code}`);
  return true;
}

export async function countRecordings(code) {
  return (await getRecordings(code)).length;
}
