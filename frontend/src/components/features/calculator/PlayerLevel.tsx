'use client';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { useCalculatorStore } from '@/store/calculator-store';

export function PlayerLevel() {
  const params = useCalculatorStore((s) => s.params);
  const setParams = useCalculatorStore((s) => s.setParams);

  const handleChange = (field: string, value: number) => {
    setParams({ [field]: value } as any);
  };

  if (params.combat_style === 'melee') {
    return (
      <div className="space-y-4">
        <h3 className="text-3xl font-semibold m-6">Player Levels</h3>
        <div>
          <Label>Attack Level: {params.attack_level}</Label>
          <Slider
            min={1}
            max={99}
            step={1}
            value={[params.attack_level]}
            onValueChange={(v) => handleChange('attack_level', v[0])}
          />
        </div>
        <div>
          <Label>Strength Level: {params.strength_level}</Label>
          <Slider
            min={1}
            max={99}
            step={1}
            value={[params.strength_level]}
            onValueChange={(v) => handleChange('strength_level', v[0])}
          />
        </div>
      </div>
    );
  }

  if (params.combat_style === 'ranged') {
    return (
      <div className="space-y-4">
        <h3 className="text-3xl font-semibold m-6">Player Levels</h3>
        <div>
          <Label>Ranged Level: {params.ranged_level}</Label>
          <Slider
            min={1}
            max={99}
            step={1}
            value={[params.ranged_level]}
            onValueChange={(v) => handleChange('ranged_level', v[0])}
          />
        </div>
      </div>
    );
  }

  if (params.combat_style === 'magic') {
    return (
      <div className="space-y-4">
        <h3 className="text-3xl font-semibold m-6">Player Levels</h3>
        <div>
          <Label>Magic Level: {params.magic_level}</Label>
          <Slider
            min={1}
            max={99}
            step={1}
            value={[params.magic_level]}
            onValueChange={(v) => handleChange('magic_level', v[0])}
          />
        </div>
      </div>
    );
  }

  return null;
}

export default PlayerLevel;
