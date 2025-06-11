import { safeFixed } from '@/utils/format';

type DpsDebugProps = {
  params: {
    combat_style: 'melee' | 'ranged' | 'magic';
    strength_level?: number;
    strength_boost?: number;
    strength_prayer?: number;
    attack_level?: number;
    attack_boost?: number;
    attack_prayer?: number;

    ranged_level?: number;
    ranged_attack_bonus?: number;
    ranged_strength_bonus?: number;

    magic_level?: number;
    magic_attack_bonus?: number;
    magic_damage_bonus?: number;

    void_melee?: boolean;
    void_ranged?: boolean;

    melee_attack_bonus?: number;
    melee_strength_bonus?: number;

    attack_style_bonus?: number;
    attack_style_bonus_attack?: number;
    attack_style_bonus_strength?: number;

    attack_type?: string;
    target_defence_type?: string;
    target_defence_level: number;
    target_defence_bonus: number;
    attack_speed: number;
  };
  output: {
    effective_str: number;
    max_hit: number;
    effective_atk: number;
    attack_roll: number;
    def_roll: number;
    hit_chance: number;
    avg_hit: number;
    dps: number;
  };
};

export default function DpsDebug({ params, output }: DpsDebugProps) {
  const defenseTypeName = params.target_defence_type 
    ? params.target_defence_type.replace('defence_', '').charAt(0).toUpperCase() +
      params.target_defence_type.replace('defence_', '').slice(1)
    : 'Slash';

  return (
    <div className="font-mono text-sm p-4 border rounded bg-muted">
      <h3 className="text-lg font-bold mb-2">=== {params.combat_style.charAt(0).toUpperCase() + params.combat_style.slice(1)} DPS Debug ===</h3>

      <p>→ <strong>Input Stats:</strong></p>
      {params.combat_style === 'melee' && (
        <>
          <p>  Strength Level: {params.strength_level}</p>
          <p>  Strength Boost: {params.strength_boost ?? 0}</p>
          <p>  Prayer Modifier (STR): {params.strength_prayer ?? 1.0}</p>
          <p>  Void Melee: {params.void_melee ? "Yes" : "No"}</p>
        </>
      )}
      {params.combat_style === 'ranged' && (
        <>
          <p>  Ranged Level: {params.ranged_level}</p>
          <p>  Void Ranged: {params.void_ranged ? "Yes" : "No"}</p>
        </>
      )}
      {params.combat_style === 'magic' && (
        <>
          <p>  Magic Level: {params.magic_level}</p>
        </>
      )}
      <p>  Attack Style Bonus (ATK): +{params.attack_style_bonus_attack ?? params.attack_style_bonus ?? 0}</p>
      <p>  Attack Style Bonus (STR): +{params.attack_style_bonus_strength ?? 0}</p>

      <br />
      <p>→ <strong>Effective Strength:</strong> {output.effective_str}</p>
      <p>  Strength Bonus: {
        params.combat_style === 'melee'
          ? params.melee_strength_bonus
          : params.combat_style === 'ranged'
            ? params.ranged_strength_bonus
            : `${Math.round((params.magic_damage_bonus ?? 0) * 100)}% (Magic Dmg)`
      }</p>
      <p>  Max Hit: {output.max_hit}</p>

      <br />
      <p>→ <strong>Input Attack:</strong></p>
      <p>  Attack Level: {params.attack_level ?? params.ranged_level ?? params.magic_level}</p>
      <p>  Attack Boost: {params.attack_boost ?? 0}</p>
      <p>  Prayer Modifier (ATK): {params.attack_prayer ?? 1.0}</p>
      <p>  Attack Type: {params.attack_type?.charAt(0).toUpperCase() + params.attack_type?.slice(1) || "Unknown"}</p>

      <br />
      <p>→ <strong>Effective Attack:</strong> {output.effective_atk}</p>
      <p>  Attack Bonus: {
        params.combat_style === 'melee'
          ? params.melee_attack_bonus
          : params.combat_style === 'ranged'
            ? params.ranged_attack_bonus
            : params.magic_attack_bonus
      }</p>
      <p>  Attack Roll: {output.attack_roll}</p>

      <br />
      <p>→ <strong>Target Stats:</strong></p>
      <p>  Defence Level: {params.target_defence_level}</p>
      <p>  Defence Bonus ({defenseTypeName}): {params.target_defence_bonus}</p>
      <p>  Defence Roll: {output.def_roll}</p>

      <br />
      <p>→ <strong>Hit Chance:</strong> {safeFixed(output.hit_chance, 4)}</p>
      <p>→ <strong>Average Hit:</strong> {safeFixed(output.avg_hit, 4)}</p>
      <p>→ <strong>Attack Speed:</strong> {params.attack_speed}s</p>
      <p>→ <strong>DPS:</strong> {safeFixed(output.dps, 4)}</p>
      <p className="mt-2 font-bold">=============================</p>
    </div>
  );
}
