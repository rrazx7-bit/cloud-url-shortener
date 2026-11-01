export const MAX_URL_LENGTH = 2048;

// Next.js가 내부 request.url을 localhost로 만들더라도 실제 요청 호스트를 사용합니다.
export function getRequestOrigin(request) {
  const internal = new URL(request.url);
  const host = request.headers.get("host");
  if (!host || /[\s/\\?#@,]/.test(host)) return internal.origin;
  const forwardedProtocol = request.headers.get("x-forwarded-proto");
  const protocol = process.env.VERCEL === "1" && ["http", "https"].includes(forwardedProtocol)
    ? `${forwardedProtocol}:` : internal.protocol;
  try {
    return new URL(`${protocol}//${host}`).origin;
  } catch {
    return internal.origin;
  }
}

export function validateOriginalUrl(raw) {
  if (raw == null || (typeof raw === "string" && !raw.trim())) {
    return { error: { code: "MISSING_URL", message: "URL을 입력해 주세요." } };
  }
  if (typeof raw !== "string") {
    return { error: { code: "INVALID_URL", message: "URL은 문자열로 입력해 주세요." } };
  }
  const originalUrl = raw.trim();
  if (originalUrl.length > MAX_URL_LENGTH) {
    return { error: { code: "URL_TOO_LONG", message: "URL은 2048자 이하로 입력해 주세요." } };
  }
  try {
    const parsedUrl = new URL(originalUrl);
    if (!/^https?:\/\//i.test(originalUrl) || !["http:", "https:"].includes(parsedUrl.protocol) ||
        /[\u0000-\u001f\u007f]/.test(originalUrl) || !parsedUrl.hostname) {
      throw new Error("Invalid URL");
    }
    return { originalUrl, parsedUrl };
  } catch {
    return { error: { code: "INVALID_URL", message: "http:// 또는 https://로 시작하는 올바른 URL을 입력해 주세요." } };
  }
}

function hostname(value) {
  try {
    return new URL(value.includes("://") ? value : `https://${value}`).hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return "";
  }
}

// 도메인이 같은지만 비교합니다. 다른 사용자의 vercel.app 주소는 허용합니다.
export function isSelfUrl(parsedUrl, requestUrl, aliases = []) {
  const target = parsedUrl.hostname.toLowerCase().replace(/\.$/, "");
  return [requestUrl, ...aliases].filter(Boolean).some((value) => hostname(value) === target);
}
