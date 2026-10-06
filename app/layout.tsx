import type { Metadata, Viewport } from "next";
import { Sora, Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-sora",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tata Sprint Treker",
  description: "Itinerary & To-Do List untuk Tata di Yogyakarta.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#e8ffee",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${sora.variable} ${inter.variable} ${spaceGrotesk.variable}`}
    >
      <body className="min-h-screen bg-background text-text-main font-inter antialiased selection:bg-primary selection:text-white">
        {children}
      </body>
    </html>
  );
}
