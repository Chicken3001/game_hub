import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Game Hub",
  description: "A hub of small, fun games",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${nunito.variable} font-sans antialiased`}
        style={{ fontFamily: "var(--font-nunito), system-ui, sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
