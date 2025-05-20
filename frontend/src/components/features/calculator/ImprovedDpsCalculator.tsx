'use client';
import { useState, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RotateCcw, 
  Info, 
  Calculator, 
  Sword, 
  Target, 
  Zap,
  Shield 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { calculatorApi } from '@/services/api';
import { useCalculatorStore } from '@/store/calculator-store';
import { CombatStyle, CalculatorParams, Item, BossForm } from '@/app/types/calculator';
import { BossSelector } from './BossSelector';
import { DirectBossSelector } from './DirectBossSelector';
import { CombinedEquipmentDisplay } from './CombinedEquipmentDisplay';
import { DpsComparison } from './DpsComparison';
import { PrayerPotionSelector } from './PrayerPotionSelector'; 
import { MeleeForm } from './MeleeForm';
import { RangedForm } from './RangedForm';
import { MagicForm } from './MagicForm';
import calculatePassiveEffectBonuses from './PassiveEffectCalculator';
import PassiveEffectsDisplay from './PassiveEffectsDisplay';
import { DefenceReductionPanel } from './DefenceReductionPanel';
import { PresetSelector } from './PresetSelector';

/**
 * ImprovedDpsCalculator - A redesigned OSRS DPS Calculator with better UI flow
 * This component improves on the original by:
 * - Creating a consistent layout with proper alignment
 * - Balancing the height between columns
 * - Using a logical grouping of related components
 * - Providing better visual hierarchy and readability
 */
export function ImprovedDpsCalculator() {
  const { toast } = useToast();
  const params = useCalculatorStore((s) => s.params);
  const results = useCalculatorStore((s) => s.results);
  const setResults = useCalculatorStore((s) => s.setResults);
  const switchCombatStyle = useCalculatorStore((s) => s.switchCombatStyle);
  const resetParams = useCalculatorStore((s) => s.resetParams);
  const resetLocks = useCalculatorStore((s) => s.resetLocks);
  
  // Track equipment loadout and boss form for passive effects
  const [currentLoadout, setCurrentLoadout] = useState({});
  const [currentBossForm, setCurrentBossForm] = useState(null);
  const [appliedPassiveEffects, setAppliedPassiveEffects] = useState(null);

  const calculateEffects = useCallback(() => {
    return calculatePassiveEffectBonuses(
      params,
      currentLoadout,
      currentBossForm
    );
  }, [params, currentLoadout, currentBossForm]); 

  useEffect(() => {
    const effects = calculateEffects();
    if (effects.isApplicable) {
      setAppliedPassiveEffects(effects);
    } else {
      setAppliedPassiveEffects(null);
    }
  }, [calculateEffects]);

  const calculateMutation = useMutation({
    mutationFn: (calculationParams) => {
      console.log('[DEBUG] DPS Calculation using parameters:', calculationParams);

      // Ensure we have a valid target_defence_type for melee combat
      if (calculationParams.combat_style === 'melee') {
        // Set default attack type if not present
        const attackType = 'attack_type' in calculationParams 
          ? calculationParams.attack_type || 'slash' 
          : 'slash';
        
        // Derive the target_defence_type from the attack_type
        if (!calculationParams.target_defence_type) {
          calculationParams.target_defence_type = `defence_${attackType}`;
        }
        
        // Get the appropriate defense value based on the attack type
        if (currentBossForm) {
          let targetDefenceBonus = calculationParams.target_defence_bonus;
          
          // Look for the corresponding defense property in the boss form
          if (attackType === 'stab' && currentBossForm.defence_stab !== undefined) {
            targetDefenceBonus = currentBossForm.defence_stab;
          } else if (attackType === 'slash' && currentBossForm.defence_slash !== undefined) {
            targetDefenceBonus = currentBossForm.defence_slash;
          } else if (attackType === 'crush' && currentBossForm.defence_crush !== undefined) {
            targetDefenceBonus = currentBossForm.defence_crush;
          }
          
          calculationParams.target_defence_bonus = targetDefenceBonus;
        }
      } else if (calculationParams.combat_style === 'ranged') {
        // For ranged, we use the ranged defense values
        if (!calculationParams.target_defence_type) {
          calculationParams.target_defence_type = 'defence_ranged_standard';
        }
      } else if (calculationParams.combat_style === 'magic') {
        // For magic, we use the magic defense values
        if (!calculationParams.target_defence_type) {
          calculationParams.target_defence_type = 'defence_magic';
        }
      }
      
      return calculatorApi.calculateDps(calculationParams);
    },
    onSuccess: (data) => {
      setResults(data);
      toast.success(`DPS Calculated: Max hit: ${data.max_hit}, DPS: ${data.dps.toFixed(2)}`);
    },
    onError: (error) => {
      toast.error('Calculation Failed: There was an error calculating DPS.');
      console.error('Calculation error:', error);
    },
  });

  const handleTabChange = (value) => {
    setActiveTab(value);
    switchCombatStyle(value);
    toast.info(`Switched to ${value} combat style`);
  };

  const [activeTab, setActiveTab] = useState('melee');

  useEffect(() => {
    const actual = useCalculatorStore.getState().params.combat_style;
    if (actual !== activeTab) {
      setActiveTab(actual);
    }
  }, [activeTab]);

  const sanitizeParams = (params) => {
    const { selected_spell, ...cleaned } = params;

    // Ensure target_defence_type is properly set
    if (!cleaned.target_defence_type) {
      if (params.combat_style === 'melee') {
        cleaned.target_defence_type = `defence_${cleaned.attack_type || 'slash'}`;
      } else if (params.combat_style === 'ranged') {
        cleaned.target_defence_type = 'defence_ranged_standard';
      } else if (params.combat_style === 'magic') {
        cleaned.target_defence_type = 'defence_magic';
      }
    }

    if (params.combat_style === 'magic') {
      delete cleaned.attack_style_bonus_attack;
      delete cleaned.attack_style_bonus_strength;

      // Ensure all numbers are actually numbers (not strings from form/select)
      cleaned.magic_level = Number(cleaned.magic_level);
      cleaned.magic_boost = Number(cleaned.magic_boost);
      cleaned.magic_prayer = Number(cleaned.magic_prayer);
      cleaned.base_spell_max_hit = Number(cleaned.base_spell_max_hit);
      cleaned.magic_attack_bonus = Number(cleaned.magic_attack_bonus);
      cleaned.magic_damage_bonus = Number(cleaned.magic_damage_bonus);
      cleaned.target_magic_level = Number(cleaned.target_magic_level);
      cleaned.target_magic_defence = Number(cleaned.target_magic_defence);
      cleaned.attack_speed = Number(cleaned.attack_speed);
    }

    return cleaned;
  };

  const handleCalculate = useCallback(() => {
    const clean = sanitizeParams(params);
    
    // Check for Twisted Bow
    if (currentLoadout) {
      const twistedBowEquipped = 
        (currentLoadout['2h'] && currentLoadout['2h'].name.toLowerCase().includes('twisted bow')) ||
        (currentLoadout['mainhand'] && currentLoadout['mainhand'].name.toLowerCase().includes('twisted bow'));
        
      if (twistedBowEquipped && params.combat_style === 'ranged') {
        clean.weapon_name = "twisted bow";

        if (currentBossForm?.magic_level) {
          clean.target_magic_level = currentBossForm.magic_level;
        }

        clean.ranged_attack_bonus = params.ranged_attack_bonus;
        clean.ranged_strength_bonus = params.ranged_strength_bonus;
      }
      
      // Handle Tumeken's Shadow
      const tumekenShadowEquipped = 
        (currentLoadout['2h'] && currentLoadout['2h'].name.toLowerCase().includes('tumeken')) ||
        (currentLoadout['mainhand'] && currentLoadout['mainhand'].name.toLowerCase().includes('tumeken'));
        
      if (tumekenShadowEquipped && params.combat_style === 'magic') {
        clean.shadow_bonus = 0.5;
      }
    }
    
    calculateMutation.mutate(clean);
  }, [params, currentLoadout, currentBossForm, calculateMutation]);

  const handleReset = () => {
    resetParams();
    resetLocks();
    setResults(null);
    setAppliedPassiveEffects(null);
    setCurrentLoadout({});
    setCurrentBossForm(null);
    toast.success('Calculator reset to defaults');
  };

  // Function to handle equipment loadout updates
  const handleEquipmentUpdate = (loadout) => {
    setCurrentLoadout(loadout);
  };

  // Function to handle boss selection updates
  const handleBossUpdate = (bossForm) => {
    setCurrentBossForm(bossForm);
  };

  const dpsTriggers = JSON.stringify({
    combat_style: params.combat_style,
    attack_type: params.attack_type,
    attack_style_bonus_attack: params.attack_style_bonus_attack,
    attack_style_bonus_strength: params.attack_style_bonus_strength,
    attack_speed: params.attack_speed,
    melee_attack_bonus: params.melee_attack_bonus,
    ranged_attack_bonus: params.ranged_attack_bonus,
    magic_attack_bonus: params.magic_attack_bonus,
    selected_spell: params.selected_spell,
    base_spell_max_hit: params.base_spell_max_hit,
    boss_id: currentBossForm?.id,
    weapon_id: currentLoadout['2h']?.id || currentLoadout['mainhand']?.id,
  });

useEffect(() => {
    if (!params || !currentBossForm || Object.keys(currentLoadout).length === 0) return;

    const shouldAutoCalculate =
        currentBossForm && currentLoadout && !results;

    if (shouldAutoCalculate) {
        handleCalculate();
    }
    }, [params.combat_style, currentBossForm?.id, Object.keys(currentLoadout).join(','), results]);


  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 pb-16"> {/* Added significant bottom padding */}
      {/* Main calculator header card */}
      <Card className="w-full bg-card border border-border shadow-md">
        <CardHeader className="border-b border-border pb-4 flex flex-row justify-between items-center">

        </CardHeader>
        
        <CardContent className="pt-6">
          <Alert className="mb-6 bg-muted/40">
            <Info className="h-5 w-5 mr-2 text-primary" />
            <AlertDescription>
              Select your combat style, equipment, prayers, and target to calculate optimal DPS setup.
            </AlertDescription>
          </Alert>
          
          {/* Combat Style Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="w-full mb-6"
          >
            <TabsList className="grid grid-cols-4 mb-6">
              <TabsTrigger value="melee" className="flex items-center justify-center">
                <Sword className="h-4 w-4 mr-2" />
                Melee
              </TabsTrigger>
              <TabsTrigger value="ranged" className="flex items-center justify-center">
                <Target className="h-4 w-4 mr-2" />
                Ranged
              </TabsTrigger>
              <TabsTrigger value="magic" className="flex items-center justify-center">
                <Zap className="h-4 w-4 mr-2" />
                Magic
              </TabsTrigger>
            <Button variant="outline" className="flex items-center justify-center" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset All
            </Button>
            </TabsList>

            <TabsContent value="melee">
              <MeleeForm />
            </TabsContent>
            <TabsContent value="ranged">
              <RangedForm />
            </TabsContent>
            <TabsContent value="magic">
              <MagicForm />
            </TabsContent>

            <div className="mt-6 flex justify-center">
              <Button 
                onClick={handleCalculate} 
                disabled={calculateMutation.isPending}
                className="w-full max-w-md text-base py-2"
              >
                {calculateMutation.isPending ? 'Calculating...' : 'Calculate DPS'}
              </Button>
            </div>
          </Tabs>
          
          {/* Results Section */}
          {results && (
            <div className="mt-8 space-y-4">
              <h2 className="text-xl font-bold border-b pb-2 flex items-center section-heading">
                <Calculator className="h-5 w-5 mr-2 text-primary" />
                Calculation Results
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-muted/30 border">
                  <CardContent className="pt-6">
                    <div className="text-sm font-medium text-muted-foreground">DPS</div>
                    <div className="text-3xl font-bold text-primary">{results.dps.toFixed(2)}</div>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30 border">
                  <CardContent className="pt-6">
                    <div className="text-sm font-medium text-muted-foreground">Max Hit</div>
                    <div className="text-3xl font-bold text-primary">{results.max_hit}</div>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30 border">
                  <CardContent className="pt-6">
                    <div className="text-sm font-medium text-muted-foreground">Hit Chance</div>
                    <div className="text-3xl font-bold text-primary">{(results.hit_chance * 100).toFixed(1)}%</div>
                  </CardContent>
                </Card>
              </div>

              {/* Display passive effect bonuses if applied */}
              {appliedPassiveEffects && appliedPassiveEffects.isApplicable && (
                <Card className="bg-muted/30 border mt-4">
                  <CardContent className="pt-6">
                    <h3 className="text-base font-medium mb-2">Applied Passive Effects</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {appliedPassiveEffects.accuracy !== 1.0 && (
                        <div className="p-3 bg-muted/50 rounded-md">
                          <span className="text-sm text-muted-foreground">Accuracy Bonus:</span>{' '}
                          <span className="font-medium text-green-500">
                            +{((appliedPassiveEffects.accuracy - 1) * 100).toFixed(1)}%
                          </span>
                        </div>
                      )}
                      {appliedPassiveEffects.damage !== 1.0 && (
                        <div className="p-3 bg-muted/50 rounded-md">
                          <span className="text-sm text-muted-foreground">Damage Bonus:</span>{' '}
                          <span className="font-medium text-green-500">
                            +{((appliedPassiveEffects.damage - 1) * 100).toFixed(1)}%
                          </span>
                        </div>
                      )}
                      {appliedPassiveEffects.maxHit > 0 && (
                        <div className="p-3 bg-muted/50 rounded-md">
                          <span className="text-sm text-muted-foreground">Max Hit Bonus:</span>{' '}
                          <span className="font-medium text-green-500">
                            +{appliedPassiveEffects.maxHit}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Calculation debug info */}
              <Card className="bg-muted/30 border mt-4">
                <CardContent className="text-sm space-y-1">
                  {params.combat_style === 'melee' && (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div className="p-2 bg-muted/40 rounded-md">
                          <div className="text-xs text-muted-foreground">Effective Strength</div>
                          <div className="font-medium">{results.effective_str}</div>
                        </div>
                        <div className="p-2 bg-muted/40 rounded-md">
                          <div className="text-xs text-muted-foreground">Strength Bonus</div>
                          <div className="font-medium">{params.melee_strength_bonus}</div>
                        </div>
                        <div className="p-2 bg-muted/40 rounded-md">
                          <div className="text-xs text-muted-foreground">Max Hit</div>
                          <div className="font-medium">{results.max_hit}</div>
                        </div>
                        <div className="p-2 bg-muted/40 rounded-md">
                          <div className="text-xs text-muted-foreground">Effective Attack</div>
                          <div className="font-medium">{results.effective_atk}</div>
                        </div>
                        <div className="p-2 bg-muted/40 rounded-md">
                          <div className="text-xs text-muted-foreground">Attack Bonus</div>
                          <div className="font-medium">{params.melee_attack_bonus}</div>
                        </div>
                        <div className="p-2 bg-muted/40 rounded-md">
                          <div className="text-xs text-muted-foreground">Attack Roll</div>
                          <div className="font-medium">{results.attack_roll}</div>
                        </div>
                        <div className="p-2 bg-muted/40 rounded-md">
                          <div className="text-xs text-muted-foreground">Defence Roll</div>
                          <div className="font-medium">{results.defence_roll}</div>
                        </div>
                        <div className="p-2 bg-muted/40 rounded-md">
                          <div className="text-xs text-muted-foreground">Hit Chance</div>
                          <div className="font-medium">{(results.hit_chance * 100).toFixed(2)}%</div>
                        </div>
                        <div className="p-2 bg-muted/40 rounded-md">
                          <div className="text-xs text-muted-foreground">Attack Speed</div>
                          <div className="font-medium">{params.attack_speed.toFixed(1)}s</div>
                        </div>
                        <div className="p-2 bg-muted/40 rounded-md">
                          <div className="text-xs text-muted-foreground">Average Hit</div>
                          <div className="font-medium">{results.average_hit.toFixed(2)}</div>
                        </div>
                        <div className="p-2 bg-primary/10 rounded-md col-span-2">
                          <div className="text-xs text-muted-foreground">Final DPS</div>
                          <div className="font-medium text-primary">{results.dps.toFixed(2)}</div>
                        </div>
                      </div>
                    </>
                  )}

                  {params.combat_style === 'ranged' && (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div className="p-2 bg-muted/40 rounded-md">
                          <div className="text-xs text-muted-foreground">Effective Ranged Str</div>
                          <div className="font-medium">{results.effective_str}</div>
                        </div>
                        <div className="p-2 bg-muted/40 rounded-md">
                          <div className="text-xs text-muted-foreground">Ranged Str Bonus</div>
                          <div className="font-medium">{params.ranged_strength_bonus}</div>
                        </div>
                        <div className="p-2 bg-muted/40 rounded-md">
                          <div className="text-xs text-muted-foreground">Max Hit</div>
                          <div className="font-medium">{results.max_hit}</div>
                        </div>
                        <div className="p-2 bg-muted/40 rounded-md">
                          <div className="text-xs text-muted-foreground">Effective Ranged</div>
                          <div className="font-medium">{results.effective_atk}</div>
                        </div>
                        <div className="p-2 bg-muted/40 rounded-md">
                          <div className="text-xs text-muted-foreground">Ranged Attack Bonus</div>
                          <div className="font-medium">{params.ranged_attack_bonus}</div>
                        </div>
                        <div className="p-2 bg-muted/40 rounded-md">
                          <div className="text-xs text-muted-foreground">Attack Roll</div>
                          <div className="font-medium">{results.attack_roll}</div>
                        </div>
                        <div className="p-2 bg-muted/40 rounded-md">
                          <div className="text-xs text-muted-foreground">Defence Roll</div>
                          <div className="font-medium">{results.defence_roll}</div>
                        </div>
                        <div className="p-2 bg-muted/40 rounded-md">
                          <div className="text-xs text-muted-foreground">Hit Chance</div>
                          <div className="font-medium">{(results.hit_chance * 100).toFixed(2)}%</div>
                        </div>
                        <div className="p-2 bg-muted/40 rounded-md">
                          <div className="text-xs text-muted-foreground">Attack Speed</div>
                          <div className="font-medium">{params.attack_speed.toFixed(1)}s</div>
                        </div>
                        <div className="p-2 bg-muted/40 rounded-md">
                          <div className="text-xs text-muted-foreground">Average Hit</div>
                          <div className="font-medium">{results.average_hit.toFixed(2)}</div>
                        </div>
                        <div className="p-2 bg-primary/10 rounded-md col-span-2">
                          <div className="text-xs text-muted-foreground">Final DPS</div>
                          <div className="font-medium text-primary">{results.dps.toFixed(2)}</div>
                        </div>
                      </div>
                    </>
                  )}

                  {params.combat_style === 'magic' && (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div className="p-2 bg-muted/40 rounded-md">
                          <div className="text-xs text-muted-foreground">Base Spell Max Hit</div>
                          <div className="font-medium">{params.base_spell_max_hit}</div>
                        </div>
                        <div className="p-2 bg-muted/40 rounded-md">
                          <div className="text-xs text-muted-foreground">Max Hit</div>
                          <div className="font-medium">{results.max_hit}</div>
                        </div>
                        <div className="p-2 bg-muted/40 rounded-md">
                          <div className="text-xs text-muted-foreground">Damage Multiplier</div>
                          <div className="font-medium">{((results.damage_multiplier ?? 1.0) * 100).toFixed(1)}%</div>
                        </div>
                        <div className="p-2 bg-muted/40 rounded-md">
                          <div className="text-xs text-muted-foreground">Effective Magic</div>
                          <div className="font-medium">{results.effective_atk}</div>
                        </div>
                        <div className="p-2 bg-muted/40 rounded-md">
                          <div className="text-xs text-muted-foreground">Magic Attack Bonus</div>
                          <div className="font-medium">{params.magic_attack_bonus}</div>
                        </div>
                        <div className="p-2 bg-muted/40 rounded-md">
                          <div className="text-xs text-muted-foreground">Attack Roll</div>
                          <div className="font-medium">{results.attack_roll}</div>
                        </div>
                        <div className="p-2 bg-muted/40 rounded-md">
                          <div className="text-xs text-muted-foreground">Target Magic Level</div>
                          <div className="font-medium">{params.target_magic_level}</div>
                        </div>
                        <div className="p-2 bg-muted/40 rounded-md">
                          <div className="text-xs text-muted-foreground">Target Magic Defence</div>
                          <div className="font-medium">{params.target_magic_defence}</div>
                        </div>
                        <div className="p-2 bg-muted/40 rounded-md">
                          <div className="text-xs text-muted-foreground">Defence Roll</div>
                          <div className="font-medium">{results.defence_roll}</div>
                        </div>
                        <div className="p-2 bg-muted/40 rounded-md">
                          <div className="text-xs text-muted-foreground">Hit Chance</div>
                          <div className="font-medium">{(results.hit_chance * 100).toFixed(2)}%</div>
                        </div>
                        <div className="p-2 bg-muted/40 rounded-md">
                          <div className="text-xs text-muted-foreground">Attack Speed</div>
                          <div className="font-medium">{params.attack_speed.toFixed(1)}s</div>
                        </div>
                        <div className="p-2 bg-primary/10 rounded-md">
                          <div className="text-xs text-muted-foreground">Final DPS</div>
                          <div className="font-medium text-primary">{results.dps.toFixed(2)}</div>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two-column layout for middle sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          {/* Character equipment section */}
          <CombinedEquipmentDisplay onEquipmentUpdate={handleEquipmentUpdate} bossForm={currentBossForm} />
          {/* Prayer/Potion selector */}
          <PrayerPotionSelector />
        </div>
        
        {/* Right column */}
        <div className="space-y-6">
          {/* Target selection section */}
          <DirectBossSelector onSelectForm={handleBossUpdate} />
          
          {/* Defensive reductions panel - with contained height */}
          <Card className="w-full border">
            <CardContent>
              <DefenceReductionPanel />
            </CardContent>
          </Card>
          
          {/* Display passive effects relevant to the current loadout and boss */}
          {Object.keys(currentLoadout).length > 0 && (
            <PassiveEffectsDisplay loadout={currentLoadout} target={currentBossForm} />
          )}
          
          {/* Preset selector */}
          <PresetSelector onPresetLoad={() => toast.success("Preset loaded successfully!")} />

        </div>
           {/* Full-width comparison table at the bottom */}
          <DpsComparison />
      </div>
      
    </div>
  );
}

export default ImprovedDpsCalculator;
