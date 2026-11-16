import { Providers } from "@/components/providers";
import { Shell } from "@/components/shell";
import { WalkthroughProvider } from "@/components/walkthrough";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Baton — screening follow-up",
  description: "Synthetic demonstration of screening follow-up, facility waits, and policy scenarios.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} font-sans antialiased`}>
        <Providers>
          <WalkthroughProvider>
            <Shell>{children}</Shell>
          </WalkthroughProvider>
        </Providers>
      </body>
    </html>
  );
}
