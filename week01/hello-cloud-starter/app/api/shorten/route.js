import { findOrCreateUrl } from "../../../lib/db.js";
import { createShortenHandler } from "../../../lib/handlers.js";

export const runtime = "nodejs";
export const POST = createShortenHandler(findOrCreateUrl);
