'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { passiveEffectsApi } from '@/services/api';
import { PassiveEffect } from '@/types/calculator';

export function PassiveEffectOptions() {
  const [effects, setEffects] = useState<Record<string, PassiveEffect>>({});
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    passiveEffectsApi
      .getAll()
      .then(setEffects)
      .catch(() => setEffects({}));
  }, []);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <Card className="w-full border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <Sparkles className="h-5 w-5 mr-2 text-primary" />
            Passive Effects
          </CardTitle>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent asChild>
          <CardContent className="space-y-4">
            {Object.entries(effects).map(([key, info]) => (
              <div key={key} className="text-sm space-y-1">
                <div className="font-semibold">{info.item_name}</div>
                <div>{info.effect_description}</div>
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default PassiveEffectOptions;
