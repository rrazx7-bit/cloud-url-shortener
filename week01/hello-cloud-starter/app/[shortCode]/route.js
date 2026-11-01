import { findUrlByShortCode } from "../../lib/db.js";
import { recordClick } from "../../lib/stats.js";
import { createRedirectHandler } from "../../lib/handlers.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = createRedirectHandler(findUrlByShortCode, recordClick);
