import { CalculatorParams, Item, BossForm } from '@/types/calculator';
import {
  isTargetDraconic,
  isTargetDemonic,
  isTargetKalphite,
  isTargetTurothKurask,
  isInWilderness,
  isTargetUndead,
  isOnSlayerTask,
  hasObsidianWeapon,
  hasVoidKnightSet,
  hasEliteVoidKnightSet,
  hasVoidMeleeHelm,
  hasVoidRangeHelm,
  hasVoidMageHelm,
  countInquisitorPieces,
  hasInquisitorsMace,
  countVirtusPieces,
  hasObsidianArmorSet,
  countCrystalArmorPieces,
  hasCrystalHelm,
  hasCrystalBody,
  hasCrystalLegs,
  hasCrystalRangedWeapon
} from '@/utils/passiveEffectsUtils';

// Define types for passive effect bonuses
interface PassiveEffectBonus {
  accuracy?: number; // Multiplier (1.0 = no change, 1.2 = 20% increase)
  damage?: number;   // Multiplier
  maxHit?: number;   // Flat addition to max hit
  isApplicable: boolean; // Whether this effect applies in the current situation
}

const effects: Array<{ name: string; description: string }> = [];

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
  const equippedItems = Object.entries(equipment)
    .filter(([slot, item]) => slot !== 'spec' && item !== null)
    .map(([, item]) => item as Item);
  
  // Process each item for passive effects
  equippedItems.forEach(item => {
    const itemName = item.name.toLowerCase();
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEBUG] Checking item:', itemName);
      console.log('[DEBUG] Target form:', target?.form_name);
    }
    
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
    if ((itemName.includes('slayer helmet (i)') || itemName.includes('black mask (i)')) && isOnSlayerTask()) {
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
              isOnSlayerTask() && 
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
    
    // Scythe of Vitur multi-hit effect based on target size
    if (itemName.includes('scythe of vitur') && target?.size) {
      // 1x1 = 1 hit, 2x2 = 2 hits, 3x3+ = 3 hits
      const hits = target.size >= 3 ? 3 : target.size >= 2 ? 2 : 1;

      if (hits > 1) {
        bonus.isApplicable = true;

        // 1 hit = 100%, 2 hits = 150%, 3 hits = 175%
        const multiplier = hits === 2 ? 1.5 : 1.75;
        bonus.damage = (bonus.damage || 1.0) * multiplier;

        effects.push({
          name: 'Scythe of Vitur',
          description: `Multi-hit weapon: Hits ${hits} times against ${target.size}x${target.size} targets`
        });
      }
    }
    
    // Berserker necklace with obsidian weapons
    if (itemName.includes('berserker necklace') && hasObsidianWeapon(equipment) && combatStyle === 'melee') {
      bonus.isApplicable = true;
      
      // 20% damage boost
      bonus.damage = (bonus.damage || 1.0) * 1.2;
    }
  });
  
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
  
  // Use type guard to safely check attack_type
  interface WithAttackType {
    attack_type: string;
  }
  
  function hasAttackType(obj: unknown): obj is WithAttackType {
    return obj !== null && 
           typeof obj === 'object' && 
           'attack_type' in obj && 
           typeof (obj as WithAttackType).attack_type === 'string';
  }
  
  const usingCrushStyle = params.combat_style === 'melee' && 
                         hasAttackType(params) && params.attack_type === 'crush';
  
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
  
  // Use type guard to safely check spellbook
  interface WithSpellbook {
    spellbook: string;
  }
  
  function hasSpellbook(obj: unknown): obj is WithSpellbook {
    return obj !== null && 
           typeof obj === 'object' && 
           'spellbook' in obj && 
           typeof (obj as WithSpellbook).spellbook === 'string';
  }
  
  const usingAncientMagicks = combatStyle === 'magic' && 
                             hasSpellbook(params) && params.spellbook === 'ancient';
  
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
  
  return bonus;
}

export default calculatePassiveEffectBonuses;