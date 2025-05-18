import React from 'react';
import { Item } from '@/app/types/calculator';
import { Badge } from '@/components/ui/badge';

// Define interface for passive effect entry
interface PassiveEffect {
  name: string;
  description: string;
  category?: 'weapon' | 'armor' | 'jewelry' | 'set';
  bonus?: {
    accuracy?: number,
    damage?: number
  };
}

// Database of passive effects
const PASSIVE_EFFECTS: Record<string, PassiveEffect> = {
  // Weapons
  'twisted bow': {
    name: 'Twisted Accuracy',
    description: 'Accuracy and damage increases with target\'s Magic level',
    category: 'weapon'
  },
  'zaryte crossbow': {
    name: 'Enhanced Enchantment',
    description: 'Enchanted bolt effects strengthened by 10%',
    category: 'weapon'
  },
  'dragon hunter crossbow': {
    name: 'Dragonhunter',
    description: '+30% accuracy and +25% damage against dragons',
    category: 'weapon'
  },
  'dragon hunter lance': {
    name: 'Dragonhunter',
    description: '+20% accuracy and damage against dragons',
    category: 'weapon'
  },
  'dragon hunter wand': {
    name: 'Dragonhunter',
    description: '+50% accuracy and +20% damage against dragons',
    category: 'weapon'
  },
  'craw\'s bow': {
    name: 'Wilderness Power',
    description: '+50% damage and accuracy against wilderness monsters',
    category: 'weapon'
  },
  'thammaron\'s sceptre': {
    name: 'Wilderness Power',
    description: '+50% damage and accuracy against wilderness monsters',
    category: 'weapon'
  },
  'viggora\'s chainmace': {
    name: 'Wilderness Power',
    description: '+50% damage and accuracy against wilderness monsters',
    category: 'weapon'
  },
  'webweaver bow': {
    name: 'Wilderness Power',
    description: '+50% damage and accuracy against wilderness monsters',
    category: 'weapon'
  },
  'staff of the dead': {
    name: 'Rune Conservation',
    description: '12.5% chance to not consume runes on spell cast',
    category: 'weapon'
  },
  'staff of light': {
    name: 'Rune Conservation',
    description: '12.5% chance to not consume runes on spell cast',
    category: 'weapon'
  },
  'toxic staff of the dead': {
    name: 'Rune Conservation',
    description: '12.5% chance to not consume runes on spell cast',
    category: 'weapon'
  },
  'kodai wand': {
    name: 'Enhanced Rune Conservation',
    description: '15% chance to not consume runes on spell cast',
    category: 'weapon'
  },
  'sanguinesti staff': {
    name: 'Blood Magic',
    description: '1/6 chance to heal for 50% of damage dealt',
    category: 'weapon'
  },
  'silverlight': {
    name: 'Demonbane',
    description: '+60% damage against demons',
    category: 'weapon'
  },
  'darklight': {
    name: 'Demonbane',
    description: '+60% damage against demons',
    category: 'weapon'
  },
  'arclight': {
    name: 'Enhanced Demonbane',
    description: '+70% accuracy and damage against demons',
    category: 'weapon'
  },
  'emberlight': {
    name: 'Enhanced Demonbane',
    description: '+70% accuracy and damage against demons',
    category: 'weapon'
  },
  'scorching bow': {
    name: 'Demonbane Bow',
    description: '+30% accuracy and damage against demons',
    category: 'weapon'
  },
  'keris': {
    name: 'Kaphite Killer',
    description: '+33% damage vs. kalphites; 1/51 chance for triple damage',
    category: 'weapon'
  },
  'keris partisan': {
    name: 'Kaphite Killer',
    description: '+33% damage vs. kalphites; 1/51 chance for triple damage',
    category: 'weapon'
  },
  'keris partisan of breaching': {
    name: 'Enhanced Kaphite Killer',
    description: '+33% accuracy and damage vs. kalphites; 1/51 chance for triple damage',
    category: 'weapon'
  },
  'leaf-bladed battleaxe': {
    name: 'Turoth Slayer',
    description: '+17.5% damage against turoths and kurask',
    category: 'weapon'
  },
  'osmumten\'s fang': {
    name: 'Double Accuracy',
    description: 'Rolls accuracy twice; hits always deal 15-85% of max hit',
    category: 'weapon'
  },
  'tumeken\'s shadow': {
    name: 'Shadow Power',
    description: 'Triples magic attack and damage from worn equipment',
    category: 'weapon'
  },
  'zuriel\'s staff': {
    name: 'Ancient Boost',
    description: 'Boosts effects of Ancient Magicks spells',
    category: 'weapon'
  },
  
  // Armor pieces
  'elysian spirit shield': {
    name: 'Divine Protection',
    description: '70% chance to reduce incoming damage by 25%',
    category: 'armor'
  },
  'spectral spirit shield': {
    name: 'Prayer Protection',
    description: 'Reduces prayer drain effects by 50%',
    category: 'armor'
  },
  'dinh\'s bulwark': {
    name: 'Bulwark',
    description: 'Block: -20% damage taken but cannot attack',
    category: 'armor'
  },
  'anti-dragon shield': {
    name: 'Dragonfire Protection',
    description: 'Partial protection against dragonfire',
    category: 'armor'
  },
  'dragonfire shield': {
    name: 'Enhanced Protection',
    description: 'Protection against dragonfire and wyvern breath',
    category: 'armor'
  },
  'ancient wyvern shield': {
    name: 'Wyvern Immunity',
    description: 'Full immunity to wyvern breath freezing effect',
    category: 'armor'
  },
  'dragonfire ward': {
    name: 'Enhanced Protection',
    description: 'Protection against dragonfire and wyvern breath',
    category: 'armor'
  },
  'black mask': {
    name: 'Slayer Boost',
    description: '+16.67% melee accuracy and damage on Slayer tasks',
    category: 'armor'
  },
  'slayer helmet': {
    name: 'Slayer Boost',
    description: '+16.67% melee accuracy and damage on Slayer tasks',
    category: 'armor'
  },
  'slayer helmet (i)': {
    name: 'Enhanced Slayer Boost',
    description: '+16.67% melee and +15% ranged/magic accuracy and damage on Slayer tasks',
    category: 'armor'
  },
  'serpentine helm': {
    name: 'Venom Immunity',
    description: 'Immunity to poison and venom; chance to envenom targets',
    category: 'armor'
  },
  'magma helm': {
    name: 'Venom Immunity',
    description: 'Immunity to poison and venom; chance to envenom targets',
    category: 'armor'
  },
  'tanzanite helm': {
    name: 'Venom Immunity',
    description: 'Immunity to poison and venom; chance to envenom targets',
    category: 'armor'
  },
  'dizana\'s quiver': {
    name: 'Ranged Enhancement',
    description: '+1 ranged strength and +10 ranged accuracy to all projectiles',
    category: 'armor'
  },
  'blessed dizana\'s quiver': {
    name: 'Ranged Enhancement',
    description: '+1 ranged strength and +10 ranged accuracy to all projectiles',
    category: 'armor'
  },
  
  // Jewelry
  'ring of life': {
    name: 'Life Saver',
    description: 'Teleports player to safety when below 10% HP',
    category: 'jewelry'
  },
  'phoenix necklace': {
    name: 'Phoenix Rebirth',
    description: 'Heals 30% of max HP when below 20% HP',
    category: 'jewelry'
  },
  'ring of wealth': {
    name: 'Wealth',
    description: 'Improves rare drop table and collects coin drops',
    category: 'jewelry'
  },
  'ring of recoil': {
    name: 'Recoil',
    description: 'Deals 10% of damage taken back to attacker',
    category: 'jewelry'
  },
  'ring of suffering': {
    name: 'Enhanced Recoil',
    description: 'Recoil effect with greater durability',
    category: 'jewelry'
  },
  'salve amulet': {
    name: 'Undead Bane',
    description: '+16.67% melee accuracy and damage vs undead',
    category: 'jewelry'
  },
  'salve amulet (e)': {
    name: 'Enhanced Undead Bane',
    description: '+20% melee accuracy and damage vs undead',
    category: 'jewelry'
  },
  'salve amulet (i)': {
    name: 'Undead Bane',
    description: '+16.67% melee/ranged and +15% magic accuracy and damage vs undead',
    category: 'jewelry'
  },
  'salve amulet(ei)': {
    name: 'Supreme Undead Bane',
    description: '+20% accuracy and damage in all styles vs undead',
    category: 'jewelry'
  },
  'berserker necklace': {
    name: 'Obsidian Power',
    description: '+20% damage with obsidian weapons',
    category: 'jewelry'
  },
  'amulet of the damned': {
    name: 'Barrows Enhancement',
    description: 'Enhances effects of Barrows equipment sets',
    category: 'jewelry'
  },
  'amulet of avarice': {
    name: 'Revenant Hunter',
    description: '+20% damage and accuracy vs revenants; notes drops but skulls player',
    category: 'jewelry'
  },
  'brimstone ring': {
    name: 'Magic Penetration',
    description: '25% chance to ignore 10% of target\'s Magic defence',
    category: 'jewelry'
  },
  'lightbearer': {
    name: 'Special Regeneration',
    description: 'Special attack energy regenerates twice as fast',
    category: 'jewelry'
  }
};

// Set effects
const SET_EFFECTS: Record<string, PassiveEffect> = {
  'void knight': {
    name: 'Void Knight',
    description: 'Melee: +10% accuracy and strength\nRanged: +10% accuracy and strength\nMagic: +45% accuracy',
    category: 'set'
  },
  'elite void': {
    name: 'Elite Void Knight',
    description: 'Melee: +10% accuracy and strength\nRanged: +10% accuracy and strength\nMagic: +45% accuracy, +2.5% damage',
    category: 'set'
  },
  'shayzien': {
    name: 'Shayzien',
    description: 'Reduces damage from lizardman shamans\' poison attack',
    category: 'set'
  },
  'justiciar': {
    name: 'Justiciar',
    description: 'Reduces damage based on defence bonuses',
    category: 'set'
  },
  'inquisitor': {
    name: 'Inquisitor',
    description: 'Boosts crush accuracy and damage by 2.5%',
    category: 'set'
  },
  'virtus': {
    name: 'Virtus',
    description: '+9% damage boost to Ancient Magicks',
    category: 'set'
  },
  'dharok': {
    name: 'Dharok\'s',
    description: 'Wretched Strength: Damage increases as HP decreases',
    category: 'set'
  },
  'torag': {
    name: 'Torag\'s',
    description: 'Corruption: 25% chance to drain 20% run energy',
    category: 'set'
  },
  'guthan': {
    name: 'Guthan\'s',
    description: 'Infestation: 25% chance to heal for damage dealt',
    category: 'set'
  },
  'verac': {
    name: 'Verac\'s',
    description: 'Defiler: 25% chance to ignore armour and prayers',
    category: 'set'
  },
  'karil': {
    name: 'Karil\'s',
    description: 'Tainted Shot: 25% chance to lower Agility by 20%',
    category: 'set'
  },
  'ahrim': {
    name: 'Ahrim\'s',
    description: 'Blighted Aura: 25% chance to lower Strength by 5',
    category: 'set'
  },
  'obsidian': {
    name: 'Obsidian',
    description: '+10% accuracy and strength with obsidian weapons',
    category: 'set'
  },
  'crystal': {
    name: 'Crystal',
    description: '+15% damage and +30% accuracy with crystal bow/Bow of faerdhinen',
    category: 'set'
  },
};

interface ItemPassiveEffectsProps {
  item: Item;
}

export const ItemPassiveEffects: React.FC<ItemPassiveEffectsProps> = ({ item }) => {
  if (!item?.name) return null;
  
  // Find matching passive effect
  const itemNameLower = item.name.toLowerCase();
  const passiveEffect = Object.entries(PASSIVE_EFFECTS).find(
    ([key]) => itemNameLower.includes(key)
  );
  
  // Check for set effects (based on partial name match)
  const setEffect = Object.entries(SET_EFFECTS).find(
    ([key]) => itemNameLower.includes(key)
  );
  
  if (!passiveEffect && !setEffect) {
    return null;
  }
  
  return (
    <div className="mt-2 space-y-2">
      <h3 className="text-xs font-semibold">Passive Effects</h3>
      
      {passiveEffect && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {passiveEffect[1].category || 'effect'}
            </Badge>
            <span className="text-xs font-medium">{passiveEffect[1].name}</span>
          </div>
          <p className="text-xs text-muted-foreground">{passiveEffect[1].description}</p>
        </div>
      )}
      
      {setEffect && (
        <div className="space-y-1 mt-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="capitalize">
              set effect
            </Badge>
            <span className="text-xs font-medium">{setEffect[1].name}</span>
          </div>
          <p className="text-xs text-muted-foreground whitespace-pre-line">{setEffect[1].description}</p>
        </div>
      )}
    </div>
  );
};

export default ItemPassiveEffects;