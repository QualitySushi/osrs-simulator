'use client';
import { Label } from '@/components/ui/label';
import { useCalculatorStore } from '@/store/calculator-store';
import { itemsApi } from '@/services/api';
import { useQuery } from '@tanstack/react-query';

export function SpecialAttackWeaponSelector() {
  const { params, setParams } = useCalculatorStore();
  const { data: specials } = useQuery(['special-attacks'], itemsApi.getSpecialAttacks);

  return (
    <div className="space-y-1 mt-4">
      <Label>Special Attack Weapon</Label>
      <select
        className="w-full rounded border px-2 py-1 text-sm"
        value={params.weapon_name || ''}
        onChange={(e) => {
          const spec = specials?.find((s) => s.weapon_name === e.target.value);
          if (spec) {
            setParams({
              weapon_name: spec.weapon_name,
              special_attack_cost: spec.special_cost,
              special_multiplier: spec.damage_multiplier,
              accuracy_multiplier: spec.accuracy_multiplier,
              hit_count: spec.hit_count,
              guaranteed_hit: spec.guaranteed_hit,
            });
          } else {
            setParams({ weapon_name: undefined });
          }
        }}
      >
        <option value="">-- None --</option>
        {specials?.map((s) => (
          <option key={s.weapon_name} value={s.weapon_name}>
            {s.weapon_name}
          </option>
        ))}
      </select>
    </div>
  );
}

