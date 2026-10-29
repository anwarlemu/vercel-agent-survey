import type { Metadata } from "next";
import { Geist_Mono, Press_Start_2P } from "next/font/google";
import "./globals.css";

// `display: "block"` holds text invisible for the few ms the fonts take to
// arrive (they're self-hosted and preloaded) instead of flashing a fallback
// face and swapping.
const mono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "block",
});

const pixel = Press_Start_2P({
  variable: "--font-pixel",
  weight: "400",
  subsets: ["latin"],
  display: "block",
});

export const metadata: Metadata = {
  title: "agent-survey",
  description:
    "A survey for agents, to understand their world and the preferences they form.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${mono.variable} ${pixel.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
