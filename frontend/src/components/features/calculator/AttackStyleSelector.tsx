import {
  Button
} from '@/components/ui/button';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from '@/components/ui/tooltip';
import { Item } from '@/app/types/calculator';
import { useCalculatorStore } from '@/store/calculator-store';
import { BossForm } from '@/app/types/calculator';

// Define attack styles with their bonuses
export interface AttackStyleDefinition {
  name: string;
  attackType: string;
  bonus: {
    attack: number;
    strength: number;
    defence: number;
  };
  description: string;
}

export const ATTACK_TYPE_TO_DEFENCE_TYPE: Record<string, string> = {
  stab: 'defence_stab',
  slash: 'defence_slash',
  crush: 'defence_crush',
  magic: 'defence_magic',
  ranged: 'defence_ranged_standard'
};

// Default attack styles if weapon doesn't provide them
export const DEFAULT_ATTACK_STYLES: Record<string, Record<string, AttackStyleDefinition>> = {
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

interface AttackStyleSelectorProps {
  loadout: Record<string, Item | null>;
  combatStyle: string;
  bossForm?: BossForm | null;
  attackStyles: Record<string, AttackStyleDefinition>;
  availableAttackStyles: string[];
  selectedAttackStyle: string;
  onSelectAttackStyle: (style: string) => void;
}

export function AttackStyleSelector({
  loadout,
  combatStyle,
  bossForm,
  attackStyles,
  availableAttackStyles,
  selectedAttackStyle,
  onSelectAttackStyle
}: AttackStyleSelectorProps) {
  const { params, setParams } = useCalculatorStore();
  
  // Render melee-specific attack type selector
  const renderMeleeAttackTypeSelector = () => {
    if (combatStyle !== 'melee') return null;
    
    return (
      <>
        <div className="mb-1 text-sm text-muted-foreground">Attack Type:</div>
        <div className="flex gap-2 justify-center mb-2">
          {(['stab', 'slash', 'crush'] as const).map((type) => {
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

                  setParams({
                    attack_type: type,
                    melee_attack_bonus: bonus,
                    target_defence_type: ATTACK_TYPE_TO_DEFENCE_TYPE[type],
                    target_defence_bonus: defenceBonus
                  });
                }}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            );
          })}
        </div>
      </>
    );
  };

  return (
    <div className="p-3 text-center">
      {renderMeleeAttackTypeSelector()}

      <div className="mb-1 text-sm text-muted-foreground">
        {combatStyle === 'melee' 
          ? "Combat Style:" 
          : combatStyle === 'ranged' 
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
                    onClick={() => onSelectAttackStyle(style)}
                  >
                    {styleInfo.name}
                    {combatStyle !== 'melee' && ` (${styleInfo.attackType})`}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{styleInfo.description}</p>
                  {combatStyle === 'melee' && (
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
}