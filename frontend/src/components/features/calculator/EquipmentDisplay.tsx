'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCalculatorStore } from '@/store/calculator-store';
import { Item } from '@/types/calculator';

// Equipment slot layout
const EQUIPMENT_SLOTS = {
  head: { name: 'Head', position: 'top-center', icon: '🪖' },
  cape: { name: 'Cape', position: 'left-top', icon: '🧣' },
  neck: { name: 'Neck', position: 'center-top-2', icon: '📿' },
  ammo: { name: 'Ammo', position: 'right-top-2', icon: '🏹' },
  mainhand: { name: 'Weapon', position: 'left-middle', icon: '⚔️' },
  offhand: { name: 'Shield', position: 'right-middle', icon: '🛡️' },
  body: { name: 'Body', position: 'center-middle', icon: '👕' },
  legs: { name: 'Legs', position: 'center-bottom', icon: '👖' },
  hands: { name: 'Hands', position: 'left-bottom', icon: '🧤' },
  feet: { name: 'Feet', position: 'bottom-center', icon: '👢' },
  ring: { name: 'Ring', position: 'right-bottom', icon: '💍' },
  '2h': { name: 'Two-Handed', position: 'left-middle-2h', icon: '🗡️' },
};

const POSITION_TO_GRID: Record<string, string> = {
  'top-center': 'col-start-2 row-start-1',
  'left-top': 'col-start-1 row-start-2',
  'right-top': 'col-start-3 row-start-1',
  'center-top-2': 'col-start-2 row-start-2',
  'right-top-2': 'col-start-3 row-start-2',
  'left-middle': 'col-start-1 row-start-3',
  'left-middle-2h': 'col-start-1 row-span-2 row-start-3',
  'right-middle': 'col-start-3 row-start-3',
  'center-middle': 'col-start-2 row-start-3',
  'center-bottom': 'col-start-2 row-start-4',
  'left-bottom': 'col-start-1 row-start-5',
  'bottom-center': 'col-start-2 row-start-5',
  'right-bottom': 'col-start-3 row-start-5',
};

interface EquipmentDisplayProps {
  loadout: Record<string, Item | null>;
  totals: Record<string, number>;
}

export function EquipmentDisplay({ loadout, totals }: EquipmentDisplayProps) {
  const { params, setParams, bossLocked } = useCalculatorStore();
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedAttackType, setSelectedAttackType] = useState<string>('slash');
  const [selectedAttackStyle, setSelectedAttackStyle] = useState<string>('aggressive');
  const combatStyle = params.combat_style;
  
  // Current weapon
  const currentWeapon = loadout['2h'] || loadout['mainhand'] || null;
  
  // Update attack type and style when combat style changes
  useEffect(() => {
    if (combatStyle === 'melee') {
      if (currentWeapon) {
        // Find the primary attack type for the weapon
        setSelectedAttackType(determinePrimaryAttackType(currentWeapon));
      } else {
        setSelectedAttackType('slash');
      }
      
      setSelectedAttackStyle('aggressive'); // Default to aggressive for melee
    } 
    else if (combatStyle === 'ranged') {
      setSelectedAttackType('ranged');
      setSelectedAttackStyle('rapid'); // Default to rapid for ranged
    } 
    else if (combatStyle === 'magic') {
      setSelectedAttackType('magic');
      setSelectedAttackStyle('accurate'); // Default to accurate for magic
    }
  }, [combatStyle, currentWeapon]);
  
  // Update attack params when attack type changes

    // Update attack style bonus and speed when style changes
    useEffect(() => {
    // Get the attack bonus
    let attackStyleBonusAttack = 0;
    let attackStyleBonusStrength = 0;

    if (combatStyle === 'melee') {
        if (selectedAttackStyle === 'accurate') {
        attackStyleBonusAttack = 3;
        } else if (selectedAttackStyle === 'aggressive') {
        attackStyleBonusStrength = 3;
        } else if (selectedAttackStyle === 'controlled') {
        attackStyleBonusAttack = 1;
        attackStyleBonusStrength = 1;
        }
    } else if (combatStyle === 'ranged') {
        if (selectedAttackStyle === 'accurate') {
        attackStyleBonusAttack = 3;
        }
        // Ranged has no strength style bonus typically
    } else if (combatStyle === 'magic') {
        // For magic, accurate gives attack bonus
        if (selectedAttackStyle === 'accurate') {
        attackStyleBonusAttack = 3;
        }
        // Magic has no strength style bonus typically
    }
    
    // Update attack speed based on weapon and style
    let attackSpeed = 2.4; // Default attack speed (4 ticks)
    
    if (currentWeapon?.combat_stats?.attack_speed) {
        // Convert ticks to seconds (1 tick = 0.6 seconds)
        attackSpeed = currentWeapon.combat_stats.attack_speed * 0.6;
    }
    
    // Adjust for Rapid style
    if (combatStyle === 'ranged' && selectedAttackStyle === 'rapid') {
        attackSpeed -= 0.6;
    }
    
    // Update params - IMPORTANT: Always include these for magic too!
    setParams({
        attack_style_bonus_attack: attackStyleBonusAttack,
        attack_style_bonus_strength: attackStyleBonusStrength,
        attack_speed: attackSpeed
    });
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEBUG] Selected attack style:', selectedAttackStyle);
      console.log('[DEBUG] Style bonus (attack):', attackStyleBonusAttack);
      console.log('[DEBUG] Style bonus (strength):', attackStyleBonusStrength);
      console.log('[DEBUG] Attack speed:', attackSpeed);
    }
    }, [selectedAttackStyle, setParams, currentWeapon, combatStyle]);
  
  // Update attack style bonus and speed when style changes
  useEffect(() => {
    // Get the attack bonus
    let attackStyleBonusAttack = 0;
    let attackStyleBonusStrength = 0;

    if (selectedAttackStyle === 'accurate') {
    attackStyleBonusAttack = 3;
    } else if (selectedAttackStyle === 'aggressive') {
    attackStyleBonusStrength = 3;
    } else if (selectedAttackStyle === 'controlled') {
    attackStyleBonusAttack = 1;
    attackStyleBonusStrength = 1;
    }
    
    // Update attack speed based on weapon and style
    let attackSpeed = 2.4; // Default attack speed (4 ticks)
    
    if (currentWeapon?.combat_stats?.attack_speed) {
      // Convert ticks to seconds (1 tick = 0.6 seconds)
      attackSpeed = currentWeapon.combat_stats.attack_speed * 0.6;
    }
    
    // Adjust for Rapid style
    if (selectedAttackStyle === 'rapid') {
      attackSpeed -= 0.6;
    }
    
    // Update params
    setParams({
    attack_style_bonus_attack: attackStyleBonusAttack,
    attack_style_bonus_strength: attackStyleBonusStrength,
    attack_speed: attackSpeed
    });
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEBUG] Selected attack style:', selectedAttackStyle);
      console.log('[DEBUG] Style bonus (attack):', attackStyleBonusAttack);
      console.log('[DEBUG] Style bonus (strength):', attackStyleBonusStrength);
      console.log('[DEBUG] Attack speed:', attackSpeed);
    }
  }, [selectedAttackStyle, setParams, currentWeapon]);
  
  // Helper to determine the primary attack type for a weapon
  const determinePrimaryAttackType = (weapon: Item): string => {
    if (!weapon.combat_stats?.attack_bonuses) return 'slash';
    
    const { stab = 0, slash = 0, crush = 0 } = weapon.combat_stats.attack_bonuses;
    
    // Return the attack type with the highest bonus
    if (stab >= slash && stab >= crush) return 'stab';
    if (slash >= stab && slash >= crush) return 'slash';
    if (crush >= stab && crush >= slash) return 'crush';
    
    return 'slash';
  };
  
  // Get possible attack types based on weapon and combat style
  const getPossibleAttackTypes = () => {
    if (combatStyle === 'melee') {
      if (!currentWeapon) return ['stab', 'slash', 'crush'];
      
      // Check which attack types the weapon has bonuses for
      const attackTypes = [];
      const { stab = 0, slash = 0, crush = 0 } = currentWeapon.combat_stats?.attack_bonuses || {};
      
      if (stab > 0) attackTypes.push('stab');
      if (slash > 0) attackTypes.push('slash');
      if (crush > 0) attackTypes.push('crush');
      
      // Default to all types if no bonuses found
      return attackTypes.length > 0 ? attackTypes : ['stab', 'slash', 'crush'];
    } 
    else if (combatStyle === 'ranged') {
      return ['ranged'];
    } 
    else {
      return ['magic'];
    }
  };
  
  // Get possible attack styles based on combat style
  const getPossibleAttackStyles = () => {
    if (combatStyle === 'melee') {
      // Some weapons have controlled, some don't
      const hasControlled = currentWeapon && 
        ['sword', 'spear', 'halberd', 'whip'].some(type => 
          currentWeapon.name.toLowerCase().includes(type)
        );
        
      return hasControlled 
        ? ['accurate', 'aggressive', 'controlled', 'defensive']
        : ['accurate', 'aggressive', 'defensive'];
    } 
    else if (combatStyle === 'ranged') {
      return ['accurate', 'rapid', 'longrange'];
    } 
    else {
      return ['accurate', 'defensive'];
    }
  };
  
  // Get attack style description
  const getStyleDescription = (style: string): string => {
    if (style === 'accurate') {
      if (combatStyle === 'melee') return '+3 Attack';
      if (combatStyle === 'ranged') return '+3 Ranged';
      if (combatStyle === 'magic') return '+3 Magic';
    }
    else if (style === 'aggressive') return '+3 Strength';
    else if (style === 'controlled') return '+1 to all';
    else if (style === 'defensive') return '+3 Defence';
    else if (style === 'rapid') return 'Faster attack speed';
    else if (style === 'longrange') return '+3 Defence, increased range';
    
    return '';
  };

  // Get the actual attack bonus for the selected type
  const getAttackBonusForType = (): number => {
    if (combatStyle === 'melee') {
      // Important: Use the specific selected attack type
      return totals[selectedAttackType] || 0;
    } else if (combatStyle === 'ranged') {
      return totals.ranged || 0;
    } else {
      return totals.magic || 0;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Character Preview</CardTitle>
          <CardDescription>Visual representation of your equipment</CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          <div className="grid grid-cols-3 grid-rows-5 gap-2 justify-items-center">
            {Object.entries(EQUIPMENT_SLOTS).map(([slotKey, slotData]) => {
              const item = loadout[slotKey];
              
              // Skip mainhand/offhand if 2h is equipped
              if ((slotKey === 'mainhand' || slotKey === 'offhand') && loadout['2h']) return null;
              
              const gridClass = POSITION_TO_GRID[slotData.position];
              
              return (
                <div
                  key={slotKey}
                  className={`${gridClass} flex flex-col items-center justify-center h-16 w-16 border rounded-md bg-gray-50 dark:bg-gray-800 p-1`}
                >
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center justify-center w-full h-full cursor-default">
                          <div className="text-2xl">{item ? '⚔️' : slotData.icon}</div>
                          <div className="text-xs truncate w-full text-center">
                            {item ? item.name : slotData.name}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {item ? (
                          <>
                            <p className="font-bold">{item.name}</p>
                            {item.combat_stats && (
                              <div className="text-xs mt-1">
                                {Object.entries(item.combat_stats.attack_bonuses).map(
                                  ([key, value]) =>
                                    value !== 0 && <p key={key}>{key}: {value}</p>
                                )}
                                {Object.entries(item.combat_stats.other_bonuses).map(
                                  ([key, value]) =>
                                    value !== 0 && <p key={key}>{key}: {value}</p>
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <p>No item equipped</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              );
            })}
            <div className="col-start-2 row-start-2 flex items-center justify-center h-16 w-16">
              {/* <div className="h-12 w-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                👤
              </div> */}
            </div>
          </div>

          {/* === Attack Style Section === */}
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Attack Style</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 cursor-help text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Select your attack type and style to optimize your DPS.</p>
                    {bossLocked && combatStyle === 'melee' && (
                      <p className="text-xs mt-1 text-green-500">
                        Attack type will be used to determine boss defense.
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {/* Attack Type Selector (for melee) */}
            {combatStyle === 'melee' && (
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Attack Type</label>
                <Tabs 
                  value={selectedAttackType} 
                  onValueChange={setSelectedAttackType}
                  className="w-full"
                >
                  <TabsList className="grid grid-cols-3">
                    {getPossibleAttackTypes().map(type => (
                      <TabsTrigger key={type} value={type} className="capitalize">
                        {type}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
                {bossLocked && (
                  <p className="text-xs text-amber-500 mt-1">
                    Using {selectedAttackType} attack against boss&rsquo;s {selectedAttackType} defense
                  </p>
                )}
              </div>
            )}
            
            {/* Attack Style Selector - NOW USING TABS */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Combat Style</label>
              <Tabs 
                value={selectedAttackStyle} 
                onValueChange={setSelectedAttackStyle}
                className="w-full"
              >
                <TabsList className={`grid ${getPossibleAttackStyles().length === 2 ? 'grid-cols-2' : getPossibleAttackStyles().length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
                  {getPossibleAttackStyles().map(style => (
                    <TabsTrigger key={style} value={style} className="capitalize text-xs">
                      {style}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              
              {/* Style description below tabs */}
              <div className="text-xs text-muted-foreground">
                {getStyleDescription(selectedAttackStyle)}
              </div>
            </div>
            
            {/* Style Information */}
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-md">
              <h4 className="text-sm font-medium mb-2">Current Combat Style:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Attack Type:</span>{' '}
                  <span className="font-medium capitalize">{selectedAttackType}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Style:</span>{' '}
                  <span className="font-medium capitalize">{selectedAttackStyle}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Bonus:</span>{' '}
                  <span className="font-medium">{getStyleDescription(selectedAttackStyle)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Speed:</span>{' '}
                  <span className="font-medium">
                    {params.attack_speed.toFixed(1)}s
                    {selectedAttackStyle === 'rapid' && (
                      <span className="text-green-600 dark:text-green-400 ml-1">(Faster)</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* === Total Bonuses === */}
          <div className="mt-4 space-y-2 pt-2 border-t">
            <h3 className="text-sm font-semibold">Total Bonuses</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {combatStyle === 'melee' && (
                <>
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded">
                    <div className="text-xs text-muted-foreground capitalize">{selectedAttackType} Attack</div>
                    <div className="font-bold">{getAttackBonusForType()}</div>
                  </div>
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded">
                    <div className="text-xs text-muted-foreground">Strength</div>
                    <div className="font-bold">{totals.strength}</div>
                  </div>
                </>
              )}

              {combatStyle === 'ranged' && (
                <>
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded">
                    <div className="text-xs text-muted-foreground">Ranged Attack</div>
                    <div className="font-bold">{totals.ranged}</div>
                  </div>
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded">
                    <div className="text-xs text-muted-foreground">Ranged Strength</div>
                    <div className="font-bold">{totals['ranged strength']}</div>
                  </div>
                </>
              )}

              {combatStyle === 'magic' && (
                <>
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded">
                    <div className="text-xs text-muted-foreground">Magic Attack</div>
                    <div className="font-bold">{totals.magic}</div>
                  </div>
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded">
                    <div className="text-xs text-muted-foreground">Magic Damage</div>
                    <div className="font-bold">{totals['magic damage percent']}%</div>
                  </div>
                </>
              )}
              
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded">
            <div className="text-xs text-muted-foreground">Style Bonus (Attack)</div>
            <div className="font-bold">{params.attack_style_bonus_attack}</div>
            </div>
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded">
            <div className="text-xs text-muted-foreground">Style Bonus (Strength)</div>
            <div className="font-bold">{params.attack_style_bonus_strength}</div>
            </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(totals).map(([key, value]) => {
                    if (value === 0) return null;
                    return (
                    <div key={key} className="p-2 bg-slate-100 dark:bg-slate-800 rounded">
                        <div className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</div>
                        <div className="font-bold">
                        {key.includes('percent') ? `${value}%` : `${value}`}
                        </div>
                    </div>
                    );
                })}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}