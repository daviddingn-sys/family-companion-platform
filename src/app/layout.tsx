import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "家庭陪伴平台",
  description: "统一家庭、成员、老人档案与健康数据的家庭陪伴平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
