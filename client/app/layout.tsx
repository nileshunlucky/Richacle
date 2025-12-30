import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner"
import Navbar from "../components/Navbar"
import Script from "next/script";  // FIX

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Richacle",
  description: "Richacle is a Enterprise AI Quant Algorithm Trading Software Company", // FIX
  icons: {
    icon: "/logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>

        {/* APP-OPEN FIX */}
        <Script
          id="open-in-chrome"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              const ua = navigator.userAgent || '';
              const isInApp = /Instagram|FBAN|FBAV|Messenger|Twitter|WhatsApp|Telegram/i.test(ua);
              if (isInApp) {
                const url = window.location.href.replace(/^https?:\\/\\//, '');
                window.location = 'intent://' + url + '#Intent;scheme=https;package=com.android.chrome;end';
              }
            `,
          }}
        />

        {/* GOOGLE ANALYTICS */}
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-957PBBTHH1"
          strategy="afterInteractive"
        />

        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-957PBBTHH1');
          `}
        </Script>

        <Toaster position="top-right" richColors />
        <Navbar />
        {children}
      </body>
    </html>
  );
}
