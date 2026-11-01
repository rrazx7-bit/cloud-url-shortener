import { createHash } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

// 3주차와 같은 SHA-256 방식으로 동일한 URL에 같은 6자리 코드를 생성합니다.
export function createShortCode(originalUrl) {
  const digest = createHash("sha256").update(originalUrl).digest();
  return Array.from(digest.subarray(0, 6), (value) => ALPHABET[value % ALPHABET.length]).join("");
}
