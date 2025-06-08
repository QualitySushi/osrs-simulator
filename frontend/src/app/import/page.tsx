'use client';
import { useState } from 'react';
import { useCalculatorStore } from '@/store/calculator-store';

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
      head: { id: 1163, name: 'Rune full helm' },
      body: { id: 1127, name: 'Rune platebody' },
      legs: { id: 1079, name: 'Rune platelegs' },
      mainhand: { id: 1333, name: 'Rune scimitar' },
      offhand: { id: 1201, name: 'Rune kiteshield' },
      hands: { id: 7462, name: 'Barrows gloves' },
      feet: { id: 3105, name: 'Climbing boots' },
      ring: { id: 2550, name: 'Ring of recoil' },
      cape: { id: 6568, name: 'Obsidian cape' },
      neck: { id: 1704, name: 'Amulet of glory' },
      ammo: null,
    },
    equipped_armor: {
      head: { id: 1163, name: 'Rune full helm' },
      body: { id: 1127, name: 'Rune platebody' },
      legs: { id: 1079, name: 'Rune platelegs' },
      hands: { id: 7462, name: 'Barrows gloves' },
      feet: { id: 3105, name: 'Climbing boots' },
      shield: { id: 1201, name: 'Rune kiteshield' },
      cape: { id: 6568, name: 'Obsidian cape' },
      neck: { id: 1704, name: 'Amulet of glory' },
      ring: { id: 2550, name: 'Ring of recoil' },
    },
    equipped_weapon: {
      mainhand: { id: 1333, name: 'Rune scimitar' },
      offhand: { id: 1201, name: 'Rune kiteshield' },
    },
  };

  const defaultSeed = btoa(JSON.stringify(placeholderParams));

  const [seed, setSeed] = useState(defaultSeed);

  const handleImport = () => {
    try {
      const jsonStr = atob(seed.trim());
      const data = JSON.parse(jsonStr);
      const { equipment, equipped_armor, equipped_weapon, ...params } = data;
      const loadout = equipment || { ...equipped_armor, ...equipped_weapon };
      useCalculatorStore.getState().setParams(params);
      if (loadout) {
        useCalculatorStore.getState().setLoadout(loadout);
      }
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
