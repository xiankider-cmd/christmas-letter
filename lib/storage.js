// 📦 창고 담당 파일
// 녹음 파일과 전시관 정보를 "창고(Vercel Blob)"에 넣고, 꺼내고, 버리는 일을 해요.
// 인터넷에 올리면 진짜 창고를 쓰고,
// 내 컴퓨터에서 시험할 때는 컴퓨터 안의 '.localblob' 폴더를 창고처럼 써요.

import fs from 'fs/promises';
import path from 'path';

// Vercel에서 창고(Blob)를 연결하면 아래 이름표 중 하나가 자동으로 생겨요
const TOKEN = process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID;
const IS_PROD = process.env.NODE_ENV === 'production' && !process.env.LOCAL_TEST;

export class StorageNotReady extends Error {
  constructor() {
    super('저장공간(Blob)이 아직 연결되지 않았어요. Vercel에서 Storage → Blob 연결을 해 주세요.');
  }
}

/* ---------- 진짜 창고 (Vercel Blob) ---------- */
const real = {
  async put(pathname, body, contentType) {
    const { put } = await import('@vercel/blob');
    const r = await put(pathname, body, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
      allowOverwrite: false,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
    });
    return { url: r.url };
  },
  async exists(pathname) {
    const { head, BlobNotFoundError } = await import('@vercel/blob');
    try {
      await head(pathname);
      return true;
    } catch (e) {
      if (e instanceof BlobNotFoundError) return false;
      throw e;
    }
  },
  async getJson(pathname) {
    const { head, BlobNotFoundError } = await import('@vercel/blob');
    try {
      const h = await head(pathname);
      const r = await fetch(h.url, { cache: 'no-store' });
      if (!r.ok) return null;
      return await r.json();
    } catch (e) {
      if (e instanceof BlobNotFoundError) return null;
      throw e;
    }
  },
  async list(prefix) {
    const { list } = await import('@vercel/blob');
    const out = [];
    let cursor;
    do {
      const r = await list({ prefix, cursor, limit: 1000 });
      for (const b of r.blobs) out.push({ pathname: b.pathname, url: b.url, uploadedAt: b.uploadedAt });
      cursor = r.hasMore ? r.cursor : undefined;
    } while (cursor);
    return out;
  },
  async del(url) {
    const { del } = await import('@vercel/blob');
    await del(url);
  },
};

/* ---------- 연습용 창고 (내 컴퓨터 폴더) ---------- */
const ROOT = path.join(process.cwd(), '.localblob');
const local = {
  async put(pathname, body, contentType) {
    const file = path.join(ROOT, pathname);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, Buffer.from(body));
    return { url: '/api/localblob/' + pathname.split('/').map(encodeURIComponent).join('/') };
  },
  async exists(pathname) {
    try {
      await fs.access(path.join(ROOT, pathname));
      return true;
    } catch {
      return false;
    }
  },
  async getJson(pathname) {
    try {
      return JSON.parse(await fs.readFile(path.join(ROOT, pathname), 'utf8'));
    } catch {
      return null;
    }
  },
  async list(prefix) {
    const dir = path.join(ROOT, prefix.endsWith('/') ? prefix : path.dirname(prefix));
    const out = [];
    async function walk(d) {
      let items = [];
      try {
        items = await fs.readdir(d, { withFileTypes: true });
      } catch {
        return;
      }
      for (const it of items) {
        const full = path.join(d, it.name);
        if (it.isDirectory()) await walk(full);
        else {
          const rel = path.relative(ROOT, full).split(path.sep).join('/');
          const st = await fs.stat(full);
          out.push({
            pathname: rel,
            url: '/api/localblob/' + rel.split('/').map(encodeURIComponent).join('/'),
            uploadedAt: st.mtime,
          });
        }
      }
    }
    await walk(dir);
    return out.filter((b) => b.pathname.startsWith(prefix));
  },
  async del(url) {
    const rel = decodeURIComponent(url.replace('/api/localblob/', ''));
    await fs.rm(path.join(ROOT, rel), { force: true });
  },
  ROOT,
};

export function store() {
  if (TOKEN) return real;
  if (IS_PROD) throw new StorageNotReady();
  return local;
}

export const LOCAL_ROOT = ROOT;
export const isLocal = () => !TOKEN && !IS_PROD;
