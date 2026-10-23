import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SPONSOR_TEXT, sponsoredDescription } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  title: "JoyDrop",
  description: sponsoredDescription(
    "AI that makes birthdays unforgettable — with permission only."
  ),
  authors: [{ name: "CREIGNIFICENT LLC" }],
  creator: "CREIGNIFICENT LLC",
  publisher: "CREIGNIFICENT LLC",
  other: { sponsor: SPONSOR_TEXT }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-body">
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
