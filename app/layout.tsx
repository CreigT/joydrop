import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JoyDrop",
  description: "AI that makes birthdays unforgettable — with permission only"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-body">{children}</body>
    </html>
  );
}
