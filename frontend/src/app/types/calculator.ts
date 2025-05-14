export type CombatStyle = 'melee' | 'ranged' | 'magic';

// Base parameters for all combat styles
export interface BaseCalculatorParams {
  combat_style: CombatStyle;
  attack_speed: number;
  void_bonus?: boolean;
  salve_bonus?: number;
  gear_multiplier?: number;
  special_multiplier?: number;
}

// Melee specific parameters
export interface MeleeCalculatorParams extends BaseCalculatorParams {
  combat_style: 'melee';
  strength_level: number;
  strength_boost: number;
  strength_prayer: number;
  attack_level: number;
  attack_boost: number;
  attack_prayer: number;
  melee_strength_bonus: number;
  melee_attack_bonus: number;
  attack_style_bonus: number;
  void_melee?: boolean;
  target_defence_level: number;
  target_defence_bonus: number;
}

// Ranged specific parameters
export interface RangedCalculatorParams extends BaseCalculatorParams {
  combat_style: 'ranged';
  ranged_level: number;
  ranged_boost: number;
  ranged_prayer: number;
  ranged_strength_bonus: number;
  ranged_attack_bonus: number;
  attack_style_bonus: number;
  void_ranged?: boolean;
  target_defence_level: number;
  target_ranged_defence_bonus: number;
}

// Magic specific parameters
export interface MagicCalculatorParams extends BaseCalculatorParams {
  combat_style: 'magic';
  magic_level: number;
  magic_boost: number;
  magic_prayer: number;
  base_spell_max_hit: number;
  magic_attack_bonus: number;
  magic_damage_bonus: number;
  attack_style_bonus: number;
  void_magic?: boolean;
  shadow_bonus?: number;
  virtus_bonus?: number;
  tome_bonus?: number;
  prayer_bonus?: number;
  elemental_weakness?: number;
  target_magic_level: number;
  target_magic_defence: number;
}

// Union type for all calculator parameters
export type CalculatorParams = 
  | MeleeCalculatorParams 
  | RangedCalculatorParams 
  | MagicCalculatorParams;

// Result types
export interface DpsResult {
  dps: number;
  max_hit: number;
  hit_chance: number;
  attack_roll: number;
  defence_roll: number;
  average_hit: number;
  effective_str?: number;
  effective_atk?: number;
}

// Boss and item types
export interface Boss {
  id: number;
  name: string;
  raid_group?: string;
  location?: string;
  combat_level?: number;
  hitpoints?: number;
  forms?: BossForm[];
}

export interface BossForm {
  id: number;
  boss_id: number;
  form_name: string;
  form_order: number;
  combat_level?: number;
  hitpoints?: number;
  attack_level?: number;
  strength_level?: number;
  defence_level?: number;
  magic_level?: number;
  ranged_level?: number;
  defence_stab?: number;
  defence_slash?: number;
  defence_crush?: number;
  defence_magic?: number;
  defence_ranged_light?: number;
  defence_ranged_standard?: number;
  defence_ranged_heavy?: number;
}

export interface Item {
  id: number;
  name: string;
  slot?: string;
  has_special_attack: boolean;
  has_passive_effect: boolean;
  is_tradeable: boolean;
  has_combat_stats: boolean;
  combat_stats?: ItemCombatStats;
}

export interface ItemCombatStats {
  attack_bonuses: {
    stab?: number;
    slash?: number;
    crush?: number;
    magic?: number;
    ranged?: number;
  };
  defence_bonuses: {
    stab?: number;
    slash?: number;
    crush?: number;
    magic?: number;
    ranged?: number;
  };
  other_bonuses: {
    strength?: number;
    'ranged strength'?: number;
    'magic damage'?: string;
    prayer?: number;
  };
  combat_styles?: Array<{
  name: string;
  attack_type: string;
  style: string;
  speed: string;
  range: string;
  experience: string;
  boost?: string;
}>;
}