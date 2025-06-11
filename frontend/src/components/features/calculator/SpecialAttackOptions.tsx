'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Swords, ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { specialAttacksApi } from '@/services/api';
import { SpecialAttack } from '@/types/calculator';

export function SpecialAttackOptions() {
  const [attacks, setAttacks] = useState<Record<string, SpecialAttack>>({});
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    specialAttacksApi
      .getAll()
      .then(setAttacks)
      .catch(() => setAttacks({}));
  }, []);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <Card className="w-full border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <Swords className="h-5 w-5 mr-2 text-primary" />
            Special Attacks
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
            {Object.entries(attacks).map(([key, info]) => {
              const [specialName, description] = info.effect.split(':', 2);
              return (
                <div key={key} className="text-sm space-y-1">
                  <div className="font-semibold">
                    {info.weapon_name} - {specialName.trim()} (Cost {info.special_cost}%)
                  </div>
                  <div>{description?.trim()}</div>
                </div>
              );
            })}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default SpecialAttackOptions;
