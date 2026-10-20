// 🖼️ 모든 화면의 "액자" — 글꼴, 카톡 미리보기 제목/사진을 정해요
import './globals.css';

const site = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : 'http://localhost:3000';

export const metadata = {
  metadataBase: new URL(site),
  title: '크리스마스 우리아이에게 편지보내기',
  description: '엄마 아빠의 목소리가 선물상자에 담겨 우리 아이에게 찾아가요 🎁',
  openGraph: {
    title: '크리스마스 우리아이에게 편지보내기 🎄',
    description: '엄마 아빠의 목소리가 선물상자에 담겨 우리 아이에게 찾아가요 🎁',
    images: [{ url: '/og.jpg', width: 1200, height: 630 }],
    type: 'website',
    locale: 'ko_KR',
  },
  icons: { apple: '/apple-touch-icon.png', icon: '/apple-touch-icon.png' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#7a1414',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preload" href="/kossu.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Gowun+Dodum&family=Jua&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
