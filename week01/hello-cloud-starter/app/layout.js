import "./globals.css";

export const metadata = {
  title: "Cloud URL | 간편한 URL 단축",
  description: "긴 인터넷 주소를 짧게 만들고 간편하게 공유하세요.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
