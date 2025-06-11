"use client";

import { useEffect, useState } from "react";
import { useReferenceDataStore } from "@/store/reference-data-store";
import { LogoProgressCircle } from "@/components/ui/LogoProgressCircle";
import { OSRS_LOADING_JOKES } from "@/utils/jokes";

export function ReferenceDataOverlay() {
  const loading = useReferenceDataStore((s) => s.loading);
  const initialized = useReferenceDataStore((s) => s.initialized);
  const error = useReferenceDataStore((s) => s.error);
  const progress = useReferenceDataStore((s) => s.progress);

  const shouldShow = loading || (!initialized && !error);
  const [visible, setVisible] = useState(shouldShow);
  const [joke] = useState(
    () =>
      OSRS_LOADING_JOKES[Math.floor(Math.random() * OSRS_LOADING_JOKES.length)],
  );

  useEffect(() => {
    if (shouldShow) {
      setVisible(true);
    } else {
      const t = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(t);
    }
  }, [shouldShow]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="relative w-48 h-48 mx-auto">
          <LogoProgressCircle progress={progress} />
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
        <p className="mt-4 text-lg">
          {error ? "Failed to load game data" : "Loading game data..."}
        </p>
        {!error && (
          <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">
            {joke}
          </p>
        )}
      </div>
    </div>
  );
}
