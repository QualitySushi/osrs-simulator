// layout.tsx - Updated version with fixed footer spacing
import { Providers } from '@/app/providers';
import { Navigation } from '@/components/layout/Navigation';
import { Footer } from '@/components/layout/Footer';
import { ReferenceDataBanner } from '@/components/layout/ReferenceDataBanner';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
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
        <a href="#main" className="sr-only focus:not-sr-only absolute left-2 top-2 z-50 bg-primary text-primary-foreground px-2 py-1 rounded">Skip to content</a>
        <Providers>
          <Navigation />
          <div className="absolute right-2 top-2 z-50">
            <ThemeToggle />
          </div>
          <ReferenceDataBanner />
          <div className="flex-grow mb-24"> {/* Added sufficient bottom margin to prevent footer overlap */}
            {children}
          </div>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}