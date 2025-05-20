import { Item, BossForm, CombatStyle } from '@/app/types/calculator';

// Extended type for Boss weakness that includes monster types
type BossWeaknessType = CombatStyle | 'dragon' | 'demon' | 'kalphite' | 'undead' | null | undefined;

/**
 * Utility functions for checking target types and equipment effects
 */

// Target type checker functions
export function isTargetDraconic(target?: BossForm | null): boolean {
  if (!target) return false;
  
  // Check for specific boss ID (e.g., KBD)
  if (target.boss_id === 50) return true;
  
  // Check for weakness property - with proper type checking
  if (target.weakness && (target.weakness as BossWeaknessType) === "dragon") return true;
  
  // Check name contains dragon-related terms
  if (target.form_name) {
    const name = target.form_name.toLowerCase();
    return name.includes('dragon') || 
           name.includes('wyvern') || 
           name.includes('hydra') || 
           name.includes('vorkath');
  }
  
  return false;
}

export function isTargetDemonic(target?: BossForm | null): boolean {
  if (!target) return false;
  
  // Check for weakness property - with proper type checking
  if (target.weakness && (target.weakness as BossWeaknessType) === "demon") return true;
  
  // Check name contains demon-related terms
  if (target.form_name) {
    const name = target.form_name.toLowerCase();
    return name.includes('demon') || 
           name.includes('k\'ril') || 
           name.includes('skotizo') || 
           name.includes('abyssal');
  }
  
  return false;
}

export function isTargetKalphite(target?: BossForm | null): boolean {
  if (!target) return false;
  
  // Check for weakness property - with proper type checking
  if (target.weakness && (target.weakness as BossWeaknessType) === "kalphite") return true;
  
  // Check name contains kalphite-related terms
  if (target.form_name) {
    const name = target.form_name.toLowerCase();
    return name.includes('kalphite') || 
           name.includes('kq') || 
           name.includes('scarab');
  }
  
  return false;
}

export function isTargetTurothKurask(target?: BossForm | null): boolean {
  if (!target) return false;
  
  // Check name contains turoth/kurask
  if (target.form_name) {
    const name = target.form_name.toLowerCase();
    return name.includes('turoth') || name.includes('kurask');
  }
  
  return false;
}

export function isInWilderness(target?: BossForm | null): boolean {
  if (!target) return false;
  
  // Check name contains wilderness boss names
  if (target.form_name) {
    const name = target.form_name.toLowerCase();
    return name.includes('revenant') || 
           name.includes('callisto') || 
           name.includes('vet\'ion') || 
           name.includes('venenatis') || 
           name.includes('chaos ele');
  }
  
  return false;
}

export function isTargetUndead(target?: BossForm | null): boolean {
  if (!target) return false;
  
  // Check for weakness property - with proper type checking
  if (target.weakness && (target.weakness as BossWeaknessType) === "undead") return true;
  
  // Check name contains undead-related terms
  if (target.form_name) {
    const name = target.form_name.toLowerCase();
    return name.includes('skeleton') || 
           name.includes('zombie') || 
           name.includes('ghost') || 
           name.includes('revenant') || 
           name.includes('barrows');
  }
  
  return false;
}

// This function is intentionally a no-op for demonstration purposes
export function isOnSlayerTask(): boolean {
  // In a real implementation, this would check against the player's current slayer task
  return false;
}

// Equipment checker functions
export function hasObsidianWeapon(equipment: Record<string, Item | null>): boolean {
  const weapons = ['mainhand', '2h'];
  for (const slot of weapons) {
    const item = equipment[slot];
    if (item && item.name) {
      const name = item.name.toLowerCase();
      if (name.includes('tzhaar-ket-') || 
          name.includes('toktz-xil') ||
          name.includes('tzhaar-ket-om') ||
          name.includes('tzhaar-ket-em')) {
        return true;
      }
    }
  }
  return false;
}

export function hasVoidKnightSet(equipment: Record<string, Item | null>): boolean {
  let pieces = 0;
  
  if (equipment['body'] && equipment['body'].name && 
      equipment['body'].name.toLowerCase().includes('void knight')) {
    pieces++;
  }
  
  if (equipment['legs'] && equipment['legs'].name && 
      equipment['legs'].name.toLowerCase().includes('void knight')) {
    pieces++;
  }
  
  if (equipment['hands'] && equipment['hands'].name && 
      equipment['hands'].name.toLowerCase().includes('void knight')) {
    pieces++;
  }
  
  return pieces >= 3; // Full set requires top, bottom, and gloves
}

export function hasEliteVoidKnightSet(equipment: Record<string, Item | null>): boolean {
  const hasEliteTop = !!(equipment['body'] && equipment['body'].name && 
                    equipment['body'].name.toLowerCase().includes('elite void'));
  
  return hasEliteTop && hasVoidKnightSet(equipment);
}

export function hasVoidMeleeHelm(equipment: Record<string, Item | null>): boolean {
  return !!(equipment['head'] && equipment['head'].name && 
         equipment['head'].name.toLowerCase().includes('void melee helm'));
}

export function hasVoidRangeHelm(equipment: Record<string, Item | null>): boolean {
  return !!(equipment['head'] && equipment['head'].name && 
         equipment['head'].name.toLowerCase().includes('void ranger helm'));
}

export function hasVoidMageHelm(equipment: Record<string, Item | null>): boolean {
  return !!(equipment['head'] && equipment['head'].name && 
         equipment['head'].name.toLowerCase().includes('void mage helm'));
}

export function countInquisitorPieces(equipment: Record<string, Item | null>): number {
  let count = 0;
  
  if (equipment['head'] && equipment['head'].name && 
      equipment['head'].name.toLowerCase().includes('inquisitor')) {
    count++;
  }
  
  if (equipment['body'] && equipment['body'].name && 
      equipment['body'].name.toLowerCase().includes('inquisitor')) {
    count++;
  }
  
  if (equipment['legs'] && equipment['legs'].name && 
      equipment['legs'].name.toLowerCase().includes('inquisitor')) {
    count++;
  }
  
  return count;
}

export function hasInquisitorsMace(equipment: Record<string, Item | null>): boolean {
  return !!(equipment['mainhand'] && equipment['mainhand'].name && 
          equipment['mainhand'].name.toLowerCase().includes('inquisitor\'s mace')) ||
         !!(equipment['2h'] && equipment['2h'].name && 
          equipment['2h'].name.toLowerCase().includes('inquisitor\'s mace'));
}

export function countVirtusPieces(equipment: Record<string, Item | null>): number {
  let count = 0;
  
  if (equipment['head'] && equipment['head'].name && 
      equipment['head'].name.toLowerCase().includes('virtus mask')) {
    count++;
  }
  
  if (equipment['body'] && equipment['body'].name && 
      equipment['body'].name.toLowerCase().includes('virtus')) {
    count++;
  }
  
  if (equipment['legs'] && equipment['legs'].name && 
      equipment['legs'].name.toLowerCase().includes('virtus')) {
    count++;
  }
  
  return count;
}

export function hasObsidianArmorSet(equipment: Record<string, Item | null>): boolean {
  const hasPlate = !!(equipment['body'] && equipment['body'].name && 
                equipment['body'].name.toLowerCase().includes('obsidian'));
  
  const hasLegs = !!(equipment['legs'] && equipment['legs'].name && 
                equipment['legs'].name.toLowerCase().includes('obsidian'));
  
  const hasHelm = !!(equipment['head'] && equipment['head'].name && 
                equipment['head'].name.toLowerCase().includes('obsidian'));
  
  return hasPlate && hasLegs && hasHelm;
}

export function countCrystalArmorPieces(equipment: Record<string, Item | null>): number {
  let count = 0;
  
  if (hasCrystalHelm(equipment)) count++;
  if (hasCrystalBody(equipment)) count++;
  if (hasCrystalLegs(equipment)) count++;
  
  return count;
}

export function hasCrystalHelm(equipment: Record<string, Item | null>): boolean {
  return !!(equipment['head'] && equipment['head'].name && 
         equipment['head'].name.toLowerCase().includes('crystal helm'));
}

export function hasCrystalBody(equipment: Record<string, Item | null>): boolean {
  return !!(equipment['body'] && equipment['body'].name && 
         equipment['body'].name.toLowerCase().includes('crystal body'));
}

export function hasCrystalLegs(equipment: Record<string, Item | null>): boolean {
  return !!(equipment['legs'] && equipment['legs'].name && 
         equipment['legs'].name.toLowerCase().includes('crystal legs'));
}

export function hasCrystalRangedWeapon(equipment: Record<string, Item | null>): boolean {
  return !!(equipment['mainhand'] && equipment['mainhand'].name && 
          (equipment['mainhand'].name.toLowerCase().includes('crystal bow') || 
           equipment['mainhand'].name.toLowerCase().includes('bow of faerdhinen'))) ||
         !!(equipment['2h'] && equipment['2h'].name && 
          (equipment['2h'].name.toLowerCase().includes('crystal bow') || 
           equipment['2h'].name.toLowerCase().includes('bow of faerdhinen')));
}