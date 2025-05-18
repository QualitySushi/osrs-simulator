'use client';

import { useState, useEffect } from 'react';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useCalculatorStore } from '@/store/calculator-store';
import { ItemSelector } from './ItemSelector';
import { Item } from '@/app/types/calculator';

const SPELL_MAX_HITS: Record<string, number> = {
  'Fire Strike': 8, 'Fire Bolt': 12, 'Fire Blast': 16, 'Fire Wave': 20, 'Fire Surge': 24,
  'Iban Blast': 25, 'Trident of the Seas': 23, 'Trident of the Swamp': 25,
  'Sanguinesti Staff': 24, "Tumeken's Shadow": 29
};

const EQUIPMENT_SLOTS = {
  head: { name: 'Head', icon: '🪖', position: 'top-center' },
  cape: { name: 'Cape', icon: '🧣', position: 'left-top' },
  neck: { name: 'Neck', icon: '📿', position: 'center-top-2' },
  ammo: { name: 'Ammo', icon: '🏹', position: 'right-top-2' },
  mainhand: { name: 'Weapon', icon: '⚔️', position: 'left-middle' },
  offhand: { name: 'Shield', icon: '🛡️', position: 'right-middle' },
  body: { name: 'Body', icon: '👕', position: 'center-middle' },
  legs: { name: 'Legs', icon: '👖', position: 'center-bottom' },
  hands: { name: 'Hands', icon: '🧤', position: 'left-bottom' },
  feet: { name: 'Feet', icon: '👢', position: 'bottom-center' },
  ring: { name: 'Ring', icon: '💍', position: 'right-bottom' },
  '2h': { name: 'Two-Handed', icon: '🗡️', position: 'left-middle-2h' }
};

const POSITION_TO_GRID: Record<string, string> = {
  'top-center': 'col-start-2 row-start-1',
  'left-top': 'col-start-1 row-start-2',
  'center-top-2': 'col-start-2 row-start-2',
  'right-top-2': 'col-start-3 row-start-2',
  'left-middle': 'col-start-1 row-start-3',
  'left-middle-2h': 'col-start-1 row-start-3',
  'right-middle': 'col-start-3 row-start-3',
  'center-middle': 'col-start-2 row-start-3',
  'center-bottom': 'col-start-2 row-start-4',
  'left-bottom': 'col-start-1 row-start-5',
  'bottom-center': 'col-start-2 row-start-5',
  'right-bottom': 'col-start-3 row-start-5'
};

const ATTACK_STYLES = {
  melee: ['stab', 'slash', 'crush'],
  ranged: ['accurate', 'rapid', 'longrange'],
  magic: ['standard', 'longrange', 'defensive']
};

const ATTACK_STYLE_BONUSES: Record<string, number[]> = {
  melee: [3, 0, 1],
  ranged: [3, 0, 1],
  magic: [0, 0, 0]
};

export function CombinedEquipmentDisplay() {
  const { toast } = useToast();
  const { params, setParams, gearLocked, lockGear, unlockGear } = useCalculatorStore();
  const [loadout, setLoadout] = useState<Record<string, Item | null>>({});
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [show2hOption, setShow2hOption] = useState(true);
  const [detectedStyles, setDetectedStyles] = useState<string[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<string>('');

  const combatStyle = params.combat_style;

  useEffect(() => {
    const weapon = loadout['2h'] || loadout['mainhand'];
    const stats = weapon?.combat_stats?.attack_bonuses || {};
if (combatStyle === 'melee') {
  const styles = ['stab', 'slash', 'crush'].filter(k =>
    typeof stats[k] === 'number' && stats[k] > 0
  );
  setDetectedStyles(styles.length ? styles : ['stab']);
  if (!styles.includes(selectedStyle)) {
    setSelectedStyle(styles[0] || 'stab');
  }
} else if (combatStyle === 'ranged') {
      setDetectedStyles(['accurate', 'rapid', 'longrange']);
      if (!['accurate', 'rapid', 'longrange'].includes(selectedStyle)) setSelectedStyle('accurate');
    } else if (combatStyle === 'magic') {
      setDetectedStyles(['standard', 'longrange', 'defensive']);
      if (!['standard', 'longrange', 'defensive'].includes(selectedStyle)) setSelectedStyle('standard');
    }
  }, [loadout, combatStyle]);

  useEffect(() => {
    const index = ATTACK_STYLES[combatStyle].indexOf(selectedStyle);
    const bonus = ATTACK_STYLE_BONUSES[combatStyle][index] || 0;
    setParams({ attack_style_bonus_attack: bonus, attack_type: selectedStyle });
  }, [selectedStyle, combatStyle, setParams]);

const getDisplaySlots = () => {
  const slotsToShow = Object.entries(EQUIPMENT_SLOTS)
    .filter(([slot]) => {
      // Only show offhand if not using 2H
      if (slot === 'offhand') return !show2hOption;
      // Only show mainhand if not using 2H
      if (slot === 'mainhand') return !show2hOption;
      // Only show 2H slot if using 2H
      if (slot === '2h') return show2hOption;
      return true;
    })
    .map(([slot, data]) => ({
      slot,
      ...data
    }));

  return slotsToShow;
};

  const handleSelectItem = (slot: string, item: Item | null) => {
    const updated = { ...loadout };
    if (!item) {
      delete updated[slot];
      toast.success(`Removed item from ${slot}`);
    } else {
      if (slot === '2h') {
        delete updated['mainhand'];
        delete updated['offhand'];
        updated['2h'] = item;
      } else {
        if (slot === 'mainhand' || slot === 'offhand') delete updated['2h'];
        updated[slot] = item;
      }
      toast.success(`Equipped ${item.name}`);
    }
    setLoadout(updated);
    setIsDialogOpen(false);
  };

  const renderAttackStyleTabs = () => (
    <div className="justify-center text-center items-center p-3">
      {detectedStyles.map(style => (
        <Button
          key={style}
          size="sm"
          variant={style === selectedStyle ? 'default' : 'outline'}
          onClick={() => setSelectedStyle(style)}
        >
          {style.charAt(0).toUpperCase() + style.slice(1)}
        </Button>
      ))}
    </div>
  );

  return (
    <Card>
      <CardHeader className="justify-center items-center ">
        <div>
          <CardTitle>Character Preview</CardTitle>
          <CardDescription>Manage and inspect your gear</CardDescription>
        </div>
        <div className="flex items-center justify center">
          <Button variant="outline" size="sm" onClick={() => {
            setShow2hOption(prev => !prev);
            setLoadout(prev => {
              const copy = { ...prev };
              if (show2hOption) {
                delete copy['2h'];
              } else {
                delete copy['mainhand'];
                delete copy['offhand'];
              }
              return copy;
            });
          }}>
            {show2hOption ? 'Use 1H + Shield' : 'Use 2H'}
          </Button>
                    {renderAttackStyleTabs()}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          {gearLocked && (
            <Alert className="mb-4 border-blue-300 dark:border-blue-800 bg-blue-100 dark:bg-blue-900">
              <AlertDescription>Gear bonuses are locked in for simulation.</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-3 grid-rows-5 gap-2 justify-items-center mb-4">
            {getDisplaySlots().map(({ slot, name, icon, position }) => (
              <div
                key={slot}
                className={`${POSITION_TO_GRID[position]} w-20 h-20 flex flex-col items-center justify-center border rounded-md bg-muted/20 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800`}
                onClick={() => { setSelectedSlot(slot); setIsDialogOpen(true); }}
              >
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-2xl mb-1">{loadout[slot] ? '⚔️' : icon}</div>
                    </TooltipTrigger>
                    <TooltipContent>{loadout[slot]?.name || `Select ${name}`}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <div className="text-xs truncate w-full text-center">
                  {loadout[slot]?.name || name}
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
              </DialogHeader>
              {selectedSlot && (
                <ItemSelector
                  slot={selectedSlot}
                  onSelectItem={(item) => handleSelectItem(selectedSlot, item)}
                />
              )}
              <Button
                variant="destructive"
                onClick={() => selectedSlot && handleSelectItem(selectedSlot, null)}
              >
                Clear Slot
              </Button>
            </DialogContent>
          </Dialog>
        </CardContent>
      )}
    </Card>
  );
}
