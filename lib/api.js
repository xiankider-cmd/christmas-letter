// 🧯 문제가 생기면 알아듣기 쉬운 말로 알려주는 도우미
import { StorageNotReady } from './storage';

export function ok(data, init) {
  return Response.json(data, init);
}

export function fail(message, status = 400) {
  return Response.json({ error: message }, { status });
}

export function handle(fn) {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      console.error(e);
      if (e instanceof StorageNotReady) return fail(e.message, 503);
      return fail('잠시 문제가 생겼어요. 조금 뒤에 다시 시도해 주세요.', 500);
    }
  };
}
