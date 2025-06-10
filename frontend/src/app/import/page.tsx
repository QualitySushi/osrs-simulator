"use client";
export const dynamic = 'force-dynamic';
import { useState } from 'react';
import { useCalculatorStore } from '@/store/calculator-store';
import { itemsApi } from '@/services/api';
import { Item } from '@/types/calculator';

export default function ImportPage() {
  const placeholderParams = {
    combat_style: 'melee',
    strength_level: 75,
    strength_boost: 0,
    strength_prayer: 1,
    attack_level: 75,
    attack_boost: 0,
    attack_prayer: 1,
    melee_strength_bonus: 40,
    melee_attack_bonus: 60,
    attack_style_bonus_strength: 3,
    attack_style_bonus_attack: 0,
    attack_type: 'slash',
    void_melee: false,
    gear_multiplier: 1,
    special_multiplier: 1,
    target_defence_level: 100,
    target_defence_bonus: 20,
    attack_speed: 2.4,
    equipment: {
      head: 1163,
      body: 1127,
      legs: 1079,
      mainhand: 1333,
      offhand: 1201,
      hands: 7462,
      feet: 3105,
      ring: 2550,
      cape: 6568,
      neck: 1704,
      ammo: null,
    },
    equipped_armor: {
      head: 1163,
      body: 1127,
      legs: 1079,
      hands: 7462,
      feet: 3105,
      shield: 1201,
      cape: 6568,
      neck: 1704,
      ring: 2550,
    },
    equipped_weapon: {
      mainhand: 1333,
      offhand: 1201,
    },
  };

  const defaultSeed = btoa(JSON.stringify(placeholderParams));

  const [seed, setSeed] = useState(defaultSeed);

  const handleImport = async () => {
    try {
      const jsonStr = atob(seed.trim());
      const data = JSON.parse(jsonStr);
      const { equipment, equipped_armor, equipped_weapon, ...params } = data;

      const rawLoadout: Record<string, number | null> =
        equipment || { ...equipped_armor, ...equipped_weapon } || {};
      const processedLoadout: Record<string, Item | null> = {};

      await Promise.all(
        Object.entries(rawLoadout).map(async ([slot, itemId]) => {
          if (!itemId) {
            processedLoadout[slot] = null;
            return;
          }
          try {
            const fullItem = await itemsApi.getItemById(itemId as number);
            processedLoadout[slot] = fullItem;
          } catch {
            processedLoadout[slot] = null;
          }
        })
      );

      useCalculatorStore.getState().setParams(params);
      useCalculatorStore.getState().setLoadout(processedLoadout);

      alert('Profile imported');
    } catch (e) {
      alert('Invalid seed');
    }
  };

  return (
    <main id="main" className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">Import Profile Seed</h1>
      <textarea
        className="w-full border p-2 mb-4 rounded"
        rows={6}
        value={seed}
        onChange={(e) => setSeed(e.target.value)}
      />
      <button
        className="bg-primary text-primary-foreground px-4 py-2 rounded"
        onClick={handleImport}
      >
        Import
      </button>
    </main>
  );
}
