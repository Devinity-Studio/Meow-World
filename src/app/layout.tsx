import type { Metadata } from "next";
import "./globals.css";
import { HomeAnchor } from "@/components/navigation/HomeAnchor";

export const metadata: Metadata = {
  title: "Meow World — Heart Edition | Living Passport & Life Journey",
  description: "A gentle sanctuary for your pet's living passport, life journey moments, digital certificates, and family co-care.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        {/* Gate 3 — Global Home Anchor: จุดเดียวของระบบ (ซ่อนเองตาม pathname) */}
        <HomeAnchor />
      </body>
    </html>
  );
}
