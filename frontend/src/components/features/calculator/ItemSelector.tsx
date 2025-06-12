import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { LogoSpinner } from '@/components/ui/LogoSpinner';
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { itemsApi } from '@/services/api';
import { Item, ItemSummary } from '@/types/calculator';
import { useCalculatorStore } from '@/store/calculator-store';
import { CombatStyle } from '@/types/calculator';
import { ItemPassiveEffects } from './ItemPassiveEffects';
import { useReferenceDataStore } from '@/store/reference-data-store';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/use-toast';


// Helper to normalize item names and remove variants
// Many duplicates include parenthetical notes or trailing tags such as
// "#Minigame" or "(bh)". We strip these to dedupe results in the dropdown.
const canonicalName = (name: string) =>
  name
    // Drop anything after the first '#'
    .split('#')[0]
    // Remove parentheses containing known variant markers
    .replace(
      /\s*\((?:bh|trasure trails|treasure trails|item|p|kp|last man standing|trailblazer)\)\s*/gi,
      ''
    )
    // Remove explicit hash tags like "#broken" or "#minigame" if present
    .replace(/\s*#(?:broken|minigame|trailblazer)\s*/gi, '')
    // Remove a trailing parenthetical group like "(4)" or "(i)"

    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim()
    .toLowerCase();

const dedupeItems = (items: ItemSummary[]): ItemSummary[] => {
  const seen = new Map<string, ItemSummary>();
  for (const item of items) {
    const key = canonicalName(item.name);
    if (!seen.has(key)) {
      seen.set(key, item);
    }
  }
  return Array.from(seen.values());
};

interface ItemSelectorProps {
  /**
   * Limit results to specific equipment slot(s). When an array is provided the
   * item slot must be one of the entries.
   */
  slot?: string | string[];
  /**
   * When true, only items with a special attack will be shown.
   */
  specialOnly?: boolean;
  onSelectItem?: (item: ItemSummary) => void;
}

export function ItemSelector({ slot, specialOnly, onSelectItem }: ItemSelectorProps) {
  const [open, setOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemSummary | null>(null);
  const { params, setParams } = useCalculatorStore();
  const combatStyle = params.combat_style;
  const { toast } = useToast();

  const storeItems = useReferenceDataStore((s) => s.items);
  const initData = useReferenceDataStore((s) => s.initData);
  const addItems = useReferenceDataStore((s) => s.addItems);

  useEffect(() => {
    initData();
  }, [initData]);

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  const {
    data: searchResults,
    isLoading,
  } = useQuery({
    queryKey: ['item-search', debouncedSearch, slot],
    queryFn: () => itemsApi.searchItems(debouncedSearch),
    enabled: debouncedSearch.length > 0,
    staleTime: Infinity,
    onSuccess: (d) => addItems(d),
    onError: (e: any) => toast.error(`Item search failed: ${e.message}`),
  });

  // Fetch specific item details when an item is selected
  const { data: itemDetails } = useQuery({
    queryKey: ['item', selectedItem?.id],
    queryFn: () => selectedItem ? itemsApi.getItemById(selectedItem.id) : null,
    enabled: !!selectedItem,
    staleTime: Infinity,
    onError: (e: any) => toast.error(`Failed to load item details: ${e.message}`),
  });

  // Items from store filtered by slot
  const filterBySlot = (items: ItemSummary[]) =>
    slot
      ? items.filter((item) =>
          Array.isArray(slot) ? slot.includes(item.slot) : item.slot === slot
        )
      : items;

  const filteredItems = filterBySlot(storeItems);
  const searchFiltered = searchResults ? filterBySlot(searchResults) : [];
  const baseItems =
    searchTerm.length > 0 ? searchFiltered : filteredItems;
  const itemsToDisplay = dedupeItems(
    specialOnly
      ? baseItems.filter((item) => item.has_special_attack)
      : baseItems
  );

  // Handle item selection and update calculator params based on its stats
  const handleSelectItem = (item: ItemSummary) => {
    setSelectedItem(item);
    setOpen(false);

    if (onSelectItem) {
      onSelectItem(item);
    }

    // Fetch detailed item info
    itemsApi
      .getItemById(item.id)
      .then((itemData) => {
        if (!itemData.combat_stats) return;

        // Update calculator params based on combat style and item stats
        updateStatsFromItem(itemData, combatStyle);
      })
      .catch((e: any) => {
        toast.error(`Failed to load item stats: ${e.message}`);
      });
  };

  const updateStatsFromItem = (item: Item, combatStyle: CombatStyle) => {
    if (!item.combat_stats) return;
    
    const { attack_bonuses, other_bonuses } = item.combat_stats;
    
    if (combatStyle === 'melee') {
      setParams({
        melee_strength_bonus: other_bonuses.strength || 0
      });
    }
    else if (combatStyle === 'ranged') {
      setParams({
        ranged_attack_bonus: attack_bonuses.ranged || 0,
        ranged_strength_bonus: other_bonuses['ranged strength'] || 0
      });
    } 
    else if (combatStyle === 'magic') {
      // Convert magic damage string (like "+15%") to number (0.15)
      let magicDamageBonus = 0;
      if (other_bonuses['magic damage']) {
        const damageStr = other_bonuses['magic damage'] as string;
        const match = damageStr.match(/\+(\d+)%/);
        if (match && match[1]) {
          magicDamageBonus = parseInt(match[1]) / 100;
        }
      }
      
      setParams({
        magic_attack_bonus: attack_bonuses.magic || 0,
        magic_damage_bonus: magicDamageBonus
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Equipment Selection</CardTitle>
        <CardDescription>
          Select equipment to calculate DPS with
          {slot && (
            Array.isArray(slot)
              ? ` (${slot.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('/')})`
              : ` (${slot.charAt(0).toUpperCase() + slot.slice(1)})`
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Item selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Item</label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between"
              >
                {selectedItem ? selectedItem.name : `Select an item...`}
                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <Command>
                <CommandInput
                  placeholder="Search items..."
                  className="h-9"
                  value={searchTerm}
                  onValueChange={setSearchTerm}
                />
                <CommandEmpty>No item found.</CommandEmpty>
                <CommandGroup>
                  <CommandList className="max-h-[300px]">
                    {isLoading && searchTerm ? (
                      <div className="flex items-center justify-center p-4">
                        <LogoSpinner className="mr-2 h-4 w-4" />
                        Loading...
                      </div>
                    ) : (
                      itemsToDisplay.map((item) => (
                        <CommandItem
                          key={item.id}
                          value={item.name}
                          onSelect={() => handleSelectItem(item)}
                        >
                          {item.name}
                          {item.has_special_attack && (
                            <Badge variant="secondary" className="ml-2">
                              Special
                            </Badge>
                          )}
                          {item.has_passive_effect && (
                            <Badge variant="outline" className="ml-2">
                              Passive
                            </Badge>
                          )}
                        </CommandItem>
                      ))
                    )}
                  </CommandList>
                  {isLoading && !searchTerm && (
                    <div className="flex items-center justify-center p-2">
                      <LogoSpinner className="mr-2 h-4 w-4" />
                    </div>
                  )}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Display the selected item stats */}
        {selectedItem && itemDetails?.combat_stats && (
          <div className="pt-2 space-y-2">
            <h4 className="text-sm font-semibold">Item Stats</h4>
            
            {/* Attack bonuses */}
            <div className="space-y-1">
              <h5 className="text-xs font-semibold">Attack Bonuses</h5>
              <div className="grid grid-cols-3 gap-x-2 gap-y-1">
                {Object.entries(itemDetails.combat_stats.attack_bonuses).map(([key, value]) => (
                  <div key={`attack-${key}`}>
                    <span className="text-xs text-muted-foreground">{key.charAt(0).toUpperCase() + key.slice(1)}:</span>{' '}
                    <span className="text-xs font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Defence bonuses */}
            {Object.keys(itemDetails.combat_stats.defence_bonuses).length > 0 && (
              <div className="space-y-1">
                <h5 className="text-xs font-semibold">Defence Bonuses</h5>
                <div className="grid grid-cols-3 gap-x-2 gap-y-1">
                  {Object.entries(itemDetails.combat_stats.defence_bonuses).map(([key, value]) => (
                    <div key={`defence-${key}`}>
                      <span className="text-xs text-muted-foreground">{key.charAt(0).toUpperCase() + key.slice(1)}:</span>{' '}
                      <span className="text-xs font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Other bonuses */}
            <div className="space-y-1">
              <h5 className="text-xs font-semibold">Other Bonuses</h5>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                {Object.entries(itemDetails.combat_stats.other_bonuses).map(([key, value]) => (
                  <div key={`other-${key}`}>
                    <span className="text-xs text-muted-foreground">{key.charAt(0).toUpperCase() + key.slice(1)}:</span>{' '}
                    <span className="text-xs font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Item passive effects */}
            {itemDetails.has_passive_effect && (
              <ItemPassiveEffects item={itemDetails} />
            )}

            {/* Item effects */}
            {(itemDetails.has_special_attack || (itemDetails.has_passive_effect && !itemDetails?.passive_effect_text)) && (
              <div className="space-y-1 mt-2">
                <h5 className="text-xs font-semibold">Effects</h5>
                {itemDetails.has_special_attack && itemDetails.special_attack && (
                  <div className="text-xs">
                    <span className="font-semibold">Special Attack:</span>{' '}
                    <span>{itemDetails.special_attack.substring(0, 150)}...</span>
                  </div>
                )}
                {itemDetails.has_passive_effect && itemDetails.passive_effect_text && (
                  <div className="text-xs">
                    <span className="font-semibold">Passive Effect:</span>{' '}
                    <span>{itemDetails.passive_effect_text.substring(0, 150)}...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
