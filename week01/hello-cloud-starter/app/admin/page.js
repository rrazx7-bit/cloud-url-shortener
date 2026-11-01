"use client";

import { useCallback, useEffect, useState } from "react";

function formatDate(value) {
  if (!value) return "기록 없음";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "기록 없음" : date.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}
function formatCount(value) { return Number(value ?? 0).toLocaleString("ko-KR"); }
function safeOriginalUrl(value) {
  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol) ? value : null;
  } catch { return null; }
}

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async (signal) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/stats", { cache: "no-store", credentials: "same-origin", signal });
      const data = await response.json().catch(() => null);
      if (response.status === 401 || response.status === 403) {
        throw new Error("관리자 인증이 필요합니다. 페이지를 새로 열어 로그인해 주세요.");
      }
      if (!response.ok) throw new Error(data?.error?.message || "통계를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      if (!data?.summary || !Array.isArray(data.urls)) throw new Error("통계 응답을 확인하지 못했습니다.");
      setStats(data);
    } catch (err) {
      if (err.name !== "AbortError") setError(err.message || "통계를 불러오지 못했습니다.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadStats(controller.signal);
    return () => controller.abort();
  }, [loadStats]);

  return (
    <div className="site-shell">
      <header className="site-header admin-width">
        <a className="wordmark" href="/"><span className="logo-mark" aria-hidden="true">↗</span> Cloud URL</a>
        <a className="quiet-link" href="/">주소 줄이기로 돌아가기</a>
      </header>
      <main className="admin-main" aria-busy={loading}>
        <div className="admin-heading">
          <div><span className="eyebrow">ADMIN</span><h1>링크 사용 통계</h1><p className="intro-text">저장된 주소와 클릭 기록을 확인하세요.</p></div>
          <button className="button button-secondary" type="button" disabled={loading} onClick={() => loadStats()}>{loading ? "불러오는 중…" : "새로고침"}</button>
        </div>
        {error && <p className="message message-error" role="alert">{error}</p>}
        {loading && <p className="message message-loading" role="status"><span className="spinner" aria-hidden="true" />통계를 불러오고 있습니다.</p>}
        {stats && (
          <>
            <section className="stats-grid" aria-label="전체 사용량">
              <div className="stat-card"><h2>전체 단축주소</h2><p>{formatCount(stats.summary.totalUrls)}<span>개</span></p></div>
              <div className="stat-card"><h2>전체 클릭</h2><p>{formatCount(stats.summary.totalClicks)}<span>회</span></p></div>
              <div className="stat-card"><h2>클릭된 주소</h2><p>{formatCount(stats.summary.clickedUrls)}<span>개</span></p></div>
              <div className="stat-card"><h2>최근 클릭 시간</h2><p className="stat-date">{formatDate(stats.summary.latestClickedAt)}</p></div>
            </section>
            <div className="top-link">
              <span>가장 많이 클릭된 주소</span>
              {stats.summary.topUrl
                ? <><a href={"/" + encodeURIComponent(stats.summary.topUrl.shortCode)} target="_blank" rel="noopener noreferrer">/{stats.summary.topUrl.shortCode}<span className="visually-hidden"> (새 창)</span></a><strong>{formatCount(stats.summary.topUrl.clickCount)}회</strong></>
                : <strong>아직 클릭 기록이 없습니다.</strong>}
            </div>
            <section className="table-panel" aria-labelledby="urls-title">
              <div className="table-heading"><h2 id="urls-title">주소별 사용량</h2><p>최근 생성한 주소 최대 100개 · 시간은 한국 기준</p></div>
              <div className="table-scroll" role="region" aria-label="주소별 사용량 표, 좁은 화면에서는 좌우로 스크롤" tabIndex={0}>
                <table>
                  <thead><tr><th scope="col">단축주소</th><th scope="col">원본 주소</th><th scope="col">클릭</th><th scope="col">생성 시간</th><th scope="col">최근 클릭</th></tr></thead>
                  <tbody>
                    {stats.urls.length === 0 ? <tr><td className="empty-table" colSpan={5}>아직 저장된 주소가 없습니다. 홈에서 첫 주소를 만들어 보세요.</td></tr> : stats.urls.map((url) => (
                      <tr key={url.shortCode}>
                        <td><a className="short-code" href={"/" + encodeURIComponent(url.shortCode)} target="_blank" rel="noopener noreferrer">/{url.shortCode}<span className="visually-hidden"> (새 창)</span></a></td>
                        <td className="original-url-cell">{safeOriginalUrl(url.originalUrl) ? <a href={safeOriginalUrl(url.originalUrl)} target="_blank" rel="noopener noreferrer">{url.originalUrl}<span className="visually-hidden"> (새 창)</span></a> : url.originalUrl}</td>
                        <td className="count-cell">{formatCount(url.clickCount)}</td>
                        <td className="date-cell">{formatDate(url.createdAt)}</td>
                        <td className="date-cell">{formatDate(url.lastClickedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
      <footer className="site-footer">Cloud URL · 관리자 통계</footer>
    </div>
  );
}
