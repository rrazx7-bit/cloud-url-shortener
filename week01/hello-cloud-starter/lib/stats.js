import { getSql } from "./db.js";

export async function recordClick(shortCode) {
  const sql = getSql();
  await sql`
    UPDATE urls SET click_count = click_count + 1, last_clicked_at = NOW()
    WHERE short_code = ${shortCode}
  `;
}

export async function getStats() {
  const sql = getSql();
  const [totals, topRows, rows] = await sql.transaction([
    sql`SELECT COUNT(*) AS total_urls, COALESCE(SUM(click_count), 0) AS total_clicks,
        COUNT(*) FILTER (WHERE click_count > 0) AS clicked_urls,
        MAX(last_clicked_at) AS latest_clicked_at FROM urls`,
    sql`SELECT short_code, original_url, click_count FROM urls WHERE click_count > 0
        ORDER BY click_count DESC, created_at DESC LIMIT 1`,
    sql`SELECT short_code, original_url, click_count, created_at, last_clicked_at
        FROM urls ORDER BY created_at DESC LIMIT 100`,
  ]);
  const topUrl = topRows[0] ? {
    shortCode: topRows[0].short_code, originalUrl: topRows[0].original_url,
    clickCount: Number(topRows[0].click_count),
  } : null;
  return {
    summary: {
      totalUrls: Number(totals[0].total_urls), totalClicks: Number(totals[0].total_clicks),
      clickedUrls: Number(totals[0].clicked_urls), latestClickedAt: totals[0].latest_clicked_at, topUrl,
    },
    urls: rows.map((row) => ({
      shortCode: row.short_code, originalUrl: row.original_url, clickCount: Number(row.click_count),
      createdAt: row.created_at, lastClickedAt: row.last_clicked_at,
    })),
  };
}
