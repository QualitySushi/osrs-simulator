'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Github } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="py-3 border-b mb-8">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex space-x-6 items-center">
          <Link
            href="/"
            className="text-xl font-bold font-title flex items-center space-x-2"
          >
            <img
              src="/images/logo_transparent.png"
              alt="ScapeLab logo"
              className="w-6 h-6"
            />
            <span>ScapeLab</span>
          </Link>
          
          <div className="hidden md:flex space-x-4">
            <Link
              href="/"
              className={cn(
                'text-sm transition-colors hover:text-primary',
                pathname === '/' ? 'text-foreground font-medium' : 'text-muted-foreground'
              )}
            >
              Home
            </Link>
            <Link
              href="/calculator"
              className={cn(
                'text-sm transition-colors hover:text-primary',
                pathname === '/calculator' ? 'text-foreground font-medium' : 'text-muted-foreground'
              )}
            >
              Calculator
            </Link>
            <Link
              href="/best-in-slot"
              className={cn(
                'text-sm transition-colors hover:text-primary',
                pathname === '/best-in-slot' ? 'text-foreground font-medium' : 'text-muted-foreground'
              )}
            >
              Best in Slot
            </Link>
            <Link
              href="/simulate"
              className={cn(
                'text-sm transition-colors hover:text-primary',
                pathname === '/simulate' ? 'text-foreground font-medium' : 'text-muted-foreground'
              )}
            >
              Simulate
            </Link>
            <Link
              href="/presets"
              className={cn(
                'text-sm transition-colors hover:text-primary',
                pathname === '/presets' ? 'text-foreground font-medium' : 'text-muted-foreground'
              )}
            >
              Presets
            </Link>
            <Link
              href="/import"
              className={cn(
                'text-sm transition-colors hover:text-primary',
                pathname === '/import' ? 'text-foreground font-medium' : 'text-muted-foreground'
              )}
            >
              Import
            </Link>
            <Link
              href="/effects"
              className={cn(
                'text-sm transition-colors hover:text-primary',
                pathname === '/effects' ? 'text-foreground font-medium' : 'text-muted-foreground'
              )}
            >
              Effects
            </Link>
            <Link
              href="/assistant"
              className={cn(
                'text-sm transition-colors hover:text-primary',
                pathname === '/assistant' ? 'text-foreground font-medium' : 'text-muted-foreground'
              )}
            >
              Assistant
            </Link>
            <Link
              href="/news"
              className={cn(
                'text-sm transition-colors hover:text-primary',
                pathname === '/news' ? 'text-foreground font-medium' : 'text-muted-foreground'
              )}
            >
              News
            </Link>
            <Link
              href="/about"
              className={cn(
                'text-sm transition-colors hover:text-primary',
                pathname === '/about' ? 'text-foreground font-medium' : 'text-muted-foreground'
              )}
            >
              About
            </Link>
            <Link
              href="/report-bug"
              className={cn(
                'text-sm transition-colors hover:text-primary',
                pathname === '/report-bug' ? 'text-foreground font-medium' : 'text-muted-foreground'
              )}
            >
              Report Bug
            </Link>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <a
            href="https://github.com/QualitySushi/osrs-simulator"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Github className="h-5 w-5" />
            <span className="sr-only">GitHub</span>
          </a>
        </div>
      </div>
    </nav>
  );
}