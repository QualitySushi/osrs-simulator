type DpsDebugProps = {
  params: {
    strength_level: number;
    strength_boost?: number;
    strength_prayer?: number;
    attack_style_bonus?: number;
    void_melee?: boolean;
    melee_strength_bonus: number;
    attack_level: number;
    attack_boost?: number;
    attack_prayer?: number;
    melee_attack_bonus: number;
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
  return (
    <div className="font-mono text-sm p-4 border rounded bg-muted">
      <h3 className="text-lg font-bold mb-2">=== Melee DPS Debug ===</h3>

      <p>→ <strong>Input Stats:</strong></p>
      <p>  Strength Level: {params.strength_level}</p>
      <p>  Strength Boost: {params.strength_boost ?? 0}</p>
      <p>  Prayer Modifier (STR): {params.strength_prayer ?? 1.0}</p>
      <p>  Attack Style Bonus: {params.attack_style_bonus ?? 0}</p>
      <p>  Void Melee: {params.void_melee ? "Yes" : "No"}</p>

      <br />
      <p>→ <strong>Effective Strength:</strong> {output.effective_str}</p>
      <p>  Strength Bonus: {params.melee_strength_bonus}</p>
      <p>  Max Hit: {output.max_hit}</p>

      <br />
      <p>→ <strong>Input Attack:</strong></p>
      <p>  Attack Level: {params.attack_level}</p>
      <p>  Attack Boost: {params.attack_boost ?? 0}</p>
      <p>  Prayer Modifier (ATK): {params.attack_prayer ?? 1.0}</p>

      <br />
      <p>→ <strong>Effective Attack:</strong> {output.effective_atk}</p>
      <p>  Attack Bonus: {params.melee_attack_bonus}</p>
      <p>  Attack Roll: {output.attack_roll}</p>

      <br />
      <p>→ <strong>Target Stats:</strong></p>
      <p>  Defence Level: {params.target_defence_level}</p>
      <p>  Defence Bonus: {params.target_defence_bonus}</p>
      <p>  Defence Roll: {output.def_roll}</p>

      <br />
      <p>→ <strong>Hit Chance:</strong> {output.hit_chance.toFixed(4)}</p>
      <p>→ <strong>Average Hit:</strong> {output.avg_hit.toFixed(4)}</p>
      <p>→ <strong>Attack Speed:</strong> {params.attack_speed}s</p>
      <p>→ <strong>DPS:</strong> {output.dps.toFixed(4)}</p>

      <p className="mt-2 font-bold">=============================</p>
    </div>
  );
}
