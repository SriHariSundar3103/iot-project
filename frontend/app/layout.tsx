import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hospital Tool Tracking System",
  description:
    "Smart RFID and QR based tool management system for healthcare facilities",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.className}`}>
        <div className="min-h-screen flex flex-col">{children}</div>
      </body>
    </html>
  );
}
