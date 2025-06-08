import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleBox } from '@/components/ui/toggle-box';
import { Label } from '@/components/ui/label';
import { useCalculatorStore } from '@/store/calculator-store';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Define prayer and potion options for each combat style
const PRAYER_OPTIONS = {
  melee: [
    { value: '1', label: 'None', strength: 1, attack: 1 },
    { value: '1.05', label: '5% (Clarity of Thought / Burst of Strength)', strength: 1.05, attack: 1.05 },
    { value: '1.1', label: '10% (Improved Reflexes / Superhuman Strength)', strength: 1.1, attack: 1.1 },
    { value: '1.15', label: '15% (Incredible Reflexes / Ultimate Strength)', strength: 1.15, attack: 1.15 },
    { value: '1.18', label: '18% (Chivalry)', strength: 1.18, attack: 1.15 },
    { value: '1.23', label: '23% (Piety)', strength: 1.23, attack: 1.2 },
  ],
  ranged: [
    { value: '1', label: 'None', ranged: 1 },
    { value: '1.05', label: '5% (Sharp Eye)', ranged: 1.05 },
    { value: '1.1', label: '10% (Hawk Eye)', ranged: 1.1 },
    { value: '1.15', label: '15% (Eagle Eye)', ranged: 1.15 },
    { value: '1.18', label: '18% (Deadeye)', ranged: 1.18 },
    { value: '1.23', label: '23% (Rigour)', ranged: 1.23 },
  ],
  magic: [
    { value: '1', label: 'None', magic: 1 },
    { value: '1.05', label: '5% (Mystic Will)', magic: 1.05 },
    { value: '1.1', label: '10% (Mystic Lore)', magic: 1.1 },
    { value: '1.15', label: '15% (Mystic Might)', magic: 1.15 },
    { value: '1.18', label: '18% (Mystic Vigour)', magic: 1.18 },
    { value: '1.25', label: '25% (Augury)', magic: 1.25 },
  ],
};

const POTION_OPTIONS = {
  melee: [
    { value: '0', label: 'None', attack: 0, strength: 0 },
    { value: 'attack', label: 'Attack Potion', attack: 3, strength: 0, description: '+3 + 10% of level' },
    { value: 'strength', label: 'Strength Potion', attack: 0, strength: 3, description: '+3 + 10% of level' },
    { value: 'combat', label: 'Combat Potion', attack: 3, strength: 3, description: '+3 + 10% of level' },
    { value: 'super_attack', label: 'Super Attack', attack: 5, strength: 0, description: '+5 + 15% of level' },
    { value: 'super_strength', label: 'Super Strength', attack: 0, strength: 5, description: '+5 + 15% of level' },
    { value: 'super_combat', label: 'Super Combat', attack: 5, strength: 5, description: '+5 + 15% of level' },
    { value: 'zamorak_brew', label: 'Zamorak Brew', attack: 2, strength: 2, description: 'Attack: +2 + 20% of level\nStrength: +2 + 12% of level\nLowers Defence' },
  ],
  ranged: [
    { value: '0', label: 'None', ranged: 0 },
    { value: 'ranging_potion', label: 'Ranging Potion', ranged: 4, description: '+4 + 10% of level' },
    { value: 'bastion_potion', label: 'Bastion Potion', ranged: 4, description: '+4 + 10% of level\nSuper defence included' },
    { value: 'super_ranging', label: 'Super Ranging (NMZ)', ranged: 5, description: '+5 + 15% of level' },
  ],
  magic: [
    { value: '0', label: 'None', magic: 0 },
    { value: 'magic_potion', label: 'Magic Potion', magic: 4, description: '+4 (flat boost)' },
    { value: 'battlemage_potion', label: 'Battlemage Potion', magic: 4, description: '+4 (flat boost)\nSuper defence included' },
    { value: 'ancient_brew', label: 'Ancient Brew', magic: 2, description: '+2 + 5% of level\nRestores prayer points' },
    { value: 'forgotten_brew', label: 'Forgotten Brew', magic: 3, description: '+3 + 8% of level\nRestores prayer points' },
    { value: 'super_magic', label: 'Super Magic (NMZ)', magic: 5, description: '+5 + 15% of level' },
  ],
};

// Define preserve prayer option
const PRESERVE_OPTION = { value: 'preserve', label: 'Preserve', description: 'Boosted stats last 50% longer' };

export function PrayerPotionSelector({ className }: { className?: string }) {
  const { params, setParams } = useCalculatorStore();
  const combatStyle = params.combat_style;
  
  // Select appropriate store params based on combat style
  const [selectedPrayer, setSelectedPrayer] = useState('1');
  const [selectedPotion, setSelectedPotion] = useState('0');
  const [preserveActive, setPreserveActive] = useState(false);
  
  useEffect(() => {
    // Initialize prayer selection based on combat style and current store values
    if (combatStyle === 'melee') {
      const prayerValue = PRAYER_OPTIONS.melee.find(
        p => p.strength === params.strength_prayer && p.attack === params.attack_prayer
      )?.value || '1';
      setSelectedPrayer(prayerValue);
      
      // Initialize potion selection - this is an approximation as exact values are complex
      if (params.strength_boost >= 5 && params.attack_boost >= 5) {
        setSelectedPotion('super_combat');
      } else if (params.strength_boost >= 5) {
        setSelectedPotion('super_strength');
      } else if (params.attack_boost >= 5) {
        setSelectedPotion('super_attack');
      } else if (params.strength_boost >= 3 && params.attack_boost >= 3) {
        setSelectedPotion('combat');
      } else if (params.strength_boost >= 3) {
        setSelectedPotion('strength');
      } else if (params.attack_boost >= 3) {
        setSelectedPotion('attack');
      } else {
        setSelectedPotion('0');
      }
    } else if (combatStyle === 'ranged') {
      const prayerValue = PRAYER_OPTIONS.ranged.find(
        p => p.ranged === params.ranged_prayer
      )?.value || '1';
      setSelectedPrayer(prayerValue);
      
      // Initialize potion selection
      if (params.ranged_boost >= 5) {
        setSelectedPotion('super_ranging');
      } else if (params.ranged_boost >= 4) {
        setSelectedPotion('ranging_potion');
      } else {
        setSelectedPotion('0');
      }
    } else if (combatStyle === 'magic') {
      const prayerValue = PRAYER_OPTIONS.magic.find(
        p => p.magic === params.magic_prayer
      )?.value || '1';
      setSelectedPrayer(prayerValue);
      
      // Initialize potion selection
      if (params.magic_boost >= 5) {
        setSelectedPotion('super_magic');
      } else if (params.magic_boost >= 4) {
        setSelectedPotion('magic_potion');
      } else if (params.magic_boost >= 3) {
        setSelectedPotion('forgotten_brew');
      } else if (params.magic_boost >= 2) {
        setSelectedPotion('ancient_brew');
      } else {
        setSelectedPotion('0');
      }
    }
  }, [combatStyle, params]);
  
  // Handle prayer selection change
  const handlePrayerChange = (value: string) => {
    setSelectedPrayer(value);
    
    const prayerOption = PRAYER_OPTIONS[combatStyle].find(p => p.value === value);
    if (!prayerOption) return;

    if (combatStyle === 'melee' && 'strength' in prayerOption && 'attack' in prayerOption) {
      setParams({
        strength_prayer: prayerOption.strength,
        attack_prayer: prayerOption.attack
      });
    } else if (combatStyle === 'ranged' && 'ranged' in prayerOption) {
      setParams({
        ranged_prayer: prayerOption.ranged
      });
    } else if (combatStyle === 'magic' && 'magic' in prayerOption) {
      setParams({
        magic_prayer: prayerOption.magic
      });
    }
  };
  
  // Handle potion selection change
  const handlePotionChange = (value: string) => {
    setSelectedPotion(value);

    const potionOption = POTION_OPTIONS[combatStyle].find(p => p.value === value);
    if (!potionOption) return;

    // Calculate level-based boosts
    let attackBoost = 0;
    let strengthBoost = 0;
    let rangedBoost = 0;
    let magicBoost = 0;

    if (combatStyle === 'melee') {
      if (('attack' in potionOption) && (value === 'attack' || value === 'combat')) {
        attackBoost = potionOption.attack + Math.floor(params.attack_level * 0.1);
      } else if (('attack' in potionOption) && (value === 'super_attack' || value === 'super_combat')) {
        attackBoost = potionOption.attack + Math.floor(params.attack_level * 0.15);
      } else if (('attack' in potionOption) && value === 'zamorak_brew') {
        attackBoost = potionOption.attack + Math.floor(params.attack_level * 0.2);
      }

      if (('strength' in potionOption) && (value === 'strength' || value === 'combat')) {
        strengthBoost = potionOption.strength + Math.floor(params.strength_level * 0.1);
      } else if (('strength' in potionOption) && (value === 'super_strength' || value === 'super_combat')) {
        strengthBoost = potionOption.strength + Math.floor(params.strength_level * 0.15);
      } else if (('strength' in potionOption) && value === 'zamorak_brew') {
        strengthBoost = potionOption.strength + Math.floor(params.strength_level * 0.12);
      }

      setParams({
        attack_boost: attackBoost,
        strength_boost: strengthBoost
      });

    } else if (combatStyle === 'ranged') {
      if (('ranged' in potionOption) && (value === 'ranging_potion' || value === 'bastion_potion')) {
        rangedBoost = potionOption.ranged + Math.floor(params.ranged_level * 0.1);
      } else if (('ranged' in potionOption) && value === 'super_ranging') {
        rangedBoost = potionOption.ranged + Math.floor(params.ranged_level * 0.15);
      }

      setParams({
        ranged_boost: rangedBoost
      });

    } else if (combatStyle === 'magic') {
      if (('magic' in potionOption) && (value === 'magic_potion' || value === 'battlemage_potion')) {
        magicBoost = potionOption.magic;
      } else if (('magic' in potionOption) && value === 'ancient_brew') {
        magicBoost = potionOption.magic + Math.floor(params.magic_level * 0.05);
      } else if (('magic' in potionOption) && value === 'forgotten_brew') {
        magicBoost = potionOption.magic + Math.floor(params.magic_level * 0.08);
      } else if (('magic' in potionOption) && value === 'super_magic') {
        magicBoost = potionOption.magic + Math.floor(params.magic_level * 0.15);
      }

      setParams({
        magic_boost: magicBoost
      });
    }
  };
  
  // Handle preserve toggle
  const handlePreserveToggle = (checked: boolean) => {
    setPreserveActive(checked);
    // In a real implementation, this would affect the boost decay rate
    // But since that's handled by the game server, we're just toggling the state
  };
  
  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center">
          Prayer & Potion Selection
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 ml-2 cursor-help text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="w-80">
                <p>Select prayers and potions to automatically update your stat boosts. 
                Values are calculated based on your base levels.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        <CardDescription>
          Choose prayers and potions to boost your combat stats
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="prayer" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="prayer">Prayers</TabsTrigger>
            <TabsTrigger value="potion">Potions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="prayer" className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="prayer-select">Combat Prayer</Label>
                <Select
                  value={selectedPrayer}
                  onValueChange={handlePrayerChange}
                >
                  <SelectTrigger id="prayer-select" className="w-[250px]">
                    <SelectValue placeholder="Select prayer" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRAYER_OPTIONS[combatStyle].map((prayer) => (
                      <SelectItem key={prayer.value} value={prayer.value}>
                        {prayer.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-4 pt-2">
                <ToggleBox
                  id="preserve"
                  pressed={preserveActive}
                  onPressedChange={handlePreserveToggle}
                />
                <div className="grid gap-1.5">
                  <Label htmlFor="preserve">
                    {PRESERVE_OPTION.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {PRESERVE_OPTION.description}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="potion" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="potion-select">Combat Potion</Label>
              <Select
                value={selectedPotion}
                onValueChange={handlePotionChange}
              >
                <SelectTrigger id="potion-select" className="w-full">
                  <SelectValue placeholder="Select potion" />
                </SelectTrigger>
                <SelectContent>
                  {POTION_OPTIONS[combatStyle].map((potion) => (
                    <SelectItem key={potion.value} value={potion.value}>
                      {potion.label}
                      {potion.description && (
                        <span className="text-muted-foreground ml-2 text-xs">
                          ({potion.description.split('\n')[0]})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedPotion !== '0' && (
                <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-md mt-2">
                  <p className="text-sm font-medium">Effect:</p>
                  <p className="text-xs text-muted-foreground whitespace-pre-line">
                    {POTION_OPTIONS[combatStyle].find(p => p.value === selectedPotion)?.description || ''}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Display current boost summary */}
        <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-md">
          <h4 className="font-medium text-sm mb-2">Current Boosts:</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {combatStyle === 'melee' && (
              <>
                <div className="flex justify-between">
                  <span>Attack Prayer:</span>
                  <span className="font-medium">+{((params.attack_prayer * 100) - 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Strength Prayer:</span>
                  <span className="font-medium">+{((params.strength_prayer * 100) - 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Attack Potion:</span>
                  <span className="font-medium">+{params.attack_boost}</span>
                </div>
                <div className="flex justify-between">
                  <span>Strength Potion:</span>
                  <span className="font-medium">+{params.strength_boost}</span>
                </div>
              </>
            )}
            
            {combatStyle === 'ranged' && (
              <>
                <div className="flex justify-between">
                  <span>Ranged Prayer:</span>
                  <span className="font-medium">+{((params.ranged_prayer * 100) - 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Ranged Potion:</span>
                  <span className="font-medium">+{params.ranged_boost}</span>
                </div>
              </>
            )}
            
            {combatStyle === 'magic' && (
              <>
                <div className="flex justify-between">
                  <span>Magic Prayer:</span>
                  <span className="font-medium">+{((params.magic_prayer * 100) - 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Magic Potion:</span>
                  <span className="font-medium">+{params.magic_boost}</span>
                </div>
              </>
            )}
            
            {preserveActive && (
              <div className="col-span-2 mt-2 text-green-600 dark:text-green-400 text-xs">
                Preserve active: Boosts last 50% longer
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}