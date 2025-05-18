import { CalculatorParams, Item, Boss, BossForm } from '@/app/types/calculator';

// Define types for passive effect bonuses
interface PassiveEffectBonus {
  accuracy?: number; // Multiplier (1.0 = no change, 1.2 = 20% increase)
  damage?: number;   // Multiplier
  maxHit?: number;   // Flat addition to max hit
  isApplicable: boolean; // Whether this effect applies in the current situation
}

/**
 * Calculate passive effect bonuses based on equipped items and target
 */
export function calculatePassiveEffectBonuses(
  params: CalculatorParams,
  equipment: Record<string, Item | null>,
  target?: BossForm | null
): PassiveEffectBonus {
  // Default bonus (no change)
  const bonus: PassiveEffectBonus = {
    accuracy: 1.0,
    damage: 1.0,
    maxHit: 0,
    isApplicable: false
  };
  
  // If no equipment or target, return default
  if (!equipment || Object.keys(equipment).length === 0) {
    return bonus;
  }
  
  // Get combat style
  const combatStyle = params.combat_style;
  
  // Check for equipped items
  const equippedItems = Object.values(equipment).filter(item => item !== null) as Item[];
  
  // Process each item for passive effects
  equippedItems.forEach(item => {
    const itemName = item.name.toLowerCase();
    console.log('[DEBUG] Checking item:', itemName);
    console.log('[DEBUG] Target form:', target?.form_name);
    console.log('[DEBUG] Target weakness:', target?.weakness);
    console.log('[DEBUG] isTargetDemonic:', isTargetDemonic(target));
    
    // === WEAPONS ===
    
    // Dragon hunter weapons vs dragons
    if (itemName.includes('dragon hunter') && isTargetDraconic(target)) {
      bonus.isApplicable = true;
      
      if (itemName.includes('crossbow')) {
        bonus.accuracy = (bonus.accuracy || 1.0) * 1.3;  // 30% accuracy bonus
        bonus.damage = (bonus.damage || 1.0) * 1.25;     // 25% damage bonus
      } else if (itemName.includes('lance')) {
        bonus.accuracy = (bonus.accuracy || 1.0) * 1.2;  // 20% accuracy bonus
        bonus.damage = (bonus.damage || 1.0) * 1.2;      // 20% damage bonus
      } else if (itemName.includes('wand')) {
        bonus.accuracy = (bonus.accuracy || 1.0) * 1.5;  // 50% accuracy bonus
        bonus.damage = (bonus.damage || 1.0) * 1.2;      // 20% damage bonus
      }
    }
    
    // Twisted bow vs high magic targets
    if (itemName.includes('twisted bow') && target?.magic_level) {
      bonus.isApplicable = true;
      
      // Calculate Twisted Bow scaling based on target's magic level
      const magicLevel = target.magic_level;
      
      // Cap magic level at 250 for calculations
      const cappedMagicLevel = Math.min(magicLevel, 250);
      
      // Calculate twisted bow accuracy and damage scaling 
      // Formulas based on wiki data
      let accuracyMultiplier = 140 + ((3 * cappedMagicLevel - 10) / 100) - (Math.pow(3 * cappedMagicLevel / 10 - 100, 2) / 100);
      let damageMultiplier = 250 + ((3 * cappedMagicLevel - 14) / 100) - (Math.pow(3 * cappedMagicLevel / 10 - 140, 2) / 100);
      
      // Cap multipliers
      accuracyMultiplier = Math.max(Math.min(accuracyMultiplier, 140), 0) / 100;
      damageMultiplier = Math.max(Math.min(damageMultiplier, 250), 0) / 100;
      
      // Apply multipliers
      bonus.accuracy = (bonus.accuracy || 1.0) * (1 + accuracyMultiplier);
      bonus.damage = (bonus.damage || 1.0) * (1 + damageMultiplier);
    }
    
    // Tumeken's shadow
    if (itemName.includes('tumeken\'s shadow') && combatStyle === 'magic') {
      bonus.isApplicable = true;
      
      // Triples magic stats from equipment
      if (params.combat_style === 'magic') {
        bonus.accuracy = (bonus.accuracy || 1.0) * 3;
        bonus.damage = (bonus.damage || 1.0) * 3;
      }
    }

    // Demon bane weapons vs demons
    if ((itemName.includes('arclight') || itemName.includes('emberlight')) && isTargetDemonic(target)) {
      bonus.isApplicable = true;
      
      // 70% accuracy and damage boost against demons
      bonus.accuracy = (bonus.accuracy || 1.0) * 1.7;
      bonus.damage = (bonus.damage || 1.0) * 1.7;
    } else if ((itemName.includes('silverlight') || itemName.includes('darklight')) && isTargetDemonic(target)) {
      bonus.isApplicable = true;
      
      // 60% damage boost against demons
      bonus.damage = (bonus.damage || 1.0) * 1.6;
    } else if (itemName.includes('scorching bow') && isTargetDemonic(target)) {
      bonus.isApplicable = true;
      
      // 30% accuracy and damage boost against demons
      bonus.accuracy = (bonus.accuracy || 1.0) * 1.3;
      bonus.damage = (bonus.damage || 1.0) * 1.3;
    }
    
    // Keris weapons vs kalphites/scarabs
    if (itemName.includes('keris') && isTargetKalphite(target)) {
      bonus.isApplicable = true;
      
      // 33% damage boost against kalphites
      bonus.damage = (bonus.damage || 1.0) * 1.33;
      
      // Keris partisan of breaching has additional 33% accuracy
      if (itemName.includes('keris partisan of breaching')) {
        bonus.accuracy = (bonus.accuracy || 1.0) * 1.33;
      }
      
      // Note: The triple damage chance (1/51) is not included here since it's a per-hit effect
    }
    
    // Leaf-bladed battleaxe vs Turoths/Kurasks
    if (itemName.includes('leaf-bladed battleaxe') && isTargetTurothKurask(target)) {
      bonus.isApplicable = true;
      
      // 17.5% damage boost
      bonus.damage = (bonus.damage || 1.0) * 1.175;
    }
    
    // Wilderness weapons in wilderness
    if ((itemName.includes('craw\'s bow') || 
         itemName.includes('thammaron\'s sceptre') || 
         itemName.includes('viggora\'s chainmace') ||
         itemName.includes('webweaver bow') ||
         itemName.includes('ursine chainmace') ||
         itemName.includes('accursed sceptre')) && 
        isInWilderness(target)) {
      bonus.isApplicable = true;
      
      // 50% accuracy and damage boost
      bonus.accuracy = (bonus.accuracy || 1.0) * 1.5;
      bonus.damage = (bonus.damage || 1.0) * 1.5;
    }
    
    // === ARMOR AND JEWELRY ===
    
    // Slayer helmet/Black mask on task
    if ((itemName.includes('slayer helmet (i)') || itemName.includes('black mask (i)')) && isOnSlayerTask(target)) {
      bonus.isApplicable = true;
      
      // Apply bonuses based on combat style
      if (combatStyle === 'melee') {
        bonus.accuracy = (bonus.accuracy || 1.0) * 1.1667; // 16.67% accuracy boost
        bonus.damage = (bonus.damage || 1.0) * 1.1667;     // 16.67% damage boost
      } else if (combatStyle === 'ranged' || combatStyle === 'magic') {
        bonus.accuracy = (bonus.accuracy || 1.0) * 1.15;   // 15% accuracy boost
        bonus.damage = (bonus.damage || 1.0) * 1.15;       // 15% damage boost
      }
    } else if ((itemName.includes('slayer helmet') || itemName.includes('black mask')) && 
              !itemName.includes('(i)') && 
              isOnSlayerTask(target) && 
              combatStyle === 'melee') {
      bonus.isApplicable = true;
      
      // Non-imbued only provides melee bonuses
      bonus.accuracy = (bonus.accuracy || 1.0) * 1.1667;   // 16.67% accuracy boost
      bonus.damage = (bonus.damage || 1.0) * 1.1667;       // 16.67% damage boost
    }
    
    // Salve amulet vs undead
    if (itemName.includes('salve amulet') && isTargetUndead(target)) {
      bonus.isApplicable = true;
      
      // Handle different versions of salve amulet
      if (itemName.includes('salve amulet(ei)')) {
        // All styles get 20% boost
        bonus.accuracy = (bonus.accuracy || 1.0) * 1.2;
        bonus.damage = (bonus.damage || 1.0) * 1.2;
      } else if (itemName.includes('salve amulet (e)') && combatStyle === 'melee') {
        // Only melee gets 20% boost
        bonus.accuracy = (bonus.accuracy || 1.0) * 1.2;
        bonus.damage = (bonus.damage || 1.0) * 1.2;
      } else if (itemName.includes('salve amulet (i)')) {
        // Melee gets 16.67%, range/magic gets 15%
        if (combatStyle === 'melee') {
          bonus.accuracy = (bonus.accuracy || 1.0) * 1.1667;
          bonus.damage = (bonus.damage || 1.0) * 1.1667;
        } else {
          bonus.accuracy = (bonus.accuracy || 1.0) * 1.15;
          bonus.damage = (bonus.damage || 1.0) * 1.15;
        }
      } else if (combatStyle === 'melee') {
        // Base salve only affects melee
        bonus.accuracy = (bonus.accuracy || 1.0) * 1.1667;
        bonus.damage = (bonus.damage || 1.0) * 1.1667;
      }
    }
    
    // Berserker necklace with obsidian weapons
    if (itemName.includes('berserker necklace') && hasObsidianWeapon(equipment) && combatStyle === 'melee') {
      bonus.isApplicable = true;
      
      // 20% damage boost
      bonus.damage = (bonus.damage || 1.0) * 1.2;
    }
    
    // Dizana's quiver with ranged
    if ((itemName.includes('dizana\'s quiver') || itemName.includes('blessed dizana\'s quiver')) && 
        combatStyle === 'ranged') {
      bonus.isApplicable = true;
      
      // Add +1 to ranged strength, this is done in max hit calculation
      bonus.maxHit = (bonus.maxHit || 0) + 1;
      // +10 accuracy is added directly to the ranged attack bonus in equipment bonuses
    }
    
    // === SET EFFECTS ===
    
    // Void Knight set effects
    const hasVoidSet = hasVoidKnightSet(equipment);
    const hasEliteVoidSet = hasEliteVoidKnightSet(equipment);
    
    if (hasVoidSet || hasEliteVoidSet) {
      if (combatStyle === 'melee' && hasVoidMeleeHelm(equipment)) {
        bonus.isApplicable = true;
        
        // 10% accuracy and strength
        bonus.accuracy = (bonus.accuracy || 1.0) * 1.1;
        bonus.damage = (bonus.damage || 1.0) * 1.1;
      } else if (combatStyle === 'ranged' && hasVoidRangeHelm(equipment)) {
        bonus.isApplicable = true;
        
        // 10% accuracy and strength
        bonus.accuracy = (bonus.accuracy || 1.0) * 1.1;
        bonus.damage = (bonus.damage || 1.0) * 1.1;
      } else if (combatStyle === 'magic' && hasVoidMageHelm(equipment)) {
        bonus.isApplicable = true;
        
        // 45% accuracy
        bonus.accuracy = (bonus.accuracy || 1.0) * 1.45;
        
        // Elite gives 2.5% damage
        if (hasEliteVoidSet) {
          bonus.damage = (bonus.damage || 1.0) * 1.025;
        }
      }
    }
    
    // Inquisitor's set with crush weapons
    const inquisitorPieces = countInquisitorPieces(equipment);
    const usingCrushStyle = params.combat_style === 'melee' && 
                           (params as any).attack_type === 'crush';
    
    if (inquisitorPieces > 0 && usingCrushStyle) {
      bonus.isApplicable = true;
      
      // 0.5% per piece plus 1.0% set bonus if all 3 pieces
      const pieceBonus = 0.005 * inquisitorPieces;
      const setBonus = (inquisitorPieces === 3) ? 0.01 : 0;
      const totalBonus = pieceBonus + setBonus;
      
      bonus.accuracy = (bonus.accuracy || 1.0) * (1 + totalBonus);
      bonus.damage = (bonus.damage || 1.0) * (1 + totalBonus);
      
      // Special interaction with Inquisitor's mace
      if (hasInquisitorsMace(equipment)) {
        // 2.5% per piece instead of 0.5%, but no set bonus
        const maceBonus = 0.025 * inquisitorPieces;
        
        // Replace previous calculation
        bonus.accuracy = (bonus.accuracy || 1.0) / (1 + totalBonus) * (1 + maceBonus);
        bonus.damage = (bonus.damage || 1.0) / (1 + totalBonus) * (1 + maceBonus);
      }
    }
    
    // Virtus set with Ancient Magicks
    const virtusPieces = countVirtusPieces(equipment);
    const usingAncientMagicks = combatStyle === 'magic' && 
                               (params as any).spellbook === 'ancient';
    
    if (virtusPieces > 0 && usingAncientMagicks) {
      bonus.isApplicable = true;
      
      // 3% per piece to Ancient Magicks damage
      const virtusBonus = 0.03 * virtusPieces;
      bonus.damage = (bonus.damage || 1.0) * (1 + virtusBonus);
    }
    
    // Obsidian armor with obsidian weapons
    const hasObsidianArmor = hasObsidianArmorSet(equipment);
    
    if (hasObsidianArmor && hasObsidianWeapon(equipment) && combatStyle === 'melee') {
      bonus.isApplicable = true;
      
      // 10% accuracy and damage
      bonus.accuracy = (bonus.accuracy || 1.0) * 1.1;
      bonus.damage = (bonus.damage || 1.0) * 1.1;
    }
    
    // Crystal armor with crystal bow/Bow of faerdhinen
    const crystalPieces = countCrystalArmorPieces(equipment);
    const hasCrystalBow = hasCrystalRangedWeapon(equipment);
    
    if (crystalPieces > 0 && hasCrystalBow && combatStyle === 'ranged') {
      bonus.isApplicable = true;
      
      let damageBonus = 0;
      let accuracyBonus = 0;
      
      // Apply bonuses based on worn pieces
      if (hasCrystalHelm(equipment)) {
        damageBonus += 0.025;
        accuracyBonus += 0.05;
      }
      
      if (hasCrystalBody(equipment)) {
        damageBonus += 0.075;
        accuracyBonus += 0.15;
      }
      
      if (hasCrystalLegs(equipment)) {
        damageBonus += 0.05;
        accuracyBonus += 0.1;
      }
      
      bonus.accuracy = (bonus.accuracy || 1.0) * (1 + accuracyBonus);
      bonus.damage = (bonus.damage || 1.0) * (1 + damageBonus);
    }
  });
  
  return bonus;
}

// Helper functions for checking target types
function isTargetDraconic(target?: BossForm | null): boolean {
  // Simplified - in a real implementation, would check against a database of draconic NPCs
  return !!target && 
    (target.boss_id === 50 || // Assuming 50 is KBD
     (target.weakness === 'dragon' || 
      (target.form_name && 
       (target.form_name.toLowerCase().includes('dragon') || 
        target.form_name.toLowerCase().includes('wyvern') || 
        target.form_name.toLowerCase().includes('hydra') || 
        target.form_name.toLowerCase().includes('vorkath')))));
}

function isTargetDemonic(target?: BossForm | null): boolean {
  // Simplified - in a real implementation, would check against a database of demonic NPCs
  return !!target && 
    (target.weakness === 'demon' || 
     (target.form_name && 
      (target.form_name.toLowerCase().includes('demon') || 
       target.form_name.toLowerCase().includes('k\'ril') || 
       target.form_name.toLowerCase().includes('skotizo') || 
       target.form_name.toLowerCase().includes('abyssal'))));
}

function isTargetKalphite(target?: BossForm | null): boolean {
  // Simplified for kalphites
  return !!target && 
    (target.weakness === 'kalphite' || 
     (target.form_name && 
      (target.form_name.toLowerCase().includes('kalphite') || 
       target.form_name.toLowerCase().includes('kq') || 
       target.form_name.toLowerCase().includes('scarab'))));
}

function isTargetTurothKurask(target?: BossForm | null): boolean {
  // Simplified
  return !!target && 
    (target.form_name && 
     (target.form_name.toLowerCase().includes('turoth') || 
      target.form_name.toLowerCase().includes('kurask')));
}

function isInWilderness(target?: BossForm | null): boolean {
  // Simplified - would normally check if the boss is in the wilderness
  return !!target && 
    (target.form_name && 
     (target.form_name.toLowerCase().includes('revenant') || 
      target.form_name.toLowerCase().includes('callisto') || 
      target.form_name.toLowerCase().includes('vet\'ion') || 
      target.form_name.toLowerCase().includes('venenatis') || 
      target.form_name.toLowerCase().includes('chaos ele')));
}

function isTargetUndead(target?: BossForm | null): boolean {
  // Simplified
  return !!target && 
    (target.weakness === 'undead' || 
     (target.form_name && 
      (target.form_name.toLowerCase().includes('skeleton') || 
       target.form_name.toLowerCase().includes('zombie') || 
       target.form_name.toLowerCase().includes('ghost') || 
       target.form_name.toLowerCase().includes('revenant') || 
       target.form_name.toLowerCase().includes('barrows'))));
}

function isOnSlayerTask(target?: BossForm | null): boolean {
  // This would normally check against the player's current slayer task
  // For this implementation, we'll just return false
  return false;
}

// Helper functions for checking equipped items
function hasObsidianWeapon(equipment: Record<string, Item | null>): boolean {
  const weapons = ['mainhand', '2h'];
  for (const slot of weapons) {
    const item = equipment[slot];
    if (item && item.name && (
      item.name.toLowerCase().includes('tzhaar-ket-') || 
      item.name.toLowerCase().includes('toktz-xil') ||
      item.name.toLowerCase().includes('tzhaar-ket-om') ||
      item.name.toLowerCase().includes('tzhaar-ket-em')
    )) {
      return true;
    }
  }
  return false;
}

function hasVoidKnightSet(equipment: Record<string, Item | null>): boolean {
  // Check for void knight gear (non-elite)
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

function hasEliteVoidKnightSet(equipment: Record<string, Item | null>): boolean {
  // Check for elite void knight gear
  let hasEliteTop = equipment['body'] && equipment['body'].name && 
                    equipment['body'].name.toLowerCase().includes('elite void');
  
  // Must have void gloves, legs and elite top
  return hasEliteTop && hasVoidKnightSet(equipment);
}

function hasVoidMeleeHelm(equipment: Record<string, Item | null>): boolean {
  return equipment['head'] && equipment['head'].name && 
         equipment['head'].name.toLowerCase().includes('void melee helm');
}

function hasVoidRangeHelm(equipment: Record<string, Item | null>): boolean {
  return equipment['head'] && equipment['head'].name && 
         equipment['head'].name.toLowerCase().includes('void ranger helm');
}

function hasVoidMageHelm(equipment: Record<string, Item | null>): boolean {
  return equipment['head'] && equipment['head'].name && 
         equipment['head'].name.toLowerCase().includes('void mage helm');
}

function countInquisitorPieces(equipment: Record<string, Item | null>): number {
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

function hasInquisitorsMace(equipment: Record<string, Item | null>): boolean {
  return (equipment['mainhand'] && equipment['mainhand'].name && 
          equipment['mainhand'].name.toLowerCase().includes('inquisitor\'s mace')) ||
         (equipment['2h'] && equipment['2h'].name && 
          equipment['2h'].name.toLowerCase().includes('inquisitor\'s mace'));
}

function countVirtusPieces(equipment: Record<string, Item | null>): number {
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

function hasObsidianArmorSet(equipment: Record<string, Item | null>): boolean {
  // Check for obsidian armor set
  let hasPlate = equipment['body'] && equipment['body'].name && 
                 equipment['body'].name.toLowerCase().includes('obsidian');
  
  let hasLegs = equipment['legs'] && equipment['legs'].name && 
                equipment['legs'].name.toLowerCase().includes('obsidian');
  
  let hasHelm = equipment['head'] && equipment['head'].name && 
                equipment['head'].name.toLowerCase().includes('obsidian');
  
  return hasPlate && hasLegs && hasHelm;
}

function countCrystalArmorPieces(equipment: Record<string, Item | null>): number {
  let count = 0;
  
  if (hasCrystalHelm(equipment)) count++;
  if (hasCrystalBody(equipment)) count++;
  if (hasCrystalLegs(equipment)) count++;
  
  return count;
}

function hasCrystalHelm(equipment: Record<string, Item | null>): boolean {
  return equipment['head'] && equipment['head'].name && 
         equipment['head'].name.toLowerCase().includes('crystal helm');
}

function hasCrystalBody(equipment: Record<string, Item | null>): boolean {
  return equipment['body'] && equipment['body'].name && 
         equipment['body'].name.toLowerCase().includes('crystal body');
}

function hasCrystalLegs(equipment: Record<string, Item | null>): boolean {
  return equipment['legs'] && equipment['legs'].name && 
         equipment['legs'].name.toLowerCase().includes('crystal legs');
}

function hasCrystalRangedWeapon(equipment: Record<string, Item | null>): boolean {
  return (equipment['mainhand'] && equipment['mainhand'].name && 
          (equipment['mainhand'].name.toLowerCase().includes('crystal bow') || 
           equipment['mainhand'].name.toLowerCase().includes('bow of faerdhinen'))) ||
         (equipment['2h'] && equipment['2h'].name && 
          (equipment['2h'].name.toLowerCase().includes('crystal bow') || 
           equipment['2h'].name.toLowerCase().includes('bow of faerdhinen')));
}

export default calculatePassiveEffectBonuses;