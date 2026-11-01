import { neon } from "@neondatabase/serverless";
import { createShortCode } from "./short-code.js";

let sql;

// 인증 실패 응답과 빌드에는 DB 접속이 필요하지 않습니다.
export function getSql() {
  if (!sql) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
    sql = neon(process.env.DATABASE_URL);
  }
  return sql;
}

export async function findOrCreateUrl(originalUrl) {
  const query = getSql();
  const existing = await query`
    SELECT short_code, original_url FROM urls WHERE original_url = ${originalUrl}
  `;
  if (existing[0]) return { shortCode: existing[0].short_code, originalUrl: existing[0].original_url, reused: true };

  const shortCode = createShortCode(originalUrl);
  // UNIQUE(original_url)와 upsert로 동시 중복 요청에서도 기존 코드를 보존합니다.
  const rows = await query`
    INSERT INTO urls (short_code, original_url)
    VALUES (${shortCode}, ${originalUrl})
    ON CONFLICT (original_url) DO UPDATE SET original_url = EXCLUDED.original_url
    RETURNING short_code, original_url
  `;
  return { shortCode: rows[0].short_code, originalUrl: rows[0].original_url, reused: false };
}

export async function findUrlByShortCode(shortCode) {
  const query = getSql();
  const rows = await query`SELECT original_url FROM urls WHERE short_code = ${shortCode}`;
  return rows[0]?.original_url ?? null;
}
