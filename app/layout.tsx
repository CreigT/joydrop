import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JoyDrop",
  description:
    "Permission-first birthday pages: friends send messages through your invite link, you approve them, and your Birthday Bridge page unlocks on your birthday.",
  other: {
    sponsor: "Sponsored by CREIGNIFICENT LLC"
  }
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
        <footer className="bg-bg px-5 py-6 text-center text-xs font-semibold text-[#463B52]">
          <p>Sponsored by CREIGNIFICENT LLC</p>
          <p className="mt-2 space-x-4">
            <a className="underline" href="/privacy">
              Privacy
            </a>
            <a className="underline" href="/terms">
              Terms
            </a>
          </p>
        </footer>
      </body>
    </html>
  );
}
