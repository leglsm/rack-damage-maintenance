import type { Metadata } from "next";
import { Barlow } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow",
});

export const metadata: Metadata = {
  title: "Opmobility Greer Rack Maintenance",
  description: "Rack damage maintenance and floor plan scanning",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${barlow.variable} h-full`} suppressHydrationWarning>
      <body
        className="flex min-h-full flex-col bg-[#1a1c1e] font-sans text-zinc-100 antialiased"
        suppressHydrationWarning
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-row">
          <Sidebar />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
        </div>
      </body>
    </html>
  );
}
