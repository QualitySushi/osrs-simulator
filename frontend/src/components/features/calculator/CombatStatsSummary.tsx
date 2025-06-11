import { CalculatorParams, Item } from '@/types/calculator';
import { safeFixed } from '@/utils/format';

interface CombatStatsSummaryProps {
  params: CalculatorParams;
  loadout: Record<string, Item | null>;
  combatStyle: string;
  selectedAttackStyle: string;
  getAttackStylesForDisplay: () => Record<string, any>;
}

export function CombatStatsSummary({
  params,
  loadout,
  combatStyle,
  selectedAttackStyle,
  getAttackStylesForDisplay
}: CombatStatsSummaryProps) {
  const totalDefence = {
    stab: 0,
    slash: 0,
    crush: 0,
    magic: 0,
    ranged: 0,
  };
  Object.entries(loadout).forEach(([slot, item]) => {
    if (slot === 'spec') return;
    const def = item?.combat_stats?.defence_bonuses;
    if (!def) return;
    totalDefence.stab += def.stab || 0;
    totalDefence.slash += def.slash || 0;
    totalDefence.crush += def.crush || 0;
    totalDefence.magic += def.magic || 0;
    totalDefence.ranged += def.ranged || 0;
  });
  return (
    <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-md">
      <h4 className="font-medium text-sm mb-2">Combat Setup:</h4>
      <div className="grid grid-cols-3 gap-2 text-sm text-center">
        <div>
          <span className="text-muted-foreground">Combat Style:</span>{' '}
          <span className="font-medium capitalize">{combatStyle}</span>
        </div>
        {combatStyle === 'melee' && (
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
            {safeFixed(params.attack_speed, 1)}s
            {selectedAttackStyle === 'rapid' && (
              <span className="text-green-600 dark:text-green-400 ml-1">(Faster)</span>
            )}
          </span>
        </div>
        {Object.keys(getAttackStylesForDisplay()).length > 0 && (
          <div>
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
          {combatStyle === 'melee' && (
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
          {combatStyle === 'ranged' && (
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
          {combatStyle === 'magic' && (
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
        <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs">
          {combatStyle === 'melee' && (
            <>
              <div>
                <span className="text-muted-foreground">Attack Bonus:</span>{' '}
                <span className="font-medium">
                  {params.melee_attack_bonus || 0}
                </span>
              </div>
              <div />
              <div>
                <span className="text-muted-foreground">Strength Bonus:</span>{' '}
                <span className="font-medium">
                  {params.melee_strength_bonus || 0}
                </span>
              </div>
            </>
          )}
          {combatStyle === 'ranged' && (
            <>
              <div>
                <span className="text-muted-foreground">Ranged Attack Bonus:</span>{' '}
                <span className="font-medium">
                  {params.ranged_attack_bonus || 0}
                </span>
              </div>
              <div />
              <div>
                <span className="text-muted-foreground">Ranged Strength Bonus:</span>{' '}
                <span className="font-medium">
                  {params.ranged_strength_bonus || 0}
                </span>
              </div>
            </>
          )}
          {combatStyle === 'magic' && (
            <>
              <div>
                <span className="text-muted-foreground">Magic Attack Bonus:</span>{' '}
                <span className="font-medium">
                  {params.magic_attack_bonus || 0}
                </span>
              </div>
              <div />
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
          <div />
          <div>
            <span className="text-muted-foreground">Style Strength Bonus:</span>{' '}
            <span className="font-medium">
              +{params.attack_style_bonus_strength || 0}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs mt-2">
          <div>
            <span className="text-muted-foreground">Def Stab:</span>{' '}
            <span className="font-medium">{totalDefence.stab}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Def Slash:</span>{' '}
            <span className="font-medium">{totalDefence.slash}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Def Crush:</span>{' '}
            <span className="font-medium">{totalDefence.crush}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Def Magic:</span>{' '}
            <span className="font-medium">{totalDefence.magic}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Def Ranged:</span>{' '}
            <span className="font-medium">{totalDefence.ranged}</span>
          </div>
        </div>
      </div>
    </div>
  );
}