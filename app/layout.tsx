import { Providers } from "@/components/providers";
import { Shell } from "@/components/shell";
import { WalkthroughProvider } from "@/components/walkthrough";
import { getSession } from "@/lib/session-cookie";
import type { Metadata } from "next";
import { Noto_Naskh_Arabic, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const naskh = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  variable: "--font-naskh",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Baton — screening follow-up",
  description: "Synthetic demonstration of screening follow-up, facility waits, and policy scenarios.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const role = session?.role ?? null;
  return (
    <html lang="en">
      <body className={`${jakarta.variable} ${naskh.variable} font-sans antialiased`}>
        <Providers>
          <WalkthroughProvider role={role}>
            <Shell role={role}>{children}</Shell>
          </WalkthroughProvider>
        </Providers>
      </body>
    </html>
  );
}
