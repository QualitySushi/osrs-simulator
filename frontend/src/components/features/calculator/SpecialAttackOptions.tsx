'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Swords } from 'lucide-react';
import { useEffect, useState } from 'react';
import { specialAttacksApi } from '@/services/api';
import { SpecialAttack } from '@/types/calculator';

export function SpecialAttackOptions() {
  const [attacks, setAttacks] = useState<Record<string, SpecialAttack>>({});

  useEffect(() => {
    specialAttacksApi
      .getAll()
      .then(setAttacks)
      .catch(() => setAttacks({}));
  }, []);

  return (
    <Card className="w-full border">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Swords className="h-5 w-5 mr-2 text-primary" />
          Special Attacks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(attacks).map(([key, info]) => (
          <div key={key} className="text-sm space-y-1">
            <div className="font-semibold">
              {info.special_name} - Cost {info.cost}%
            </div>
            <div>{info.effect}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default SpecialAttackOptions;
