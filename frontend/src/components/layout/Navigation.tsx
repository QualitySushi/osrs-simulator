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
            className="text-xl font-bold font-title"
          >
            OSRS DPS Calculator
          </Link>
          
          <div className="hidden md:flex space-x-4">
            <Link 
              href="/" 
              className={cn(
                'text-sm transition-colors hover:text-primary',
                pathname === '/' ? 'text-foreground font-medium' : 'text-muted-foreground'
              )}
            >
              Calculator
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
              href="/import"
              className={cn(
                'text-sm transition-colors hover:text-primary',
                pathname === '/import' ? 'text-foreground font-medium' : 'text-muted-foreground'
              )}
            >
              Import
            </Link>
            <Link
              href="/simulation"
              className={cn(
                'text-sm transition-colors hover:text-primary',
                pathname === '/simulation' ? 'text-foreground font-medium' : 'text-muted-foreground'
              )}
            >
              Simulation
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