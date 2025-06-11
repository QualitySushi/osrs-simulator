'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { passiveEffectsApi } from '@/services/api';
import { PassiveEffect } from '@/types/calculator';

export function PassiveEffectOptions() {
  const [effects, setEffects] = useState<Record<string, PassiveEffect>>({});

  useEffect(() => {
    passiveEffectsApi
      .getAll()
      .then(setEffects)
      .catch(() => setEffects({}));
  }, []);

  return (
    <Card className="w-full border">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Sparkles className="h-5 w-5 mr-2 text-primary" />
          Passive Effects
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(effects).map(([key, info]) => (
          <div key={key} className="text-sm space-y-1">
            <div className="font-semibold">{info.item_name}</div>
            <div>{info.effect_description}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default PassiveEffectOptions;
