"use client";

import { useRef, useState } from "react";

const MAX_URL_LENGTH = 2048;

// 2주차의 입력 검증을 유지하고 실제 생성 API에 연결합니다.
function validateUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) return "줄이고 싶은 URL을 입력해 주세요.";
  if (trimmed.length > MAX_URL_LENGTH) return "URL은 2048자 이하로 입력해 주세요.";
  if (!/^https?:\/\//i.test(trimmed)) return "http:// 또는 https://로 시작하는 주소를 입력해 주세요.";
  try {
    const url = new URL(trimmed);
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname) {
      return "http:// 또는 https://로 시작하는 주소를 입력해 주세요.";
    }
  } catch {
    return "올바른 URL을 입력해 주세요. 예: https://example.com";
  }
  return null;
}

export default function Home() {
  const [originalUrl, setOriginalUrl] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const submitting = useRef(false);
  const resultInput = useRef(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting.current) return;
    setError("");
    setResult(null);
    setCopyMessage("");
    const validationError = validateUrl(originalUrl);
    if (validationError) {
      setError(validationError);
      return;
    }
    submitting.current = true;
    setIsLoading(true);
    try {
      const response = await fetch("/api/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalUrl: originalUrl.trim() }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("요청이 많습니다. 잠시 기다린 뒤 다시 시도해 주세요.");
        }
        throw new Error(data?.error?.message || "주소를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }
      if (!data?.shortUrl || !data?.shortCode) {
        throw new Error("응답을 확인하지 못했습니다. 다시 시도해 주세요.");
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof TypeError
        ? "서버에 연결하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요."
        : err.message || "주소를 만들지 못했습니다. 다시 시도해 주세요.");
    } finally {
      submitting.current = false;
      setIsLoading(false);
    }
  }

  async function copyShortUrl() {
    try {
      await navigator.clipboard.writeText(result.shortUrl);
      setCopyMessage("단축주소를 복사했습니다.");
    } catch {
      resultInput.current?.focus();
      resultInput.current?.select();
      setCopyMessage("주소를 선택했습니다. 직접 복사해 주세요.");
    }
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="wordmark" href="/" aria-label="Cloud URL 홈">
          <span className="logo-mark" aria-hidden="true">↗</span> Cloud URL
        </a>
        <a className="quiet-link" href="/admin">관리자 통계</a>
      </header>
      <main className="home-main">
        <section className="url-card" aria-labelledby="page-title">
          <span className="eyebrow">URL SHORTENER</span>
          <h1 id="page-title">긴 주소를 짧고 간편하게.</h1>
          <p className="intro-text">공유하고 싶은 링크를 넣고, 짧은 주소로 전달하세요.</p>
          <form className="url-form" onSubmit={handleSubmit} noValidate aria-busy={isLoading}>
            <label htmlFor="original-url">줄이고 싶은 URL</label>
            <div className="input-row">
              <input
                id="original-url" name="originalUrl" type="text" inputMode="url"
                autoComplete="url" autoCapitalize="none" spellCheck={false}
                placeholder="https://example.com/long-link"
                value={originalUrl}
                onChange={(event) => {
                  setOriginalUrl(event.target.value);
                  setError(""); setResult(null); setCopyMessage("");
                }}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "url-hint url-error" : "url-hint"}
                disabled={isLoading}
              />
              <button className="button button-primary" type="submit" disabled={isLoading}>
                {isLoading ? "만드는 중…" : "주소 줄이기"}
              </button>
            </div>
            <p className="input-hint" id="url-hint">http:// 또는 https:// 주소 · 최대 2,048자</p>
            {error && <p className="message message-error" id="url-error" role="alert">{error}</p>}
            {isLoading && <p className="message message-loading" role="status"><span className="spinner" aria-hidden="true" /> 단축주소를 준비하고 있습니다.</p>}
          </form>
          <div aria-live="polite" aria-atomic="true">
            {result && (
              <section className="result-panel" aria-labelledby="result-title">
                <h2 id="result-title">{result.reused ? "기존 단축주소를 찾았어요." : "단축주소가 준비됐어요."}</h2>
                <label className="visually-hidden" htmlFor="short-url">생성된 단축주소</label>
                <input id="short-url" className="result-url" ref={resultInput} value={result.shortUrl} readOnly onFocus={(event) => event.target.select()} />
                <div className="result-actions">
                  <button type="button" className="button button-primary" onClick={copyShortUrl}>주소 복사</button>
                  <a className="button button-secondary" href={result.shortUrl} target="_blank" rel="noopener noreferrer">링크 열기 <span aria-hidden="true">↗</span><span className="visually-hidden"> (새 창)</span></a>
                </div>
                <p className="copy-message">{copyMessage || "복사한 주소를 원하는 곳에 공유하세요."}</p>
              </section>
            )}
          </div>
          <div className="service-note">
            <p><span aria-hidden="true">↻</span> 같은 원본 주소는 기존 단축주소를 다시 사용합니다.</p>
            <p><span aria-hidden="true">↗</span> 이 서비스의 주소는 다시 단축할 수 없습니다.</p>
          </div>
        </section>
      </main>
      <footer className="site-footer">Cloud URL · 클라우드 컴퓨팅 실습</footer>
    </div>
  );
}
