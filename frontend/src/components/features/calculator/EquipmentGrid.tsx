import { useState, useEffect } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ItemSelector } from './ItemSelector';
import { Item } from '@/app/types/calculator';
import { useToast } from '@/hooks/use-toast';
import { itemsApi } from '@/services/api';

const EQUIPMENT_SLOTS = {
  head: { name: 'Head', position: 'top-center' },
  cape: { name: 'Cape', position: 'left-top' },
  neck: { name: 'Neck', position: 'center-top-2' },
  ammo: { name: 'Ammo', position: 'right-top-2' },
  mainhand: { name: 'Weapon', position: 'left-middle' },
  offhand: { name: 'Shield', position: 'right-middle' },
  body: { name: 'Body', position: 'center-middle' },
  legs: { name: 'Legs', position: 'center-bottom' },
  hands: { name: 'Hands', position: 'left-bottom' },
  feet: { name: 'Feet', position: 'bottom-center' },
  ring: { name: 'Ring', position: 'right-bottom' },
  '2h': { name: 'Two-Handed', position: 'left-middle-2h' }
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

interface EquipmentGridProps {
  loadout: Record<string, Item | null>;
  show2hOption: boolean;
  combatStyle: string;
  onUpdateLoadout: (loadout: Record<string, Item | null>) => void;
}

export function EquipmentGrid({ loadout, show2hOption, combatStyle, onUpdateLoadout }: EquipmentGridProps) {
  const { toast } = useToast();
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const getDisplaySlots = () => {
    return Object.entries(EQUIPMENT_SLOTS)
      .filter(([slot]) => {
        if (slot === 'offhand') return !show2hOption;
        if (slot === 'mainhand') return !show2hOption;
        if (slot === '2h') return show2hOption;
        return true;
      })
      .map(([slot, data]) => ({ slot, ...data }));
  };

  const handleSelectItem = (slot: string, item: Item | null) => {
    const updated = { ...loadout };
    if (!item) {
      delete updated[slot];
      onUpdateLoadout(updated);
      toast.success(`Removed item from ${slot}`);
      setIsDialogOpen(false);
      return;
    }

    itemsApi.getItemById(item.id).then((fullItem) => {
      if (!fullItem || !fullItem.combat_stats) {
        toast.error(`Failed to load full stats for ${item.name}`);
        return;
      }

      if (slot === '2h') {
        delete updated['mainhand'];
        delete updated['offhand'];
        updated['2h'] = fullItem;
      } else {
        if (slot === 'mainhand' || slot === 'offhand') delete updated['2h'];
        updated[slot] = fullItem;
      }

      onUpdateLoadout(updated);
      toast.success(`Equipped ${fullItem.name}`);
      setIsDialogOpen(false);
    });
  };

  const renderItemTooltip = (slot: string, item: Item | null) => {
    if (!item) return `Select ${EQUIPMENT_SLOTS[slot]?.name || slot}`;

    return (
      <>
        <p className="font-bold">{item.name}</p>
        {(item.combat_stats && (slot === 'mainhand' || slot === '2h')) && (
          <div className="text-xs mt-1">
            {combatStyle === 'melee' && (
              <>
                <div>Stab: {item.combat_stats.attack_bonuses.stab || 0}</div>
                <div>Slash: {item.combat_stats.attack_bonuses.slash || 0}</div>
                <div>Crush: {item.combat_stats.attack_bonuses.crush || 0}</div>
                <div>Str: {item.combat_stats.other_bonuses.strength || 0}</div>
              </>
            )}
            {combatStyle === 'ranged' && (
              <>
                <div>Range: {item.combat_stats.attack_bonuses.ranged || 0}</div>
                <div>Range Str: {item.combat_stats.other_bonuses['ranged strength'] || 0}</div>
              </>
            )}
            {combatStyle === 'magic' && (
              <>
                <div>Magic: {item.combat_stats.attack_bonuses.magic || 0}</div>
                <div>Magic Dmg: {item.combat_stats.other_bonuses['magic damage'] || '+0%'}</div>
              </>
            )}
          </div>
        )}
      </>
    );
  };

  return (
    <>
      <div className="grid grid-cols-3 grid-rows-5 gap-2 justify-items-center mb-4">
        {getDisplaySlots().map(({ slot, name, position }) => (
          <div
            key={slot}
            className={`${POSITION_TO_GRID[position]} w-20 h-20 flex flex-col items-center justify-center border rounded-md bg-muted/20 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800`}
            onClick={() => { setSelectedSlot(slot); setIsDialogOpen(true); }}
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="mb-1">
                    <img
                      src={`/images/${loadout[slot]?.slug || `${slot}.webp`}`}
                      alt={slot}
                      className="w-8 h-8 object-contain"
                      onError={(e) => {
                        if (!e.currentTarget.dataset.fallback) {
                          e.currentTarget.src = '/images/placeholder.webp';
                          e.currentTarget.dataset.fallback = 'true';
                        }
                      }}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {renderItemTooltip(slot, loadout[slot])}
                </TooltipContent>
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
        </DialogContent>
      </Dialog>
    </>
  );
}
