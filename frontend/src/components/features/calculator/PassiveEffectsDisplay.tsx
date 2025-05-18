import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useCalculatorStore } from '@/store/calculator-store';
import { Item, BossForm } from '@/app/types/calculator';
import calculatePassiveEffectBonuses from './PassiveEffectCalculator';
import { Badge } from '@/components/ui/badge';

interface PassiveEffectsDisplayProps {
  loadout: Record<string, Item | null>;
  target?: BossForm | null;
}

export function PassiveEffectsDisplay({ loadout, target }: PassiveEffectsDisplayProps) {
  const { params } = useCalculatorStore();
  const [activeEffects, setActiveEffects] = useState<Array<{name: string, description: string}>>([]);
  
  useEffect(() => {
    // Get equipped items with passive effects
    const itemsWithPassiveEffects = Object.values(loadout)
      .filter(item => item && item.has_passive_effect) as Item[];
    
    // No passive items
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
        parts.push(`+${formattedAccuracy.toFixed(1)}% accuracy`);
      }
      
      if (formattedDamage !== 0) {
        parts.push(`+${formattedDamage.toFixed(1)}% damage`);
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
      
      // Add specific item effects based on the equipped items
      if (itemName.includes('twisted bow') && target?.magic_level) {
        effects.push({
          name: 'Twisted Bow Scaling',
          description: `Scaling against target with ${target.magic_level} Magic level`
        });
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
      
      if (itemName.includes('slayer helmet') && isOnSlayerTask(target)) {
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
      const pieces = countCrystalArmorPieces(loadout);
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
            <div key={index} className="flex flex-col space-y-1 rounded-md border p-2">
              <div className="flex items-center">
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

// Helper functions for checking target types (reusing from PassiveEffectCalculator)
function isTargetDraconic(target?: BossForm | null): boolean {
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
  return !!target && 
    (target.weakness === 'demon' || 
     (target.form_name && 
      (target.form_name.toLowerCase().includes('demon') || 
       target.form_name.toLowerCase().includes('k\'ril') || 
       target.form_name.toLowerCase().includes('skotizo') || 
       target.form_name.toLowerCase().includes('abyssal'))));
}

function isTargetKalphite(target?: BossForm | null): boolean {
  return !!target && 
    (target.weakness === 'kalphite' || 
     (target.form_name && 
      (target.form_name.toLowerCase().includes('kalphite') || 
       target.form_name.toLowerCase().includes('kq') || 
       target.form_name.toLowerCase().includes('scarab'))));
}

function isInWilderness(target?: BossForm | null): boolean {
  return !!target && 
    (target.form_name && 
     (target.form_name.toLowerCase().includes('revenant') || 
      target.form_name.toLowerCase().includes('callisto') || 
      target.form_name.toLowerCase().includes('vet\'ion') || 
      target.form_name.toLowerCase().includes('venenatis') || 
      target.form_name.toLowerCase().includes('chaos ele')));
}

function isTargetUndead(target?: BossForm | null): boolean {
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

// Helper functions for checking equipped items (reusing from PassiveEffectCalculator)
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
  
  return pieces >= 3;
}

function hasEliteVoidKnightSet(equipment: Record<string, Item | null>): boolean {
  let hasEliteTop = equipment['body'] && equipment['body'].name && 
                    equipment['body'].name.toLowerCase().includes('elite void');
  
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

function hasObsidianArmorSet(equipment: Record<string, Item | null>): boolean {
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

export default PassiveEffectsDisplay;