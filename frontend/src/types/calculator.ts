// Define the combat styles
export type CombatStyle = 'melee' | 'ranged' | 'magic';

// Define equipment slot types
export type EquipmentSlot =
  | 'head'
  | 'cape'
  | 'neck'
  | 'ammo'
  | 'mainhand'
  | 'offhand'
  | 'body'
  | 'legs'
  | 'hands'
  | 'feet'
  | 'ring'
  | 'spec'
  | '2h';

// Equipment loadout interface
export interface EquipmentLoadout {
  head?: Item | null;
  cape?: Item | null;
  neck?: Item | null;
  ammo?: Item | null;
  mainhand?: Item | null;
  offhand?: Item | null;
  body?: Item | null;
  legs?: Item | null;
  hands?: Item | null;
  feet?: Item | null;
  ring?: Item | null;
  spec?: Item | null;
  '2h'?: Item | null;
}

// Base parameters for all combat styles
export interface BaseCalculatorParams {
  combat_style: CombatStyle;
  attack_speed: number;
  void_bonus?: boolean;
  salve_bonus?: number;
  gear_multiplier?: number;
  special_multiplier?: number;
  attack_style_bonus?: number; // Add this field which is in the backend model
  equipment?: EquipmentLoadout;
  weapon_name?: string;
  special_attack_cost?: number;
  special_rotation?: number;
  special_attack_speed?: number;
  special_damage_multiplier?: number;
  special_accuracy_modifier?: number;
  special_energy_cost?: number;
  special_regen_rate?: number;
  lightbearer?: boolean;
  surge_potion?: boolean;
  initial_special_energy?: number;
  duration?: number;
}

// Shared fields across styles
type WithDefenceReduction = {
  original_defence_level?: number;
  dwh_hits?: number;
  elder_maul_hits?: number;
  arclight_hits?: number;
  emberlight_hits?: number;
  tonalztics_hits?: number;
  bandos_godsword_damage?: number;
  seercull_damage?: number;
  accursed_sceptre?: boolean;
  vulnerability?: boolean;
};

// Melee specific parameters
export interface MeleeCalculatorParams extends BaseCalculatorParams, WithDefenceReduction {
  combat_style: 'melee';
  strength_level: number;
  strength_boost: number;
  strength_prayer: number;
  attack_level: number;
  attack_boost: number;
  attack_prayer: number;
  melee_strength_bonus: number;
  melee_attack_bonus: number;
  attack_type: string;
  attack_style_bonus_strength: number;
  attack_style_bonus_attack: number;
  void_melee?: boolean;
  target_defence_level: number;
  target_defence_bonus: number;
  target_defence_type?: string;
}

// Ranged specific parameters
export interface RangedCalculatorParams extends BaseCalculatorParams, WithDefenceReduction {
  combat_style: 'ranged';
  ranged_level: number;
  ranged_boost: number;
  ranged_prayer: number;
  ranged_strength_bonus: number;
  ranged_attack_bonus: number;
  attack_style_bonus_attack: number;
  attack_style_bonus_strength: number;
  void_ranged?: boolean;
  target_defence_level: number;
  target_defence_bonus: number;
  target_defence_type?: string;
}

// Magic specific parameters
export interface MagicCalculatorParams extends BaseCalculatorParams, WithDefenceReduction {
  combat_style: 'magic';
  magic_level: number;
  magic_boost: number;
  magic_prayer: number;
  base_spell_max_hit: number;
  magic_attack_bonus: number;
  magic_damage_bonus: number;
  attack_style_bonus_attack: number;
  attack_style_bonus_strength: number;
  void_magic?: boolean;
  shadow_bonus?: number;
  virtus_bonus?: number;
  tome_bonus?: number;
  prayer_bonus?: number;
  elemental_weakness?: number;
  salve_bonus?: number; // Add this field which is in the backend
  target_magic_level: number;
  target_magic_defence: number;
  target_defence_level: number;
  target_defence_bonus: number;
  spellbook: 'standard' | 'ancient' | 'lunars';
  spell_type: 'offensive' | 'defensive';
  god_spell_charged: boolean;
  selected_spell?: string;
  target_defence_type?: string;
}

// Union type for all calculator parameters
export type CalculatorParams =
  | MeleeCalculatorParams
  | RangedCalculatorParams
  | MagicCalculatorParams;

// Total bonuses for equipment
export interface TotalBonuses {
  attackBonus: number;
  strengthBonus: number;
  damageBonus: number;
}

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
  damage_multiplier?: number;
  special_attacks?: number;
  duration?: number;
  special_attack_dps?: number;
  mainhand_dps?: number;
}

// Expanded DPS result with additional information
export interface DetailedDpsResult extends DpsResult {
  timeToKill?: number;
  hitsToKill?: number;
  dpsWithOverkill?: number;
  missChance?: number;
  criticalHitChance?: number;
  totalBonuses?: TotalBonuses;
}

export interface Preset {
  id: string;
  name: string;
  combatStyle: CombatStyle;
  timestamp: number;
  params: CalculatorParams;
  equipment?: EquipmentLoadout;
  seed?: string;
}

export interface Boss {
  id: number;
  name: string;
  raid_group?: string;
  location?: string;
  icon_url?: string;
  combat_level?: number;
  hitpoints?: number;
  examine?: string;
  has_multiple_forms?: boolean;
  forms?: BossForm[];
  weakness?: CombatStyle | null;
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
  defence_stab?: number;   // <-- Ensure these exist in your boss form
  defence_slash?: number;
  defence_crush?: number;
  defence_magic?: number;
  defence_ranged_light?: number;
  defence_ranged_standard?: number;
  defence_ranged_heavy?: number;
  elemental_weakness_type?: string;
  elemental_weakness_percent?: number;
  weakness?: CombatStyle | null;
  attack_styles?: string[];
  immunities?: string[];
  icons?: string[];
  size?: number;
}

export interface BossSummary {
  id: number;
  name: string;
  raid_group?: string;
  location?: string;
  has_multiple_forms?: boolean;
  icon_url?: string;
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
  special_attack?: string;
  passive_effect_text?: string;
  examine?: string;
  weight?: number;
  value?: number;
  requirements?: {
    levels?: Record<string, number>;
    quests?: string[];
  };
  release_date?: string;
  icons?: string[];
}

export interface ItemSummary {
  id: number;
  name: string;
  slot?: string;
  has_special_attack: boolean;
  has_passive_effect: boolean;
  is_tradeable: boolean;
  has_combat_stats: boolean;
  icons?: string[];
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
  attack_speed?: number;
}

export interface ComparisonResult {
  label: string;
  params: CalculatorParams;
  results: DpsResult;
  equipment?: EquipmentLoadout;
  target?: BossForm;
}

export interface SearchParams {
  query?: string;
  combat_only?: boolean;
  tradeable_only?: boolean;
  slot?: EquipmentSlot;
  limit?: number;
}

export interface SpecialAttack {
  weapon_name: string;
  effect: string;
  special_cost: number;
  accuracy_multiplier: number;
  damage_multiplier: number;
}

export interface PassiveEffect {
  item_name: string;
  effect_description: string;
  effect_type?: string;
  category?: string;
  stackable?: boolean;
}
