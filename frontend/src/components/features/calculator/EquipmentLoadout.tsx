import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { ChevronDown, ChevronUp, RotateCcw, Sword, Shield } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useCalculatorStore } from '@/store/calculator-store';
import { EquipmentDisplay } from '@/components/features/calculator/EquipmentDisplay';
import PassiveEffectsDisplay from './PassiveEffectsDisplay';
import { ItemSelector } from './ItemSelector';
import { Item } from '@/types/calculator';
import { itemsApi } from '@/services/api';

const EQUIPMENT_SLOTS = [
  { name: 'Head', slot: 'head', icon: '🪖' },
  { name: 'Cape', slot: 'cape', icon: '🧣' },
  { name: 'Neck', slot: 'neck', icon: '📿' },
  { name: 'Ammo', slot: 'ammo', icon: '🏹' },
  { name: 'Weapon', slot: 'mainhand', icon: '⚔️' },
  { name: 'Shield', slot: 'offhand', icon: '🛡️' },
  { name: 'Body', slot: 'body', icon: '👕' },
  { name: 'Legs', slot: 'legs', icon: '👖' },
  { name: 'Hands', slot: 'hands', icon: '🧤' },
  { name: 'Feet', slot: 'feet', icon: '👢' },
  { name: 'Ring', slot: 'ring', icon: '💍' },
];

const SPELL_MAX_HITS: Record<string, number> = {
  'Fire Strike': 8,
  'Fire Bolt': 12,
  'Fire Blast': 16,
  'Fire Wave': 20,
  'Fire Surge': 24,
  'Iban Blast': 25,
  'Trident of the Seas': 23,
  'Trident of the Swamp': 25,
  'Sanguinesti Staff': 24,
  "Tumeken's Shadow": 29
};

const TWO_HANDED_SLOT = { name: 'Two-Handed', slot: '2h', icon: '🗡️' };

const SLOT_GROUPS = {
  melee: ['mainhand', 'offhand', '2h', 'head', 'cape', 'neck', 'body', 'legs', 'hands', 'feet', 'ring', 'ammo'],
  ranged: ['mainhand', 'offhand', '2h', 'head', 'cape', 'neck', 'body', 'legs', 'hands', 'feet', 'ring', 'ammo'],
  magic: ['mainhand', 'offhand', '2h', 'head', 'cape', 'neck', 'body', 'legs', 'hands', 'feet', 'ring', 'ammo'],
};

interface EquipmentLoadoutProps {
  onEquipmentUpdate?: (loadout: Record<string, Item | null>) => void;
}

export function EquipmentLoadout({ onEquipmentUpdate }: EquipmentLoadoutProps) {
  const { toast } = useToast();
  const { params, setParams, lockGear, unlockGear, gearLocked, bossLocked } = useCalculatorStore();
  const combatStyle = params.combat_style;
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loadout, setLoadout] = useState<Record<string, Item | null>>({});
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedBossForm, setSelectedBossForm] = useState(null);
  // Default to 1H weapon with offhand
  const [show2hOption, setShow2hOption] = useState(false); // Add missing state

  const [totals, setTotals] = useState<Record<string, number>>({
    stab: 0,
    slash: 0,
    crush: 0,
    magic: 0,
    ranged: 0,
    strength: 0,
    'ranged strength': 0,
    'magic damage percent': 0,
  });

  // Effect to fetch the current boss form when boss is locked
  useEffect(() => {
    // This would need to be implemented to fetch the current boss form
    // from the BossSelector component or from an API
    if (bossLocked) {
      // fetchCurrentBossForm().then(form => setSelectedBossForm(form));
      // For now we'll just use null
      setSelectedBossForm(null);
    } else {
      setSelectedBossForm(null);
    }
  }, [bossLocked]);

  // Helper function to apply gear totals to the store
  const applyGearTotals = useCallback((totals: Record<string, number>) => {
    // Only proceed if there are items in the loadout
    const hasAnyItem = Object.values(loadout).some(item => item !== null);
    if (!hasAnyItem) {
      unlockGear();
      return;
    }

    console.log('[DEBUG] Calculated equipment totals:', totals);
    
    // Apply totals to parameters based on combat style
    if (params.combat_style === 'melee') {
      const maxAttack = Math.max(totals.stab || 0, totals.slash || 0, totals.crush || 0);
      
      // CRITICAL FIX: Only update if values have changed
      if (maxAttack !== params.melee_attack_bonus || 
          (totals.strength || 0) !== params.melee_strength_bonus) {
        
        console.log('[DEBUG] Setting melee equipment bonuses:', {
          attack: maxAttack,
          strength: totals.strength || 0
        });
        
        // IMPORTANT: Set the params with the CALCULATED TOTALS, not individual item stats
        setParams({
          melee_attack_bonus: maxAttack,
          melee_strength_bonus: totals.strength || 0,
          attack_style_bonus: params.attack_style_bonus_attack || 0 // Add this to fix backend issue
        });
      }
    } 
    else if (params.combat_style === 'ranged') {
      // CRITICAL FIX: Only update if values have changed
      if ((totals.ranged || 0) !== params.ranged_attack_bonus || 
          (totals['ranged strength'] || 0) !== params.ranged_strength_bonus) {
        
        console.log('[DEBUG] Setting ranged equipment bonuses:', {
          attack: totals.ranged || 0,
          strength: totals['ranged strength'] || 0
        });
        
        setParams({
          ranged_attack_bonus: totals.ranged || 0,
          ranged_strength_bonus: totals['ranged strength'] || 0,
          attack_style_bonus: params.attack_style_bonus_attack || 0 // Add this to fix backend issue
        });
      }
    } 
    else if (params.combat_style === 'magic') {
      // CRITICAL FIX: Only update if values have changed
      const magicAttack = totals.magic || 0;
      const magicDamage = (totals['magic damage percent'] || 0) / 100;
      
      if (magicAttack !== params.magic_attack_bonus || 
          magicDamage !== params.magic_damage_bonus) {
        
        console.log('[DEBUG] Setting magic equipment bonuses:', {
          attack: magicAttack,
          damage: magicDamage
        });
        
        setParams({
          magic_attack_bonus: magicAttack,
          magic_damage_bonus: magicDamage,
          target_defence_level: params.target_defence_level || 1,
          target_defence_bonus: params.target_defence_bonus || 0,
          attack_style_bonus: params.attack_style_bonus_attack || 0 // Add this to fix backend issue
        });
      }
    }

    // Lock gear inputs
    lockGear();
    
    // Notify parent component of loadout changes
    if (onEquipmentUpdate) {
      onEquipmentUpdate(loadout);
    }
  }, [loadout, params, setParams, lockGear, unlockGear, onEquipmentUpdate]);


  // This effect ensures the UI updates when the loadout changes
  useEffect(() => {
    // Recalculate totals whenever the loadout changes
    const newTotals = getTotals(loadout);
    setTotals(newTotals);
    
    // CRITICAL FIX: Only call applyGearTotals if we have items AND we're not already gearLocked
    const hasItems = Object.values(loadout).some(item => item !== null);
    if (hasItems && !gearLocked) {
      applyGearTotals(newTotals);
    }
    
    // Still notify parent of loadout changes even if gear is locked
    if (onEquipmentUpdate) {
      onEquipmentUpdate(loadout);
    }
  }, [loadout, applyGearTotals, gearLocked, onEquipmentUpdate]);

  const handleSelectItem = (slot: string, item: Item | null) => {
    if (!item) {
      console.debug(`[DEBUG] Deselected item for slot: ${slot}`);
      // Create a new loadout without this item
      const updatedLoadout = { ...loadout };
      delete updatedLoadout[slot];
      
      // Update the loadout (this will trigger the useEffect to recalculate totals)
      setLoadout(updatedLoadout);
      
      // If no items remain, unlock gear
      if (Object.keys(updatedLoadout).length === 0) {
        unlockGear();
      }
      
      // Close the dialog
      setIsDialogOpen(false);
      return;
    }

    console.debug('[DEBUG] Selected slot:', slot);
    console.debug('[DEBUG] Selected raw item:', item);

    // Fetch full item details including combat_stats
    itemsApi.getItemById(item.id).then((fullItem) => {
      if (!fullItem) {
        console.warn('[DEBUG] Failed to fetch full item details for:', item.id);
        return;
      }

      console.debug('[DEBUG] Full item details:', fullItem);

      // Handle 2h weapons or mainhand/offhand items
      const newLoadout = { ...loadout };
      
      if (slot === '2h') {
        newLoadout['2h'] = fullItem;
        // Remove mainhand and offhand items when equipping a 2h weapon
        delete newLoadout['mainhand'];
        delete newLoadout['offhand'];
      } else if ((slot === 'mainhand' || slot === 'offhand') && loadout['2h']) {
        // Remove 2h weapon when equipping a mainhand or offhand item
        delete newLoadout['2h'];
        newLoadout[slot] = fullItem;
      } else {
        // For all other slots, just add the item
        newLoadout[slot] = fullItem;
      }

      console.debug('[DEBUG] New loadout:', newLoadout);
      
      // Update the loadout - useEffect will handle recalculating totals and updating the store
      setLoadout(newLoadout);
      
      // Close the dialog
      setIsDialogOpen(false);
      
      // Show a success toast
      toast.success(`Equipped ${fullItem.name}`);
    });
  };

  const getTotals = (gear: Record<string, Item | null>) => {
    console.debug('[DEBUG] Calculating totals from gear:', gear);

    const totals: Record<string, number> = {
      stab: 0,
      slash: 0,
      crush: 0,
      magic: 0,
      ranged: 0,
      strength: 0,
      'ranged strength': 0,
      'magic damage percent': 0,
      'defence stab': 0,
      'defence slash': 0,
      'defence crush': 0,
      'defence magic': 0,
      'defence ranged': 0,
      prayer: 0,
    };

    // Loop through all equipped items
    for (const item of Object.values(gear)) {
      if (!item?.combat_stats) continue;
      console.debug(`[DEBUG] Adding stats from item: ${item.name}`);

      const { attack_bonuses, other_bonuses } = item.combat_stats;

      // Add attack bonuses from this item
      for (const [key, val] of Object.entries(attack_bonuses)) {
        if (Object.hasOwn(totals, key)) {
          totals[key] += typeof val === 'number' ? val : Number(val) || 0;
          console.debug(`[DEBUG] Added ${val} to ${key}, new total: ${totals[key]}`);
        }
      }

      // Add other bonuses from this item
      for (const [key, val] of Object.entries(other_bonuses)) {
        if (key === 'magic damage' && typeof val === 'string') {
          // Handle magic damage special case (usually formatted as "+X%")
          const match = val.match(/\+(\d+)%/);
          if (match) {
            totals['magic damage percent'] += parseInt(match[1]);
            console.debug(`[DEBUG] Added ${match[1]}% to magic damage percent, new total: ${totals['magic damage percent']}`);
          }
        } else if (Object.hasOwn(totals, key)) {
          // Add numeric bonuses
          totals[key] += typeof val === 'number' ? val : Number(val) || 0;
          console.debug(`[DEBUG] Added ${val} to ${key}, new total: ${totals[key]}`);
        }
      }
      
      // Add defence bonuses
      for (const [key, val] of Object.entries(item.combat_stats.defence_bonuses)) {
        const label = `defence ${key}`;
        if (Object.hasOwn(totals, label)) {
          totals[label] += typeof val === 'number' ? val : Number(val) || 0;
        }
      }

      // Add prayer
      if (typeof other_bonuses.prayer === 'number') {
        totals.prayer += other_bonuses.prayer;
      }
    }

    console.debug('[DEBUG] Final calculated totals:', totals);
    return totals;
  };

  // Get the slots to display based on weapon selection
  const getDisplaySlots = () => {
    const slots = EQUIPMENT_SLOTS.filter(s => SLOT_GROUPS[combatStyle].includes(s.slot));
    
    // Allow all styles to use 2h or 1h+offhand
    if (show2hOption) {
      const main = slots.findIndex(s => s.slot === 'mainhand');
      const off = slots.findIndex(s => s.slot === 'offhand');
      if (main !== -1 && off !== -1) {
        const updated = [...slots];
        updated[main] = TWO_HANDED_SLOT;
        return updated.filter((_, i) => i !== off);
      }
    }
    
    return slots;
  };

  // Toggle between 2h and 1h+offhand display
  const toggleWeaponDisplay = () => {
    setShow2hOption(!show2hOption);
    
    // When switching from 2h to 1h+offhand, clear any 2h weapon
    if (show2hOption && loadout['2h']) {
      const updatedLoadout = { ...loadout };
      delete updatedLoadout['2h'];
      setLoadout(updatedLoadout);
    }
    
    // When switching from 1h+offhand to 2h, clear any mainhand and offhand
    if (!show2hOption && (loadout['mainhand'] || loadout['offhand'])) {
      const updatedLoadout = { ...loadout };
      delete updatedLoadout['mainhand'];
      delete updatedLoadout['offhand'];
      setLoadout(updatedLoadout);
    }
  };

  // Clear all equipment and unlock inputs
  const handleResetEquipment = () => {
    setLoadout({});
    setTotals({
      stab: 0,
      slash: 0,
      crush: 0,
      magic: 0,
      ranged: 0,
      strength: 0,
      'ranged strength': 0,
      'magic damage percent': 0,
    });
    
    // Reset store parameters back to default values as well
    // This ensures we don't keep previously set values
    if (params.combat_style === 'melee') {
      setParams({
        melee_attack_bonus: 0,
        melee_strength_bonus: 0
      });
    } else if (params.combat_style === 'ranged') {
      setParams({
        ranged_attack_bonus: 0,
        ranged_strength_bonus: 0
      });
    } else if (params.combat_style === 'magic') {
      setParams({
        magic_attack_bonus: 0,
        magic_damage_bonus: 0
      });
    }
    
    unlockGear();
    toast.success("Equipment cleared");
    
    // Notify parent that equipment was reset
    if (onEquipmentUpdate) {
      onEquipmentUpdate({});
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Equipment</CardTitle>
          <CardDescription>Manage your equipment loadout</CardDescription>
        </div>
        <div className="flex space-x-2">

          {/* Weapon toggle */}
          <Toggle
            pressed={show2hOption}
            onPressedChange={toggleWeaponDisplay}
            size="sm"
            title={show2hOption ? "Switch to 1H + Shield" : "Switch to 2H weapon"}
          >
            {show2hOption ? <Shield className="h-4 w-4" /> : <Sword className="h-4 w-4" />}
          </Toggle>

          <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          {Object.values(loadout).some(item => item !== null) && (
            <div className="flex justify-end mb-2">
              <Button variant="outline" size="sm" onClick={handleResetEquipment}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          )}
          {gearLocked && (
            <Alert className="mb-4 border-blue-200 dark:border-blue-800 bg-blue-100 dark:bg-blue-900">
              <AlertDescription>
                Equipment bonuses are being used. Manual stat inputs are disabled.
              </AlertDescription>
            </Alert>
          )}

          <div className="mb-6">
            <EquipmentDisplay loadout={loadout} totals={totals} />
          </div>

          {/* Display passive effects if any items have them */}
          <PassiveEffectsDisplay loadout={loadout} target={selectedBossForm} />

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-6">
            {getDisplaySlots().map(({ name, slot, icon }) => (
              <div
                key={slot}
                className="flex flex-col items-center p-2 border rounded-md cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => {
                  setSelectedSlot(slot);
                  setIsDialogOpen(true);
                }}
              >
                <div className="text-2xl mb-1">{icon}</div>
                <div className="text-sm font-medium">{name}</div>
                <div className="text-xs text-muted-foreground truncate w-full text-center">
                  {loadout[slot]?.name || 'None'}
                </div>
              </div>
            ))}
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>
                  {selectedSlot && `Select ${selectedSlot.charAt(0).toUpperCase() + selectedSlot.slice(1)} Equipment`}
                </DialogTitle>
                <DialogDescription>
                  Choose from available items for this slot
                </DialogDescription>
              </DialogHeader>
              {selectedSlot && (
                <ItemSelector
                  slot={selectedSlot}
                  onSelectItem={(item) => handleSelectItem(selectedSlot, item)}
                />
              )}
            </DialogContent>
          </Dialog>
            {combatStyle === 'magic' && (
            <div className="mb-6">
                <label className="block text-sm font-medium text-muted-foreground mb-1">Select Spell</label>
                <select
                value={params.selected_spell || ''}
                onChange={(e) => {
                    const selected = e.target.value;
                    const baseHit = SPELL_MAX_HITS[selected] || 0;

                    setParams({
                    selected_spell: selected,
                    base_spell_max_hit: baseHit
                    });

                    console.log(`[DEBUG] Set spell to ${selected} with base max hit ${baseHit}`);
                }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1"
                aria-label="Select a magic spell"
                >
                <option value="">-- Select a Spell --</option>
                {Object.entries(SPELL_MAX_HITS).map(([name]) => (
                    <option key={name} value={name}>{name}</option>
                ))}
                </select>
            </div>
            )}
        </CardContent>
      )}
    </Card>
  );
}