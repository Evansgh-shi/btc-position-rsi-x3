import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BTC 仓位仪表盘",
  description: "RSI × 恐贪指数 × 标准正态分布的 BTC 动态仓位参考",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
