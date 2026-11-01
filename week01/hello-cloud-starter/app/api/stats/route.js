import { authenticate, authenticationRequiredResponse, forbiddenResponse } from "../../../lib/auth.js";
import { authorize } from "../../../lib/authorization.js";
import { getStats } from "../../../lib/stats.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const user = authenticate(request);
  if (!user) return authenticationRequiredResponse();
  if (!authorize(user, "stats:read")) return forbiddenResponse();
  try {
    return Response.json(await getStats(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error(JSON.stringify({ event: "stats_failed", status: 500 }));
    return Response.json({ error: { code: "STATS_ERROR", message: "통계를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." } }, {
      status: 500, headers: { "Cache-Control": "no-store" },
    });
  }
}
