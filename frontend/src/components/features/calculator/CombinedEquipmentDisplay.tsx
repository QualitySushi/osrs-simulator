import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCalculatorStore } from '@/store/calculator-store';
import { Item, CalculatorParams, BossForm } from '@/types/calculator';

// Import our new components
import { EquipmentGrid } from './EquipmentGrid';
import { AttackStyleSelector, DEFAULT_ATTACK_STYLES, ATTACK_TYPE_TO_DEFENCE_TYPE } from './AttackStyleSelector';
import { CombatStatsSummary } from './CombatStatsSummary';
import { SpellSelector } from './SpellSelector';
import { getWeaponAttackStyles } from './EquipmentUtils';

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

interface CombinedEquipmentDisplayProps {
  onEquipmentUpdate?: (loadout: Record<string, Item | null>) => void;
  bossForm?: BossForm | null;
}

export function CombinedEquipmentDisplay({ onEquipmentUpdate, bossForm }: CombinedEquipmentDisplayProps) {
  const { params, setParams, gearLocked, loadout, setLoadout, resetParams, resetLocks } = useCalculatorStore();
  // Start with 1H + Shield by default
  const [show2hOption, setShow2hOption] = useState(false);
  const [availableAttackStyles, setAvailableAttackStyles] = useState<string[]>([]);
  const [selectedAttackStyle, setSelectedAttackStyle] = useState<string>('');
  const [weaponStats, setWeaponStats] = useState<{
    attackStyles: Record<string, any>,
    baseAttackSpeed: number
  }>({
    attackStyles: {},
    baseAttackSpeed: 2.4 // Default 4 ticks
  });

  const handleResetEquipment = () => {
    setLoadout({});
    resetParams();
    resetLocks();
  };
  
  const combatStyle = params.combat_style;

  // Notify parent component when loadout changes
  useEffect(() => {
    if (onEquipmentUpdate) {
      onEquipmentUpdate(loadout);
    }
  }, [loadout, selectedAttackStyle, onEquipmentUpdate]);
  
  // Update bonuses when loadout changes
  const lastBonusRef = useRef<Partial<CalculatorParams>>({});
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
        rangedAtk += attack_bonuses.ranged || 0;
        rangedStr += other_bonuses['ranged strength'] || 0;
      }

      if (isMagicParams(current)) {
        magicAtk += attack_bonuses.magic || 0;
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
      if (process.env.NODE_ENV !== 'production') {
        console.log('[DEBUG] Updating combat totals:', updates);
      }
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

    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEBUG] Processing weapon:', weapon.name);
    }
  }, [loadout]);

  // Update available attack styles when weapon changes
  useEffect(() => {
    // Determine available attack styles based on combat style and weapon
    let weaponStyles = {};
    
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
  }, [weaponStats, combatStyle, params, selectedAttackStyle]);
  
  // Update params when attack style changes
  useEffect(() => {
    if (!selectedAttackStyle) return;

    let styleDefinition: any = undefined;

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
        updateParams.target_defence_bonus = bossForm?.[ATTACK_TYPE_TO_DEFENCE_TYPE[type] as keyof BossForm] ?? 0;
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
    params
  ]);

  // Handle equipment loadout changes
  const handleUpdateLoadout = useCallback((newLoadout: Record<string, Item | null>) => {
    setLoadout(newLoadout);
  }, [setLoadout]);

  // Handle attack style selection
  const handleSelectAttackStyle = useCallback((style: string) => {
    setSelectedAttackStyle(style);
  }, []);

  // Get attack styles for display
  const getAttackStylesForDisplay = useCallback(() => {
    // First check if we have weapon-specific styles
    if (Object.keys(weaponStats.attackStyles).length > 0) {
      return weaponStats.attackStyles;
    }
    // Otherwise fallback to defaults
    return DEFAULT_ATTACK_STYLES[combatStyle] || {};
  }, [weaponStats.attackStyles, combatStyle]);

  return (
    <Card>
      <CardHeader className="justify-center items-center">
        <div>
          <CardTitle>Character Preview</CardTitle>
          <CardDescription>Manage and inspect your gear</CardDescription>
        </div>
        <div className="flex flex-col items-center justify-center">
          <Toggle
            className="mb-2"
            pressed={show2hOption}
            onPressedChange={() => {
              setShow2hOption(prev => !prev);
              const current = { ...loadout };
              if (show2hOption) {
                delete current['2h'];
              } else {
                delete current['mainhand'];
                delete current['offhand'];
              }
              setLoadout(current);

              // Reset weapon stats when switching modes
              setWeaponStats({
                attackStyles: {},
                baseAttackSpeed: 2.4
              });
            }}
            size="sm"
          >
            {show2hOption ? 'Use 1H + Shield' : 'Use 2H'}
          </Toggle>
          
          {/* Attack style selector component */}
          <AttackStyleSelector
            loadout={loadout}
            combatStyle={combatStyle}
            bossForm={bossForm}
            attackStyles={getAttackStylesForDisplay()}
            availableAttackStyles={availableAttackStyles}
            selectedAttackStyle={selectedAttackStyle}
            onSelectAttackStyle={handleSelectAttackStyle}
          />
        </div>
      </CardHeader>

      <CardContent>
        {Object.keys(loadout).length > 0 && (
          <div className="flex justify-end mb-2">
            <Button variant="outline" size="sm" onClick={handleResetEquipment}
            >
              Reset Equipment
            </Button>
          </div>
        )}

        {gearLocked && (
          <Alert className="mb-4 border-blue-300 dark:border-blue-800 bg-blue-100 dark:bg-blue-900">
            <AlertDescription>Gear bonuses are locked in for simulation.</AlertDescription>
          </Alert>
        )}

        {/* Equipment grid component */}
        <EquipmentGrid
          loadout={loadout}
          show2hOption={show2hOption}
          combatStyle={combatStyle}
          onUpdateLoadout={handleUpdateLoadout}
        />
        
        {/* Combat stats summary component */}
        <CombatStatsSummary
          params={params}
          loadout={loadout}
          combatStyle={combatStyle}
          selectedAttackStyle={selectedAttackStyle}
          getAttackStylesForDisplay={getAttackStylesForDisplay}
        />
        
        {/* Magic spell selection (only for magic combat style) */}
        {isMagicParams(params) && (
          <SpellSelector
            params={params}
            setParams={setParams}
          />
        )}
      </CardContent>
    </Card>
  );
}