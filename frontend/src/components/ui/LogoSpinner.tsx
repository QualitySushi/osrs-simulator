import React from 'react';
import { cn } from '@/lib/utils';

export function LogoSpinner({ className }: { className?: string }) {
  return (
    <div className={cn('relative inline-block', className)}>
      <img
        src="/images/logo_transparent_off.png"
        alt="ScapeLab logo"
        className="absolute inset-0 w-full h-full object-contain logo-fade-off"
      />
      <img
        src="/images/logo_transparent_mid.png"
        alt="ScapeLab logo"
        className="absolute inset-0 w-full h-full object-contain logo-fade-mid"
      />
      <img
        src="/images/logo_transparent_on.png"
        alt="ScapeLab logo"
        className="absolute inset-0 w-full h-full object-contain logo-fade-on"
      />
    </div>
  );
}
