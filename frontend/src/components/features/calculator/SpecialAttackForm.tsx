'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCalculatorStore } from '@/store/calculator-store';
import { Swords } from 'lucide-react';

export default function SpecialAttackForm() {
  const params = useCalculatorStore((s) => s.params);
  const setParams = useCalculatorStore((s) => s.setParams);

  return (
    <Card className="w-full border">
      <CardHeader className="flex items-center gap-2">
        <Swords className="h-5 w-5 text-primary" />
        <CardTitle>Special Attack</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Damage Multiplier</Label>
          <Input
            type="number"
            step="0.01"
            value={params.special_damage_multiplier ?? 1}
            onChange={(e) =>
              setParams({ special_damage_multiplier: parseFloat(e.target.value) })
            }
          />
        </div>
        <div>
          <Label>Accuracy Modifier</Label>
          <Input
            type="number"
            step="0.01"
            value={params.special_accuracy_modifier ?? 1}
            onChange={(e) =>
              setParams({ special_accuracy_modifier: parseFloat(e.target.value) })
            }
          />
        </div>
        <div>
          <Label>Attack Speed</Label>
          <Input
            type="number"
            step="0.1"
            value={params.special_attack_speed ?? params.attack_speed}
            onChange={(e) =>
              setParams({ special_attack_speed: parseFloat(e.target.value) })
            }
          />
        </div>
        <div>
          <Label>Energy Cost</Label>
          <Input
            type="number"
            step="1"
            value={params.special_energy_cost ?? 0}
            onChange={(e) =>
              setParams({ special_energy_cost: parseInt(e.target.value, 10) })
            }
          />
        </div>
        <div>
          <Label>Regen Rate (per sec)</Label>
          <Input
            type="number"
            step="0.01"
            value={params.special_regen_rate ?? 10 / 30}
            onChange={(e) =>
              setParams({ special_regen_rate: parseFloat(e.target.value) })
            }
          />
        </div>
        <div>
          <Label>Initial Energy</Label>
          <Input
            type="number"
            step="1"
            value={params.initial_special_energy ?? 100}
            onChange={(e) =>
              setParams({ initial_special_energy: parseFloat(e.target.value) })
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
