import type { Metadata } from "next";
import { Chiron_Sung_HK, Lora } from "next/font/google";
import { ImmersiveScrollbar } from "@/components/immersive-scrollbar";
import "./globals.css";

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

const chironSungHK = Chiron_Sung_HK({
  variable: "--font-chiron",
  subsets: ["latin"],
  preload: false,
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "Vidarblogs | 博客聚合",
  description: "Vidar-Team 成员博客 RSS 聚合",
  icons: {
    shortcut: "/favicon.ico",
    apple: "/favicon.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      className={`${lora.variable} ${chironSungHK.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ImmersiveScrollbar />
        {children}
      </body>
    </html>
  );
}
