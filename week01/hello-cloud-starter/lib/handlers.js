import { randomUUID } from "node:crypto";
import { getRequestOrigin, isSelfUrl, validateOriginalUrl } from "./url.js";

const noStore = { "Cache-Control": "no-store" };
function errorResponse(code, message, status) {
  return Response.json({ error: { code, message } }, { status, headers: noStore });
}

// 실제 DB 함수는 Route Handler에서 주입하여 HTTP 동작을 독립적으로 검사합니다.
export function createShortenHandler(findOrCreateUrl) {
  return async function POST(request) {
    const requestId = randomUUID();
    const body = await request.json().catch(() => null);
    const result = validateOriginalUrl(body?.originalUrl);
    if (result.error) return Response.json({ error: result.error }, { status: 400, headers: noStore });
    const { originalUrl, parsedUrl } = result;
    const origin = getRequestOrigin(request);
    const aliases = [request.url, process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL];
    if (isSelfUrl(parsedUrl, origin, aliases)) {
      return errorResponse("SELF_URL", "이 서비스에서 만든 주소는 다시 단축할 수 없습니다.", 400);
    }
    try {
      const saved = await findOrCreateUrl(originalUrl);
      const status = saved.reused ? 200 : 201;
      console.info(JSON.stringify({ event: "url_shortened", requestId, shortCode: saved.shortCode, reused: saved.reused, status }));
      return Response.json({ ...saved, shortUrl: `${origin}/${saved.shortCode}` }, { status, headers: noStore });
    } catch {
      // DB 오류 객체에는 접속 정보가 포함될 수 있으므로 사건 식별자만 기록합니다.
      console.error(JSON.stringify({ event: "shorten_failed", requestId, status: 500 }));
      return errorResponse("INTERNAL_ERROR", "주소를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.", 500);
    }
  };
}

export function createRedirectHandler(findUrlByShortCode, recordClick) {
  return async function GET(_request, { params }) {
    const { shortCode } = await params;
    const requestId = randomUUID();
    const started = Date.now();
    if (!/^[A-Za-z0-9]{6}$/.test(shortCode)) {
      return errorResponse("NOT_FOUND", "존재하지 않는 단축주소입니다.", 404);
    }
    try {
      const originalUrl = await findUrlByShortCode(shortCode);
      if (!originalUrl) {
        console.warn(JSON.stringify({ event: "short_code_not_found", requestId, shortCode, status: 404 }));
        return errorResponse("NOT_FOUND", "존재하지 않는 단축주소입니다.", 404);
      }
      try {
        await recordClick(shortCode);
      } catch {
        console.error(JSON.stringify({ event: "click_update_failed", requestId, shortCode }));
      }
      // ASCII URL은 저장한 원문 그대로, 국제화 URL은 HTTP 헤더에 안전한 형태로 전달합니다.
      const location = /[^\x20-\x7e]/.test(originalUrl) ? new URL(originalUrl).href : originalUrl;
      console.info(JSON.stringify({ event: "redirect_completed", requestId, shortCode, status: 307, durationMs: Date.now() - started }));
      return new Response(null, { status: 307, headers: { ...noStore, Location: location } });
    } catch {
      console.error(JSON.stringify({ event: "redirect_failed", requestId, shortCode, status: 500 }));
      return errorResponse("INTERNAL_ERROR", "주소를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.", 500);
    }
  };
}
