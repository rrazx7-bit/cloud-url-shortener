import { createHash, timingSafeEqual } from "node:crypto";

// 인증: Basic 헤더로 누구인지 확인합니다. 비밀번호 미설정 시에는 항상 거부합니다.
export function authenticate(request) {
  const expected = process.env.ADMIN_PASSWORD;
  const header = request.headers.get("authorization");
  if (!expected || !header || !/^Basic\s+/i.test(header)) return null;
  try {
    const encoded = header.replace(/^Basic\s+/i, "");
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return null;
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    const colon = decoded.indexOf(":");
    if (colon < 0 || decoded.slice(0, colon) !== "admin") return null;
    const password = decoded.slice(colon + 1);
    const hash = (value) => createHash("sha256").update(value).digest();
    if (!timingSafeEqual(hash(password), hash(expected))) return null;
    return { username: "admin", role: "admin" };
  } catch {
    return null;
  }
}

export function authenticationRequiredResponse() {
  return new Response("관리자 인증이 필요합니다.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Admin", charset="UTF-8"',
      "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

export function forbiddenResponse() {
  return new Response("접근 권한이 없습니다.", {
    status: 403,
    headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
  });
}
