import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Item } from "@/types/calculator";
import { NpcForm } from "@/types/calculator";

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
  stab: "defence_stab",
  slash: "defence_slash",
  crush: "defence_crush",
  magic: "defence_magic",
  ranged: "defence_ranged_standard",
};

// Default attack styles if weapon doesn't provide them
export const DEFAULT_ATTACK_STYLES: Record<
  string,
  Record<string, AttackStyleDefinition>
> = {
  melee: {
    accurate: {
      name: "Accurate",
      attackType: "slash",
      bonus: { attack: 3, strength: 0, defence: 0 },
      description: "+3 Attack",
    },
    aggressive: {
      name: "Aggressive",
      attackType: "slash",
      bonus: { attack: 0, strength: 3, defence: 0 },
      description: "+3 Strength",
    },
    controlled: {
      name: "Controlled",
      attackType: "stab",
      bonus: { attack: 1, strength: 1, defence: 1 },
      description: "+1 to all",
    },
    defensive: {
      name: "Defensive",
      attackType: "slash",
      bonus: { attack: 0, strength: 0, defence: 3 },
      description: "+3 Defence",
    },
  },
  ranged: {
    accurate: {
      name: "Accurate",
      attackType: "ranged",
      bonus: { attack: 3, strength: 0, defence: 0 },
      description: "+3 Ranged",
    },
    rapid: {
      name: "Rapid",
      attackType: "ranged",
      bonus: { attack: 0, strength: 0, defence: 0 },
      description: "Faster attack speed",
    },
    longrange: {
      name: "Longrange",
      attackType: "ranged",
      bonus: { attack: 0, strength: 0, defence: 3 },
      description: "+3 Defence, increased range",
    },
  },
  magic: {
    standard: {
      name: "Standard",
      attackType: "magic",
      bonus: { attack: 0, strength: 0, defence: 0 },
      description: "Regular casting",
    },
    defensive: {
      name: "Defensive",
      attackType: "magic",
      bonus: { attack: 0, strength: 0, defence: 3 },
      description: "+3 Defence",
    },
  },
};

interface AttackStyleSelectorProps {
  loadout: Record<string, Item | null>;
  combatStyle: string;
  npcForm?: NpcForm | null;
  attackStyles: Record<string, AttackStyleDefinition>;
  availableAttackStyles: string[];
  selectedAttackStyle: string;
  onSelectAttackStyle: (style: string) => void;
}

export function AttackStyleSelector({
  loadout,
  combatStyle,
  npcForm,
  attackStyles,
  availableAttackStyles,
  selectedAttackStyle,
  onSelectAttackStyle,
}: AttackStyleSelectorProps) {
  return (
    <div className="p-3 text-center">
      <div className="mb-1 text-sm text-muted-foreground">
        {combatStyle === "melee"
          ? "Combat Style:"
          : combatStyle === "ranged"
            ? "Ranged Style:"
            : "Magic Style:"}
      </div>
      <Tabs
        value={selectedAttackStyle}
        onValueChange={onSelectAttackStyle}
        className="w-full"
      >
        <TabsList
          className={`grid ${availableAttackStyles.length === 2 ? "grid-cols-2" : availableAttackStyles.length === 3 ? "grid-cols-3" : "grid-cols-4"}`}
        >
          {availableAttackStyles.map((style) => {
            const styleInfo = attackStyles[style];
            if (!styleInfo) return null;

            return (
              <TooltipProvider key={style}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="contents">
                      <TabsTrigger
                        value={style}
                        onClick={() => onSelectAttackStyle(style)}
                        className="capitalize text-xs"
                      >
                        {styleInfo.name}
                        {combatStyle !== "melee" && ` (${styleInfo.attackType})`}
                      </TabsTrigger>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{styleInfo.description}</p>
                    {combatStyle === "melee" && (
                      <p className="text-xs">Attack type: {styleInfo.attackType}</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </TabsList>
      </Tabs>
    </div>
  );
}
