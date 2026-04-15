import type { Metadata } from "next";
import { Barlow } from "next/font/google";
import { SupabaseProvider } from "@/components/supabase-provider";
import { MissingSupabaseEnv, readSupabaseEnv } from "@/lib/env-check";
import "./globals.css";

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow",
});

export const metadata: Metadata = {
  title: "Opmobility Rack Maintenance",
  description: "Rack damage maintenance and floor plan scanning",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const env = readSupabaseEnv();

  return (
    <html lang="en-US" className={`${barlow.variable} h-full`} suppressHydrationWarning>
      <body
        lang="en-US"
        translate="no"
        className="flex min-h-full flex-col bg-[#1a1c1e] font-sans text-zinc-100 antialiased"
        suppressHydrationWarning
      >
        {!env ? (
          <div className="flex min-h-full flex-1 items-center justify-center p-8">
            <MissingSupabaseEnv />
          </div>
        ) : (
          <SupabaseProvider url={env.url} anonKey={env.key}>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
          </SupabaseProvider>
        )}
      </body>
    </html>
  );
}
