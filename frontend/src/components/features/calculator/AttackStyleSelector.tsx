import {
  Button
} from '@/components/ui/button';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from '@/components/ui/tooltip';
import { Item } from '@/types/calculator';
import { BossForm } from '@/types/calculator';

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


  return (
    <div className="p-3 text-center">
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
                    className={style === selectedAttackStyle ? 'ring-2 ring-primary' : ''}
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