'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useCalculatorStore } from '@/store/calculator-store';
import { Swords } from 'lucide-react';

export function SpecialAttackOptions() {
  const { params, setParams } = useCalculatorStore();

  return (
    <Card className="w-full border">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Swords className="h-5 w-5 mr-2 text-primary" />
          Special Attacks
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Special Cost</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={params.special_attack_cost ?? 0}
            onChange={(e) =>
              setParams({ special_attack_cost: parseInt(e.target.value) || 0 })
            }
          />
        </div>
        <div className="space-y-1">
          <Label>Rotation (%)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={Math.round((params.special_rotation ?? 0) * 100)}
            onChange={(e) =>
              setParams({ special_rotation: (parseFloat(e.target.value) || 0) / 100 })
            }
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={!!params.lightbearer}
            onCheckedChange={(v) => setParams({ lightbearer: v })}
          />
          <Label>Lightbearer</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={!!params.surge_potion}
            onCheckedChange={(v) => setParams({ surge_potion: v })}
          />
          <Label>Surge Potion</Label>
        </div>
        <div className="space-y-1">
          <Label>Duration (s)</Label>
          <Input
            type="number"
            min={1}
            value={params.duration ?? 60}
            onChange={(e) =>
              setParams({ duration: parseFloat(e.target.value) || 60 })
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default SpecialAttackOptions;
