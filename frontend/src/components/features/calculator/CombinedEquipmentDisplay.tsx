'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useCalculatorStore } from '@/store/calculator-store';
import { ItemSelector } from './ItemSelector';
import { 
  Item, 
  CalculatorParams, 
} from '@/app/types/calculator';
import { itemsApi } from '@/services/api';
import { BossForm } from '@/app/types/calculator';

function isMeleeParams(params: CalculatorParams): params is CalculatorParams & { 
  attack_level: number;
  strength_level: number; 
  melee_attack_bonus: number;
  melee_strength_bonus: number;
  attack_type?: string;
} {
  return params.combat_style === 'melee';
}

function isRangedParams(params: CalculatorParams): params is CalculatorParams & {
  ranged_level: number;
  ranged_attack_bonus: number;
  ranged_strength_bonus: number;
} {
  return params.combat_style === 'ranged';
}

function isMagicParams(params: CalculatorParams): params is CalculatorParams & {
  magic_level: number;
  magic_attack_bonus: number;
  magic_damage_bonus: number;
  base_spell_max_hit?: number;
  selected_spell?: string;
} {
  return params.combat_style === 'magic';
}

// Equipment slot layout
const EQUIPMENT_SLOTS = {
  head: { name: 'Head', icon: '🪖', position: 'top-center' },
  cape: { name: 'Cape', icon: '🧣', position: 'left-top' },
  neck: { name: 'Neck', icon: '📿', position: 'center-top-2' },
  ammo: { name: 'Ammo', icon: '🏹', position: 'right-top-2' },
  mainhand: { name: 'Weapon', icon: '⚔️', position: 'left-middle' },
  offhand: { name: 'Shield', icon: '🛡️', position: 'right-middle' },
  body: { name: 'Body', icon: '👕', position: 'center-middle' },
  legs: { name: 'Legs', icon: '👖', position: 'center-bottom' },
  hands: { name: 'Hands', icon: '🧤', position: 'left-bottom' },
  feet: { name: 'Feet', icon: '👢', position: 'bottom-center' },
  ring: { name: 'Ring', icon: '💍', position: 'right-bottom' },
  '2h': { name: 'Two-Handed', icon: '🗡️', position: 'left-middle-2h' }
};

const POSITION_TO_GRID: Record<string, string> = {
  'top-center': 'col-start-2 row-start-1',
  'left-top': 'col-start-1 row-start-2',
  'center-top-2': 'col-start-2 row-start-2',
  'right-top-2': 'col-start-3 row-start-2',
  'left-middle': 'col-start-1 row-start-3',
  'left-middle-2h': 'col-start-1 row-start-3',
  'right-middle': 'col-start-3 row-start-3',
  'center-middle': 'col-start-2 row-start-3',
  'center-bottom': 'col-start-2 row-start-4',
  'left-bottom': 'col-start-1 row-start-5',
  'bottom-center': 'col-start-2 row-start-5',
  'right-bottom': 'col-start-3 row-start-5'
};

const ATTACK_TYPE_TO_DEFENCE_TYPE: Record<string, string> = {
  stab: 'defence_stab',
  slash: 'defence_slash',
  crush: 'defence_crush',
  magic: 'defence_magic',
  ranged: 'defence_ranged_standard'
};

// Parse attack speeds from combat_styles string format
const parseAttackSpeed = (speedStr: string): number => {
  // Example format: "5 ticks (3.0s)"
  const match = speedStr?.match(/(\d+(\.\d+)?)s/);
  if (match && match[1]) {
    return parseFloat(match[1]);
  }
  // Default to 2.4s (4 ticks) if parsing fails
  return 2.4;
};

// Define attack styles with their bonuses
interface AttackStyleDefinition {
  name: string;
  attackType: string;
  bonus: {
    attack: number;
    strength: number;
    defence: number;
  };
  description: string;
}

// Get available attack styles from weapon's combat_styles data
const getWeaponAttackStyles = (weapon: Item | null): Record<string, AttackStyleDefinition> => {
  if (!weapon || !weapon.combat_stats?.combat_styles) return {};

  // Parse combat styles from the weapon data
  try {
    const styles: Record<string, AttackStyleDefinition> = {};
    
    // Format can be complex, handle both array and object formats
    const combatStyles = weapon.combat_stats.combat_styles;
    
    // Skip header row if it exists (common in the data)
    const startIdx = Array.isArray(combatStyles) &&
                    combatStyles[0]?.name === "Attack type" ? 1 : 0;
    
    // Process each style
    if (Array.isArray(combatStyles)) {
      for (let i = startIdx; i < combatStyles.length; i++) {
        const style = combatStyles[i];
        if (!style || !style.name) continue;

        const styleName = style.name.toLowerCase();
        let attackType = style.attack_type?.toLowerCase() || "";

        const bonuses = weapon.combat_stats.attack_bonuses || {};

        // If declared attackType is missing or ≤ 0, try to infer a better one
        const bonusMap: Record<string, number> = {
          stab: bonuses.stab ?? -999,
          slash: bonuses.slash ?? -999,
          crush: bonuses.crush ?? -999
        };

        const hasValidBonus = Object.values(bonusMap).some((val) => val > 0);
        // Check if attackType is a valid key and has a positive bonus
        const validAttackTypes = ['stab', 'slash', 'crush'];
        if (!validAttackTypes.includes(attackType) || !(attackType in bonusMap) || bonusMap[attackType as keyof typeof bonusMap] <= 0) {
          // Find first attack type with a positive bonus
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const fallback = Object.entries(bonusMap).find(([attackType, val]) => val > 0);
          if (fallback) {
            attackType = fallback[0]; // Replace bad attackType
          } else {
            // If no positive bonus found, default to the highest one (even if negative)
            const highestBonus = Object.entries(bonusMap).sort((a, b) => b[1] - a[1])[0];
            attackType = highestBonus ? highestBonus[0] : 'slash';
          }
        }
        
        if (!hasValidBonus) {
          // Find first attack type with a positive bonus
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const fallback = Object.entries(bonusMap).find(([attackType, val]) => val > 0);
          if (!fallback) {
            console.warn(`[Filtered] Skipping ${style.name}: no valid attack type bonuses`);
            continue;
          }
          attackType = fallback[0]; // Replace bad attackType
        }

        const boostDesc = style.boost || "";
        const isControlled = boostDesc.includes("+1 to all");
        const styleAttackBonus = isControlled ? 1 : (boostDesc.includes("+3 Attack") ? 3 : 0);
        const styleStrengthBonus = isControlled ? 1 : (boostDesc.includes("+3 Strength") ? 3 : 0);
        const styleDefenceBonus = isControlled ? 1 : (boostDesc.includes("+3 Defence") ? 3 : 0);

        styles[styleName] = {
          name: style.name,
          attackType,
          bonus: {
            attack: styleAttackBonus,
            strength: styleStrengthBonus,
            defence: styleDefenceBonus
          },
          description: boostDesc
        };
      }
    }
    
    return styles;
  } catch (error) {
    console.error("Failed to parse weapon combat styles:", error);
    return {};
  }
};

// Default attack styles if weapon doesn't provide them
const DEFAULT_ATTACK_STYLES: Record<string, Record<string, AttackStyleDefinition>> = {
  melee: {
    'accurate': { 
      name: 'Accurate', 
      attackType: 'slash',
      bonus: { attack: 3, strength: 0, defence: 0 },
      description: '+3 Attack'
    },
    'aggressive': { 
      name: 'Aggressive', 
      attackType: 'slash',
      bonus: { attack: 0, strength: 3, defence: 0 },
      description: '+3 Strength'
    },
    'controlled': { 
      name: 'Controlled', 
      attackType: 'stab',
      bonus: { attack: 1, strength: 1, defence: 1 },
      description: '+1 to all'
    },
    'defensive': { 
      name: 'Defensive', 
      attackType: 'slash',
      bonus: { attack: 0, strength: 0, defence: 3 },
      description: '+3 Defence'
    }
  },
  ranged: {
    'accurate': { 
      name: 'Accurate', 
      attackType: 'ranged',
      bonus: { attack: 3, strength: 0, defence: 0 },
      description: '+3 Ranged'
    },
    'rapid': { 
      name: 'Rapid', 
      attackType: 'ranged',
      bonus: { attack: 0, strength: 0, defence: 0 },
      description: 'Faster attack speed'
    },
    'longrange': { 
      name: 'Longrange', 
      attackType: 'ranged',
      bonus: { attack: 0, strength: 0, defence: 3 },
      description: '+3 Defence, increased range'
    }
  },
  magic: {
    'standard': { 
      name: 'Standard', 
      attackType: 'magic',
      bonus: { attack: 0, strength: 0, defence: 0 },
      description: 'Regular casting'
    },
    'defensive': { 
      name: 'Defensive', 
      attackType: 'magic',
      bonus: { attack: 0, strength: 0, defence: 3 },
      description: '+3 Defence'
    }
  }
};

interface CombinedEquipmentDisplayProps {
  onEquipmentUpdate?: (loadout: Record<string, Item | null>) => void;
  bossForm?: BossForm | null;
}

export function CombinedEquipmentDisplay({ onEquipmentUpdate, bossForm }: CombinedEquipmentDisplayProps) {
  const { toast } = useToast();
  const { params, setParams, gearLocked } = useCalculatorStore();
  const [loadout, setLoadout] = useState<Record<string, Item | null>>({});
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [show2hOption, setShow2hOption] = useState(true);
  const [availableAttackStyles, setAvailableAttackStyles] = useState<string[]>([]);
  const [selectedAttackStyle, setSelectedAttackStyle] = useState<string>('');
  const [weaponStats, setWeaponStats] = useState<{
    attackStyles: Record<string, AttackStyleDefinition>,
    baseAttackSpeed: number
  }>({
    attackStyles: {},
    baseAttackSpeed: 2.4 // Default 4 ticks
  });
  
  const combatStyle = params.combat_style;

  // Notify parent component when loadout changes
  useEffect(() => {
    if (onEquipmentUpdate) {
      onEquipmentUpdate(loadout);
    }
  }, [loadout,selectedAttackStyle, onEquipmentUpdate]);
  
  const updateAttackBonuses = useCallback((weapon: Item | null) => {
    if (!weapon || !weapon.combat_stats?.attack_bonuses) return;

    const { attack_bonuses = {}, other_bonuses = {} } = weapon.combat_stats;

    if (isMeleeParams(params)) {
      const attackType = params.attack_type || 'slash';
      const attackBonus = attack_bonuses[attackType as keyof typeof attack_bonuses] || 0;
      const strengthBonus = other_bonuses.strength || 0;

      const current = useCalculatorStore.getState().params;

      if (
        current.melee_attack_bonus !== attackBonus ||
        current.melee_strength_bonus !== strengthBonus ||
        current.attack_type !== attackType ||
        current.target_defence_type !== ATTACK_TYPE_TO_DEFENCE_TYPE[attackType]
      ) {
        setParams({
          melee_attack_bonus: attackBonus,
          melee_strength_bonus: strengthBonus,
          attack_type: attackType,
          target_defence_type: ATTACK_TYPE_TO_DEFENCE_TYPE[attackType]
        });
      }
    } else if (isRangedParams(params)) {
      const rangedAtk = attack_bonuses.ranged || 0;
      const rangedStr = other_bonuses['ranged strength'] || 0;

      const current = useCalculatorStore.getState().params;

      if (
        current.ranged_attack_bonus !== rangedAtk ||
        current.ranged_strength_bonus !== rangedStr ||
        current.target_defence_type !== 'defence_ranged_standard'
      ) {
        setParams({
          ranged_attack_bonus: rangedAtk,
          ranged_strength_bonus: rangedStr,
          target_defence_type: 'defence_ranged_standard'
        });
      }
    } else if (isMagicParams(params)) {
      const magicAtk = attack_bonuses.magic || 0;
      let magicDmg = 0;
      const dmgStr = other_bonuses['magic damage'];
      if (typeof dmgStr === 'string') {
        const match = dmgStr.match(/\+(\d+)%/);
        if (match) magicDmg = parseInt(match[1], 10) / 100;
      }

      const current = useCalculatorStore.getState().params;

      if (
        current.magic_attack_bonus !== magicAtk ||
        current.magic_damage_bonus !== magicDmg ||
        current.target_defence_type !== 'defence_magic'
      ) {
        setParams({
          magic_attack_bonus: magicAtk,
          magic_damage_bonus: magicDmg,
          target_defence_type: 'defence_magic'
        });
      }
    }
  }, [params, setParams]);

  const lastBonusRef = useRef<Partial<CalculatorParams>>({});
  
  // Update attack bonuses when loadout changes
  useEffect(() => {
    const current = useCalculatorStore.getState().params;
    const updates: Partial<CalculatorParams> = {};

    // Totals to accumulate
    let meleeAtk = 0, meleeStr = 0;
    let rangedAtk = 0, rangedStr = 0;
    let magicAtk = 0, magicDmg = 0;

    Object.entries(loadout).forEach(([_, item]) => {
      if (!item?.combat_stats) return;

      const { attack_bonuses = {}, other_bonuses = {} } = item.combat_stats;

      if (isMeleeParams(current)) {
        const type = current.attack_type as keyof typeof attack_bonuses;
        meleeAtk += attack_bonuses[type] || 0;
        meleeStr += other_bonuses.strength || 0;
      }

      if (isRangedParams(current)) {
        rangedAtk += attack_bonuses.ranged || 0; // ✅ READ attack bonuses
        rangedStr += other_bonuses['ranged strength'] || 0;
      }

      if (isMagicParams(current)) {
        magicAtk += attack_bonuses.magic || 0; // ✅ READ attack bonuses
        const dmgStr = other_bonuses['magic damage'];
        if (typeof dmgStr === 'string') {
          const match = dmgStr.match(/\+(\d+)%/);
          if (match) magicDmg += parseInt(match[1], 10) / 100;
        }
      }
    });

    const prev = lastBonusRef.current;

    if (isMeleeParams(current)) {
      if (prev.melee_attack_bonus !== meleeAtk) updates.melee_attack_bonus = meleeAtk;
      if (prev.melee_strength_bonus !== meleeStr) updates.melee_strength_bonus = meleeStr;
    }

    if (isRangedParams(current)) {
      if (prev.ranged_attack_bonus !== rangedAtk) updates.ranged_attack_bonus = rangedAtk;
      if (prev.ranged_strength_bonus !== rangedStr) updates.ranged_strength_bonus = rangedStr;
    }

    if (isMagicParams(current)) {
      if (prev.magic_attack_bonus !== magicAtk) updates.magic_attack_bonus = magicAtk;
      if (prev.magic_damage_bonus !== magicDmg) updates.magic_damage_bonus = magicDmg;
    }

    if (Object.keys(updates).length > 0) {
      console.log('[DEBUG] Updating combat totals:', updates);
      setParams(updates);
      lastBonusRef.current = {
        ...lastBonusRef.current,
        ...updates
      };
    }
  }, [loadout, setParams]);


  // Extract all weapon data and stats when weapon changes
  useEffect(() => {
    const weapon = loadout['2h'] || loadout['mainhand'];

    // Print full combat stats from every equipped item
    Object.entries(loadout).forEach(([slot, item]) => {
      if (item?.combat_stats) {
        console.log(`[DEBUG] Gear slot: ${slot}`);
        console.log(`[DEBUG] Item: ${item.name}`);
        console.log('[DEBUG] Item combat stats:', JSON.stringify(item.combat_stats, null, 2));
      }
    });

    if (!weapon) {
      // No weapon equipped — use defaults
      setWeaponStats({
        attackStyles: {},
        baseAttackSpeed: 2.4,
      });
      return;
    }

    // Weapon is equipped — set real stats
    setWeaponStats({
      attackStyles: getWeaponAttackStyles(weapon),
      baseAttackSpeed: weapon.combat_stats?.attack_speed ?? 2.4,
    });

    console.log('[DEBUG] Processing weapon:', weapon.name);
  }, [loadout, updateAttackBonuses]);

  useEffect(() => {
    const weapon = loadout['2h'] || loadout['mainhand'];

    if (!weapon) {
      // If loadout is empty but params were persisted, reset them
      const current = useCalculatorStore.getState().params;
      if (current.weapon_name) {
        console.log('[DEBUG] Resetting stale params due to missing loadout');
        useCalculatorStore.getState().resetParams?.();
      }
    }
  }, [loadout]);

  
  // Update available attack styles and select default when combat style or weapon changes
  useEffect(() => {
    // Determine available attack styles based on combat style and weapon
    let weaponStyles: Record<string, AttackStyleDefinition> = {};
    
    // Get the current weapon
    const weapon = loadout['2h'] || loadout['mainhand'];
    
    // First check if we have weapon-specific styles
    if (Object.keys(weaponStats.attackStyles).length > 0) {
      weaponStyles = weaponStats.attackStyles;
    } 
    // If not, fall back to default styles for the combat style
    else {
      weaponStyles = DEFAULT_ATTACK_STYLES[combatStyle] || {};
    }
    
    // Get the style names and set as available
    const availableStyles = Object.keys(weaponStyles);
    setAvailableAttackStyles(availableStyles);
    
    // If current selection is not available, select a default
    if (!availableStyles.includes(selectedAttackStyle)) {
      let defaultStyle = '';
      
      // Choose sensible defaults based on combat style
      if (isMeleeParams(params)) {
        // For melee, prefer 'aggressive' or 'accurate'
        defaultStyle = availableStyles.includes('aggressive') ? 'aggressive' : 
                      availableStyles.includes('accurate') ? 'accurate' : 
                      availableStyles[0];
      } 
      else if (isRangedParams(params)) {
        // For ranged, prefer 'rapid' or 'accurate'
        defaultStyle = availableStyles.includes('rapid') ? 'rapid' : 
                      availableStyles.includes('accurate') ? 'accurate' : 
                      availableStyles[0];
      } 
      else if (isMagicParams(params)) {
        // For magic, prefer 'standard'
        defaultStyle = availableStyles.includes('standard') ? 'standard' : 
                      availableStyles[0];
      }
      
      // Set the selected style if we found a valid default
      if (defaultStyle) {
        setSelectedAttackStyle(defaultStyle);
      }
    }
    // updateAttackBonuses(weapon);
  }, [loadout, updateAttackBonuses, weaponStats, combatStyle, params, selectedAttackStyle]);
  
useEffect(() => {
  if (!selectedAttackStyle) return;

  let styleDefinition: AttackStyleDefinition | undefined;

  if (Object.keys(weaponStats.attackStyles).length > 0 && weaponStats.attackStyles[selectedAttackStyle]) {
    styleDefinition = weaponStats.attackStyles[selectedAttackStyle];
  } else {
    styleDefinition = DEFAULT_ATTACK_STYLES[combatStyle]?.[selectedAttackStyle];
  }

  if (!styleDefinition) return;

  let finalAttackSpeed = weaponStats.baseAttackSpeed;
  if (selectedAttackStyle === 'rapid' && isRangedParams(params)) {
    finalAttackSpeed -= 0.6;
  }

  const current = {
    attack_style_bonus_attack: params.attack_style_bonus_attack,
    attack_style_bonus_strength: params.attack_style_bonus_strength,
    attack_speed: params.attack_speed,
    attack_type: (params as any).attack_type,
  };

  const next = {
    attack_style_bonus_attack: styleDefinition.bonus.attack,
    attack_style_bonus_strength: styleDefinition.bonus.strength,
    attack_speed: finalAttackSpeed,
    attack_type: styleDefinition.attackType
  };

  const needsUpdate =
    current.attack_style_bonus_attack !== next.attack_style_bonus_attack ||
    current.attack_style_bonus_strength !== next.attack_style_bonus_strength ||
    current.attack_speed !== next.attack_speed ||
    current.attack_type !== next.attack_type;

  if (needsUpdate) {
    const updateParams: Partial<CalculatorParams> = {
      attack_style_bonus_attack: next.attack_style_bonus_attack,
      attack_style_bonus_strength: next.attack_style_bonus_strength,
      attack_style_bonus: next.attack_style_bonus_attack,
      attack_speed: next.attack_speed,
      attack_type: next.attack_type
    };

    const type = next.attack_type;

    if (isMeleeParams(params)) {
      const weapon = loadout['2h'] || loadout['mainhand'];
      const atkBonuses = weapon?.combat_stats?.attack_bonuses || {};
      updateParams.melee_attack_bonus = atkBonuses[type as keyof typeof atkBonuses] ?? 0;
      updateParams.target_defence_type = ATTACK_TYPE_TO_DEFENCE_TYPE[type];
      updateParams.target_defence_bonus = bossForm?.[ATTACK_TYPE_TO_DEFENCE_TYPE[type]] ?? 0;
    }

    if (isRangedParams(params)) {
      updateParams.ranged_attack_bonus = params.ranged_attack_bonus;
      updateParams.ranged_strength_bonus = params.ranged_strength_bonus;
      updateParams.target_defence_type = 'defence_ranged_standard';
      updateParams.target_defence_bonus = bossForm?.defence_ranged_standard ?? 0;
    }

    if (isMagicParams(params)) {
      updateParams.magic_attack_bonus = params.magic_attack_bonus;
      updateParams.magic_damage_bonus = params.magic_damage_bonus;
      updateParams.target_defence_type = 'defence_magic';
      updateParams.target_defence_bonus = bossForm?.defence_magic ?? 0;
    }

    setParams(updateParams);
  }
}, [
  selectedAttackStyle,
  weaponStats,
  combatStyle,
  loadout,
  bossForm,
  setParams,
  params.attack_type,
  params.melee_attack_bonus,
  params.ranged_attack_bonus,
  params.magic_attack_bonus,
  params.magic_damage_bonus,
  params.attack_speed,
  params.attack_style_bonus_attack,
  params.attack_style_bonus_strength,
  params.target_defence_type
]);

  const getDisplaySlots = () => {
    const slotsToShow = Object.entries(EQUIPMENT_SLOTS)
      .filter(([slot]) => {
        // Only show offhand if not using 2H
        if (slot === 'offhand') return !show2hOption;
        // Only show mainhand if not using 2H
        if (slot === 'mainhand') return !show2hOption;
        // Only show 2H slot if using 2H
        if (slot === '2h') return show2hOption;
        return true;
      })
      .map(([slot, data]) => ({
        slot,
        ...data
      }));

    return slotsToShow;
  };

  const handleSelectItem = (slot: string, item: Item | null) => {
    if (!item) {
      const updated = { ...loadout };
      delete updated[slot];
      setLoadout(updated);
      toast.success(`Removed item from ${slot}`);
      setIsDialogOpen(false);
      return;
    }

    // Always fetch full item to ensure we get combat_stats
    itemsApi.getItemById(item.id).then((fullItem) => {
      if (!fullItem || !fullItem.combat_stats) {
        toast.error(`Failed to load full stats for ${item.name}`);
        return;
      }

      const updated = { ...loadout };

      if (slot === '2h') {
        delete updated['mainhand'];
        delete updated['offhand'];
        updated['2h'] = fullItem;
      } else {
        if (slot === 'mainhand' || slot === 'offhand') delete updated['2h'];
        updated[slot] = fullItem;
      }

      setLoadout(updated);
      toast.success(`Equipped ${fullItem.name}`);
      setIsDialogOpen(false);
    });
  };

  const getAttackStylesForDisplay = () => {
    // First check if we have weapon-specific styles
    if (Object.keys(weaponStats.attackStyles).length > 0) {
      return weaponStats.attackStyles;
    }
    // Otherwise fallback to defaults
    return DEFAULT_ATTACK_STYLES[combatStyle] || {};
  };

  const renderAttackStyleTabs = () => {
    const attackStyles = getAttackStylesForDisplay();
    
    if (isMeleeParams(params)) {
      
      return (
        <div className="p-3 text-center">
          <div className="mb-1 text-sm text-muted-foreground">Attack Type:</div>
          <div className="flex gap-2 justify-center mb-2">
            {(['stab', 'slash', 'crush'] as const).map((type) => {
              const bonus =
                loadout['2h']?.combat_stats?.attack_bonuses?.[type] ??
                loadout['mainhand']?.combat_stats?.attack_bonuses?.[type] ?? 0;

              return (
                <Button
                  key={type}
                  variant={params.attack_type === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    const weapon = loadout['2h'] || loadout['mainhand'];
                    const attackBonuses = weapon?.combat_stats?.attack_bonuses || {};
                    const bonus = attackBonuses[type] || 0;

                    const defenceBonus = bossForm?.[`defence_${type}` as keyof BossForm] ?? 0;

                    const current = useCalculatorStore.getState().params;

                    if (
                      current.attack_type !== type ||
                      current.melee_attack_bonus !== bonus ||
                      current.target_defence_type !== ATTACK_TYPE_TO_DEFENCE_TYPE[type] ||
                      current.target_defence_bonus !== defenceBonus
                    ) {
                      setParams({
                        attack_type: type,
                        melee_attack_bonus: bonus,
                        target_defence_type: ATTACK_TYPE_TO_DEFENCE_TYPE[type],
                        target_defence_bonus: defenceBonus
                      });
                    }
                  }}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}  {/* Capitalize attack type */}
                </Button>
              );
            })}
          </div>

          <div className="mb-1 text-sm text-muted-foreground">Combat Style:</div>
          <div className="flex flex-wrap gap-1 justify-center">
            {availableAttackStyles.map((style) => {
              const styleInfo = attackStyles[style];
              if (!styleInfo) return null;

              return (
                <TooltipProvider key={style}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant={style === selectedAttackStyle ? 'default' : 'outline'}
                        onClick={() => setSelectedAttackStyle(style)}
                      >
                        {styleInfo.name}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{styleInfo.description}</p>
                      <p className="text-xs">Attack type: {styleInfo.attackType}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="justify-center text-center items-center p-3">
        <div className="mb-1 text-sm text-muted-foreground">
          {isMeleeParams(params) 
            ? "Combat Style:" 
            : isRangedParams(params) 
              ? "Ranged Style:" 
              : "Magic Style:"}
        </div>
        <div className="flex flex-wrap gap-1 justify-center">
          {availableAttackStyles.map(style => {
            const styleInfo = attackStyles[style];
            if (!styleInfo) return null;
            
            return (
              <TooltipProvider key={style}>
                <Tooltip>
                  <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant={style === selectedAttackStyle ? 'default' : 'outline'}
                    onClick={() => setSelectedAttackStyle(style)}
                  >
                    {styleInfo.name} ({styleInfo.attackType})
                  </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{styleInfo.description}</p>
                    {isMeleeParams(params) && (
                      <p className="text-xs">Attack type: {styleInfo.attackType}</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="justify-center items-center">
        <div>
          <CardTitle>Character Preview</CardTitle>
          <CardDescription>Manage and inspect your gear</CardDescription>
        </div>
        <div className="flex flex-col items-center justify-center">
          <Button 
            variant="outline" 
            size="sm" 
            className="mb-2" 
            onClick={() => {
              setShow2hOption(prev => !prev);
              setLoadout(prev => {
                const copy = { ...prev };
                if (show2hOption) {
                  delete copy['2h'];
                } else {
                  delete copy['mainhand'];
                  delete copy['offhand'];
                }
                return copy;
              });
              
              // Reset weapon stats when switching modes
              setWeaponStats({
                attackStyles: {},
                baseAttackSpeed: 2.4
              });
              
              // // Update equipment bonuses after mode change
              // setTimeout(() => {
              //   const weapon = loadout['2h'] || loadout['mainhand'];
              //   updateAttackBonuses(weapon);
              // }, 0);
            }}>
            {show2hOption ? 'Use 1H + Shield' : 'Use 2H'}
          </Button>
          {renderAttackStyleTabs()}
        </div>
      </CardHeader>

      <CardContent>
        {gearLocked && (
          <Alert className="mb-4 border-blue-300 dark:border-blue-800 bg-blue-100 dark:bg-blue-900">
            <AlertDescription>Gear bonuses are locked in for simulation.</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-3 grid-rows-5 gap-2 justify-items-center mb-4">
          {getDisplaySlots().map(({ slot, name, icon, position }) => (
            <div
              key={slot}
              className={`${POSITION_TO_GRID[position]} w-20 h-20 flex flex-col items-center justify-center border rounded-md bg-muted/20 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800`}
              onClick={() => { setSelectedSlot(slot); setIsDialogOpen(true); }}
            >
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-2xl mb-1">{loadout[slot] ? '⚔️' : icon}</div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {loadout[slot]?.name || `Select ${name}`}
                    {loadout[slot]?.combat_stats && (
                      <div className="text-xs mt-1">
                        {slot === 'mainhand' || slot === '2h' ? (
                          <>
                            {isMeleeParams(params) && (
                              <>
                                <div>Stab: {loadout[slot].combat_stats.attack_bonuses.stab || 0}</div>
                                <div>Slash: {loadout[slot].combat_stats.attack_bonuses.slash || 0}</div>
                                <div>Crush: {loadout[slot].combat_stats.attack_bonuses.crush || 0}</div>
                                <div>Str: {loadout[slot].combat_stats.other_bonuses.strength || 0}</div>
                              </>
                            )}
                            {isRangedParams(params) && (
                              <>
                                <div>Range: {loadout[slot].combat_stats.attack_bonuses.ranged || 0}</div>
                                <div>Range Str: {loadout[slot].combat_stats.other_bonuses['ranged strength'] || 0}</div>
                              </>
                            )}
                            {isMagicParams(params) && (
                              <>
                                <div>Magic: {loadout[slot].combat_stats.attack_bonuses.magic || 0}</div>
                                <div>Magic Dmg: {loadout[slot].combat_stats.other_bonuses['magic damage'] || '+0%'}</div>
                              </>
                            )}
                          </>
                        ) : null}
                      </div>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="text-xs truncate w-full text-center">
                {loadout[slot]?.name || name}
              </div>
            </div>
          ))}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedSlot && `Select ${selectedSlot.charAt(0).toUpperCase() + selectedSlot.slice(1)} Equipment`}
              </DialogTitle>
            </DialogHeader>
            {selectedSlot && (
              <ItemSelector
                slot={selectedSlot}
                onSelectItem={(item) => handleSelectItem(selectedSlot, item)}
              />
            )}
            <Button
              variant="destructive"
              onClick={() => selectedSlot && handleSelectItem(selectedSlot, null)}
            >
              Clear Slot
            </Button>
          </DialogContent>
        </Dialog>
        
        {/* Combat stats summary */}
        <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-md">
          <h4 className="font-medium text-sm mb-2">Combat Setup:</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Combat Style:</span>{' '}
              <span className="font-medium capitalize">{combatStyle}</span>
            </div>
            {isMeleeParams(params) && (
              <div>
                <span className="text-muted-foreground">Attack Type:</span>{' '}
                <span className="font-medium capitalize">{params.attack_type || 'slash'}</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Attack Style:</span>{' '}
              <span className="font-medium">
                {getAttackStylesForDisplay()[selectedAttackStyle]?.name || 'None'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Attack Speed:</span>{' '}
              <span className="font-medium">
                {params.attack_speed.toFixed(1)}s
                {selectedAttackStyle === 'rapid' && (
                  <span className="text-green-600 dark:text-green-400 ml-1">(Faster)</span>
                )}
              </span>
            </div>
            {Object.keys(getAttackStylesForDisplay()).length > 0 && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Style Bonus:</span>{' '}
                <span className="font-medium">
                  {getAttackStylesForDisplay()[selectedAttackStyle]?.description || 'None'}
                </span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Target Defense Type:</span>{' '}
              <span className="font-medium capitalize">
                {(params.target_defence_type || 'defence_slash').replace('defence_', '')}
              </span>
            </div>
          </div>
          
          {/* Weapon stats display */}
          {(loadout['2h'] || loadout['mainhand']) && (
            <div className="mt-2 pt-2 border-t border-border/50">
              <h5 className="text-sm font-medium mb-1">Weapon Stats:</h5>
              {isMeleeParams(params) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-xs">
                  <div>
                    <span className="text-muted-foreground">Stab:</span>{' '}
                    <span className="font-medium">
                      {(loadout['2h'] || loadout['mainhand'])?.combat_stats?.attack_bonuses.stab || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Slash:</span>{' '}
                    <span className="font-medium">
                      {(loadout['2h'] || loadout['mainhand'])?.combat_stats?.attack_bonuses.slash || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Crush:</span>{' '}
                    <span className="font-medium">
                      {(loadout['2h'] || loadout['mainhand'])?.combat_stats?.attack_bonuses.crush || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Strength:</span>{' '}
                    <span className="font-medium">
                      {(loadout['2h'] || loadout['mainhand'])?.combat_stats?.other_bonuses.strength || 0}
                    </span>
                  </div>
                </div>
              )}
              {isRangedParams(params) && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div>
                    <span className="text-muted-foreground">Ranged Attack:</span>{' '}
                    <span className="font-medium">
                      {(loadout['2h'] || loadout['mainhand'])?.combat_stats?.attack_bonuses.ranged || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ranged Strength:</span>{' '}
                    <span className="font-medium">
                      {(loadout['2h'] || loadout['mainhand'])?.combat_stats?.other_bonuses['ranged strength'] || 0}
                    </span>
                  </div>
                </div>
              )}
              {isMagicParams(params) && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div>
                    <span className="text-muted-foreground">Magic Attack:</span>{' '}
                    <span className="font-medium">
                      {(loadout['2h'] || loadout['mainhand'])?.combat_stats?.attack_bonuses.magic || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Magic Damage:</span>{' '}
                    <span className="font-medium">
                      {(loadout['2h'] || loadout['mainhand'])?.combat_stats?.other_bonuses['magic damage'] || '+0%'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Equipment totals */}
          <div className="mt-2 pt-2 border-t border-border/50">
            <h5 className="text-sm font-medium mb-1">Equipment Totals:</h5>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              {isMeleeParams(params) && (
                <>
                  <div>
                    <span className="text-muted-foreground">Attack Bonus:</span>{' '}
                    <span className="font-medium">
                      {params.melee_attack_bonus || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Strength Bonus:</span>{' '}
                    <span className="font-medium">
                      {params.melee_strength_bonus || 0}
                    </span>
                  </div>
                </>
              )}
              {isRangedParams(params) && (
                <>
                  <div>
                    <span className="text-muted-foreground">Ranged Attack Bonus:</span>{' '}
                    <span className="font-medium">
                      {params.ranged_attack_bonus || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ranged Strength Bonus:</span>{' '}
                    <span className="font-medium">
                      {params.ranged_strength_bonus || 0}
                    </span>
                  </div>
                </>
              )}
              {isMagicParams(params) && (
                <>
                  <div>
                    <span className="text-muted-foreground">Magic Attack Bonus:</span>{' '}
                    <span className="font-medium">
                      {params.magic_attack_bonus || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Magic Damage Bonus:</span>{' '}
                    <span className="font-medium">
                      {Math.round((params.magic_damage_bonus || 0) * 100)}%
                    </span>
                  </div>
                </>
              )}
              <div>
                <span className="text-muted-foreground">Style Attack Bonus:</span>{' '}
                <span className="font-medium">
                  +{params.attack_style_bonus_attack || 0}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Style Strength Bonus:</span>{' '}
                <span className="font-medium">
                  +{params.attack_style_bonus_strength || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Magic spell selection (only for magic combat style) */}
        {isMagicParams(params) && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold mb-2">Select Spell</h4>
            <div className="grid grid-cols-1 gap-2">
              <select
                aria-label="Select magic spell"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={params.selected_spell || ''}
                onChange={(e) => {
                  const selected = e.target.value;
                  const spellMaxHits: Record<string, number> = {
                    'Fire Strike': 8,
                    'Fire Bolt': 12,
                    'Fire Blast': 16,
                    'Fire Wave': 20,
                    'Fire Surge': 24,
                    'Iban Blast': 25,
                    'Trident of the Seas': 23,
                    'Trident of the Swamp': 25,
                    'Sanguinesti Staff': 24,
                    "Tumeken's Shadow": 29
                  };
                  
                  const baseHit = spellMaxHits[selected] || 0;
                  
                  // Now we can safely set magic-specific properties
                  setParams({
                    selected_spell: selected,
                    base_spell_max_hit: baseHit
                  });
                  
                  toast.success(`Selected ${selected} with base hit ${baseHit}`);
                }}
              >
                <option value="">-- Select a Spell --</option>
                <optgroup label="Standard Spellbook">
                  <option value="Fire Strike">Fire Strike (8)</option>
                  <option value="Fire Bolt">Fire Bolt (12)</option>
                  <option value="Fire Blast">Fire Blast (16)</option>
                  <option value="Fire Wave">Fire Wave (20)</option>
                  <option value="Fire Surge">Fire Surge (24)</option>
                </optgroup>
                <optgroup label="Special Spells">
                  <option value="Iban Blast">Iban Blast (25)</option>
                </optgroup>
                <optgroup label="Powered Staves">
                  <option value="Trident of the Seas">Trident of the Seas (23)</option>
                  <option value="Trident of the Swamp">Trident of the Swamp (25)</option>
                  <option value="Sanguinesti Staff">Sanguinesti Staff (24)</option>
                  <option value="Tumeken's Shadow">Tumeken&apos;s Shadow (29)</option>
                </optgroup>
              </select>
              
              {params.selected_spell && (
                <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded">
                  <div className="text-sm">
                    <span className="font-medium">{params.selected_spell}</span>
                    <span className="text-muted-foreground ml-2">
                      Base Max Hit: {params.base_spell_max_hit}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}