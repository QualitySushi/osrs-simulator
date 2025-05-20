// layout.tsx - Updated version with fixed footer spacing
import { Providers } from '@/app/providers';
import { Navigation } from '@/components/layout/Navigation';
import { Footer } from '@/components/layout/Footer';
import './globals.css';
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OSRS DPS Calculator",
  description: "Calculate DPS for Old School RuneScape combat styles and gear",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <Providers>
          <Navigation />
          <div className="flex-grow mb-24"> {/* Added sufficient bottom margin to prevent footer overlap */}
            {children}
          </div>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}