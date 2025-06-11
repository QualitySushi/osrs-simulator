import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useCalculatorStore } from '@/store/calculator-store';
import { Item, NpcForm } from '@/types/calculator';
import { safeFixed } from '@/utils/format';
import calculatePassiveEffectBonuses from './PassiveEffectCalculator';
import { Badge } from '@/components/ui/badge';
import {
  isTargetDraconic,
  isTargetDemonic,
  isTargetKalphite,
  isInWilderness,
  isTargetUndead,
  isOnSlayerTask,
  hasVoidKnightSet,
  hasEliteVoidKnightSet,
  hasVoidMeleeHelm,
  hasVoidRangeHelm,
  hasVoidMageHelm,
  countInquisitorPieces,
  hasObsidianWeapon,
  hasObsidianArmorSet,
  countCrystalArmorPieces,
  hasCrystalHelm,
  hasCrystalBody,
  hasCrystalLegs,
  hasCrystalRangedWeapon
} from '@/utils/passiveEffectsUtils';

interface PassiveEffectsDisplayProps {
  loadout: Record<string, Item | null>;
  target?: NpcForm | null;
}

export function PassiveEffectsDisplay({ loadout, target }: PassiveEffectsDisplayProps) {
  const { params } = useCalculatorStore();
  const [activeEffects, setActiveEffects] = useState<Array<{name: string, description: string}>>([]);
  
  useEffect(() => {
    // Define known items with passive effects
    const KNOWN_PASSIVE_ITEMS = [
      'twisted bow',
      'dragon hunter',
      'tumeken',
      'scythe of vitur',
      'arclight',
      'emberlight',
      'keris',
      'salve amulet',
      'berserker necklace'
    ];

    // Get equipped items with passive effects - enhanced detection
    const itemsWithPassiveEffects = Object.entries(loadout)
      .filter(([slot, item]) => {
        if (slot === 'spec') return false;
        if (!item) return false;

        // Check database flag OR known item names
        return item.has_passive_effect ||
              KNOWN_PASSIVE_ITEMS.some(keyword =>
                item.name.toLowerCase().includes(keyword)
              );
      })
      .map(([, item]) => item) as Item[];
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEBUG] Items with passive effects:', itemsWithPassiveEffects);
    }
    
    // If no items with passive effects (after enhanced detection), return empty
    if (itemsWithPassiveEffects.length === 0) {
      setActiveEffects([]);
      return;
    }
    
    // Calculate the passive effect bonuses
    const bonuses = calculatePassiveEffectBonuses(params, loadout, target);
    
    // If no applicable effects, don't show anything
    if (!bonuses.isApplicable) {
      setActiveEffects([]);
      return;
    }
    
    // Format bonus values for display
    const formattedAccuracy = ((bonuses.accuracy || 1.0) - 1.0) * 100;
    const formattedDamage = ((bonuses.damage || 1.0) - 1.0) * 100;
    
    // Build the list of active effects
    const effects: Array<{name: string, description: string}> = [];
    
    // Add overall bonus
    if (formattedAccuracy !== 0 || formattedDamage !== 0 || (bonuses.maxHit || 0) > 0) {
      const parts: string[] = [];
      
      if (formattedAccuracy !== 0) {
        parts.push(`+${safeFixed(formattedAccuracy, 1)}% accuracy`);
      }
      
      if (formattedDamage !== 0) {
        parts.push(`+${safeFixed(formattedDamage, 1)}% damage`);
      }
      
      if ((bonuses.maxHit || 0) > 0) {
        parts.push(`+${bonuses.maxHit} max hit`);
      }
      
      effects.push({
        name: 'Combined Passive Effects',
        description: parts.join(', ')
      });
    }
    
    // Check for specific items and add their effects
    itemsWithPassiveEffects.forEach(item => {
      const itemName = item.name.toLowerCase();

      if (itemName.includes('twisted bow')) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('[DEBUG] Found Twisted Bow, target magic level:', target?.magic_level);
        }
        
        if (target?.magic_level) {
          effects.push({
            name: 'Twisted Bow Scaling',
            description: `Scaling against target with ${target.magic_level} Magic level`
          });
        } else {
          if (process.env.NODE_ENV !== 'production') {
            console.log('[DEBUG] Target has no magic level, Twisted Bow effect not applicable');
          }
        }
      }
      
      // Scythe of Vitur passive effect based on target size
      if (itemName.includes('scythe of vitur') && target?.size) {
        const hits = target.size >= 3 ? 3 : target.size >= 2 ? 2 : 1;
        if (hits > 1) {
          effects.push({
            name: 'Scythe of Vitur',
            description: `Multi-hit: ${hits} hits against ${target.size}x${target.size} targets`
          });
        }
      }
      
      if (itemName.includes('dragon hunter') && isTargetDraconic(target)) {
        if (itemName.includes('crossbow')) {
          effects.push({
            name: 'Dragon Hunter Crossbow',
            description: 'Bonus against dragons: +30% accuracy, +25% damage'
          });
        } else if (itemName.includes('lance')) {
          effects.push({
            name: 'Dragon Hunter Lance',
            description: 'Bonus against dragons: +20% accuracy and damage'
          });
        } else if (itemName.includes('wand')) {
          effects.push({
            name: 'Dragon Hunter Wand',
            description: 'Bonus against dragons: +50% accuracy, +20% damage'
          });
        }
      }
      
      if ((itemName.includes('arclight') || itemName.includes('emberlight')) && isTargetDemonic(target)) {
        effects.push({
          name: 'Demonbane Weapon',
          description: 'Bonus against demons: +70% accuracy and damage'
        });
      } else if ((itemName.includes('silverlight') || itemName.includes('darklight')) && isTargetDemonic(target)) {
        effects.push({
          name: 'Demonbane Weapon',
          description: 'Bonus against demons: +60% damage'
        });
      }
      
      if (itemName.includes('keris') && isTargetKalphite(target)) {
        effects.push({
          name: 'Keris Effect',
          description: 'Bonus against kalphites: +33% damage, 1/51 chance for triple damage'
        });
      }
      
      if (itemName.includes('salve amulet') && isTargetUndead(target)) {
        effects.push({
          name: 'Salve Amulet',
          description: 'Bonus against undead targets'
        });
      }
      
      if (itemName.includes('slayer helmet') && isOnSlayerTask()) {
        effects.push({
          name: 'On Slayer Task',
          description: 'Bonus against current slayer task target'
        });
      }
      
      if (itemName.includes('wilderness') && isInWilderness(target)) {
        effects.push({
          name: 'Wilderness Weapon',
          description: '+50% accuracy and damage in the Wilderness'
        });
      }
    });
    
    // Check for set effects
    if (hasVoidKnightSet(loadout)) {
      const combatStyle = params.combat_style;
      if (combatStyle === 'melee' && hasVoidMeleeHelm(loadout)) {
        effects.push({
          name: 'Void Knight Melee',
          description: '+10% melee accuracy and strength'
        });
      } else if (combatStyle === 'ranged' && hasVoidRangeHelm(loadout)) {
        effects.push({
          name: 'Void Knight Ranged',
          description: '+10% ranged accuracy and strength'
        });
      } else if (combatStyle === 'magic' && hasVoidMageHelm(loadout)) {
        const desc = hasEliteVoidKnightSet(loadout) ? 
          '+45% magic accuracy, +2.5% magic damage' : 
          '+45% magic accuracy';
        effects.push({
          name: 'Void Knight Magic',
          description: desc
        });
      }
    }
    
    if (countInquisitorPieces(loadout) > 0 && params.combat_style === 'melee') {
      const pieces = countInquisitorPieces(loadout);
      effects.push({
        name: 'Inquisitor\'s Armor',
        description: `+${pieces * 0.5 + (pieces === 3 ? 1.0 : 0)}% crush accuracy and damage`
      });
    }
    
    if (hasObsidianArmorSet(loadout) && hasObsidianWeapon(loadout)) {
      effects.push({
        name: 'Obsidian Armor Set',
        description: '+10% accuracy and damage with obsidian weapons'
      });
    }
    
    if (countCrystalArmorPieces(loadout) > 0 && hasCrystalRangedWeapon(loadout)) {
      let damageBonus = 0;
      let accuracyBonus = 0;
      
      if (hasCrystalHelm(loadout)) {
        damageBonus += 2.5;
        accuracyBonus += 5;
      }
      
      if (hasCrystalBody(loadout)) {
        damageBonus += 7.5;
        accuracyBonus += 15;
      }
      
      if (hasCrystalLegs(loadout)) {
        damageBonus += 5;
        accuracyBonus += 10;
      }
      
      effects.push({
        name: 'Crystal Armor Set',
        description: `+${damageBonus}% damage, +${accuracyBonus}% accuracy with crystal bow`
      });
    }
    
    setActiveEffects(effects);
  }, [loadout, params, target]);
  
  // If no active effects, don't render anything
  if (activeEffects.length === 0) {
    return null;
  }
  
  return (
    <Card className="mt-4">
      <CardContent className="pt-4">
        <h3 className="text-sm font-semibold mb-2">Active Passive Effects</h3>
        <div className="space-y-2">
          {activeEffects.map((effect, index) => (
            <div key={index} className="flex flex-col items-center space-y-1 rounded-md border p-2">
              <div className="flex items-center justify-center">
                <Badge variant="secondary" className="mr-2">Active</Badge>
                <span className="font-medium text-sm">{effect.name}</span>
              </div>
              <p className="text-xs text-muted-foreground">{effect.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Also add a default export for compatibility with existing imports
export default PassiveEffectsDisplay;