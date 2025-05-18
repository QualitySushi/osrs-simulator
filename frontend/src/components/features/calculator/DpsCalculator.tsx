'use client'
import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RotateCcw, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { calculatorApi } from '@/services/api';
import { useCalculatorStore } from '@/store/calculator-store';
import { CombatStyle, CalculatorParams, Item, BossForm } from '@/app/types/calculator';
import { BossSelector } from './BossSelector';
import { CombinedEquipmentDisplay } from './CombinedEquipmentDisplay';
import { DpsComparison } from './DpsComparison';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PrayerPotionSelector } from './PrayerPotionSelector'; 
import { MagicForm } from './MagicForm';
import calculatePassiveEffectBonuses from './PassiveEffectCalculator';
import PassiveEffectsDisplay from './PassiveEffectsDisplay';

export function DpsCalculator() {
  const { toast } = useToast();
  const { 
    params, 
    setResults, 
    results, 
    switchCombatStyle, 
    resetParams, 
    resetLocks
  } = useCalculatorStore();
  const [activeTab, setActiveTab] = useState<CombatStyle>(params.combat_style);
  
  // Track equipment loadout and boss form for passive effects
  const [currentLoadout, setCurrentLoadout] = useState<Record<string, Item | null>>({});
  const [currentBossForm, setCurrentBossForm] = useState<BossForm | null>(null);
  const [appliedPassiveEffects, setAppliedPassiveEffects] = useState<any>(null);

useEffect(() => {
  const passiveEffects = calculatePassiveEffectBonuses(
    params,
    currentLoadout,
    currentBossForm
  );
  console.log('[DEBUG] Recalculated passive effects:', passiveEffects);
  setAppliedPassiveEffects(passiveEffects);
}, [params, currentLoadout, currentBossForm]);

  const calculateMutation = useMutation({
    mutationFn: (calculationParams: CalculatorParams) => {
      console.log('[DEBUG] DPS Calculation using parameters:', calculationParams);
      
      // Calculate passive effect bonuses
      const passiveEffects = calculatePassiveEffectBonuses(
        calculationParams,
        currentLoadout,
        currentBossForm
      );
      
      // Store applied effects for display
      setAppliedPassiveEffects(passiveEffects);
      
      // Apply passive effect bonuses to parameters if applicable
      let enhancedParams = { ...calculationParams };
      
      if (passiveEffects.isApplicable) {
        console.log('[DEBUG] Applying passive effect bonuses:', passiveEffects);
        
        // Add a field for passive effects in the API request
        enhancedParams = { 
          ...enhancedParams,
          passive_effects: {
            accuracy_multiplier: passiveEffects.accuracy || 1.0,
            damage_multiplier: passiveEffects.damage || 1.0,
            max_hit_bonus: passiveEffects.maxHit || 0
          }
        };
      }
      
      return calculatorApi.calculateDps(enhancedParams);
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

  const handleTabChange = (value: string) => {
    setActiveTab(value as CombatStyle);
    switchCombatStyle(value as CombatStyle);
    toast.info(`Switched to ${value} combat style`);
  };

  const sanitizeParams = (params: CalculatorParams): CalculatorParams => {
    const { selected_spell, ...cleaned } = params as any;

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

  const handleCalculate = () => {
    const clean = sanitizeParams(params);
    console.log('[DEBUG] Cleaned params being used for calculation:', clean);
    calculateMutation.mutate(clean);
  };

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
  const handleEquipmentUpdate = (loadout: Record<string, Item | null>) => {
    setCurrentLoadout(loadout);
  };

  // Function to handle boss selection updates
  const handleBossUpdate = (bossForm: BossForm | null) => {
    setCurrentBossForm(bossForm);
  };

  return (
    <div className="space-y-6">
      <Card className="w-full max-w-4xl mx-auto justify-center text-center">
        <CardHeader className="justify-between items-center">
          <CardTitle className="text-2xl font-bold justify-center text-center">OSRS DPS Calculator</CardTitle>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset All
          </Button>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4 border-blue-200 dark:border-blue-800 bg-blue-100 dark:bg-blue-900">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Select your combat style, prayers, potions, attack style, equipment, and target to calculate DPS.
            </AlertDescription>
          </Alert>

          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="w-full"
          >
            <TabsList className="grid grid-cols-3 mb-6">
              <TabsTrigger value="melee">Melee</TabsTrigger>
              <TabsTrigger value="ranged">Ranged</TabsTrigger>
              <TabsTrigger value="magic">Magic</TabsTrigger>
            </TabsList>

            <TabsContent value="melee">{/* Stats renderer */}</TabsContent>
            <TabsContent value="ranged">{/* Stats renderer */}</TabsContent>
            <TabsContent value="magic">
              <MagicForm />
            </TabsContent>

            <div className="mt-6 justify-end">
              <Button 
                onClick={handleCalculate} 
                disabled={calculateMutation.isPending}
              >
                {calculateMutation.isPending ? 'Calculating...' : 'Calculate DPS'}
              </Button>
            </div>
          </Tabs>

          {/* Display passive effects relevant to the current loadout and boss */}
          {Object.keys(currentLoadout).length > 0 && (
            <div className="mt-6">
              <PassiveEffectsDisplay loadout={currentLoadout} target={currentBossForm} />
            </div>
          )}

          {results && (
            <div className="mt-8">
              <h2 className="text-xl font-bold mb-4">Results</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                  <div className="text-sm font-medium text-muted-foreground">DPS</div>
                  <div className="text-2xl font-bold">{results.dps.toFixed(2)}</div>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                  <div className="text-sm font-medium text-muted-foreground">Max Hit</div>
                  <div className="text-2xl font-bold">{results.max_hit}</div>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                  <div className="text-sm font-medium text-muted-foreground">Hit Chance</div>
                  <div className="text-2xl font-bold">{(results.hit_chance * 100).toFixed(1)}%</div>
                </div>
              </div>

              {/* Display passive effect bonuses if applied */}
              {appliedPassiveEffects && appliedPassiveEffects.isApplicable && (
                <div className="mt-4 p-3 border rounded-md bg-green-50 dark:bg-green-900/20">
                  <h3 className="text-sm font-medium mb-1">Applied Passive Effects</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                    {appliedPassiveEffects.accuracy !== 1.0 && (
                      <div>
                        <span className="text-muted-foreground">Accuracy Bonus:</span>{' '}
                        <span className="font-medium">
                          +{((appliedPassiveEffects.accuracy - 1) * 100).toFixed(1)}%
                        </span>
                      </div>
                    )}
                    {appliedPassiveEffects.damage !== 1.0 && (
                      <div>
                        <span className="text-muted-foreground">Damage Bonus:</span>{' '}
                        <span className="font-medium">
                          +{((appliedPassiveEffects.damage - 1) * 100).toFixed(1)}%
                        </span>
                      </div>
                    )}
                    {appliedPassiveEffects.maxHit > 0 && (
                      <div>
                        <span className="text-muted-foreground">Max Hit Bonus:</span>{' '}
                        <span className="font-medium">
                          +{appliedPassiveEffects.maxHit}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {params.combat_style === 'melee' && (
                <div className="mt-6 p-4 border rounded bg-slate-100 dark:bg-slate-800 text-sm space-y-1">
                  <div className="font-bold mb-2">🧠 Full Calculation Debug</div>
                  <div>→ Effective Strength: {results.effective_str}</div>
                  <div>→ Strength Bonus: {params.melee_strength_bonus}</div>
                  <div>→ Max Hit: {results.max_hit}</div>
                  <div>→ Effective Attack: {results.effective_atk}</div>
                  <div>→ Attack Bonus: {params.melee_attack_bonus}</div>
                  <div>→ Attack Roll: {results.attack_roll}</div>
                  <div>→ Defence Level: {params.target_defence_level}</div>
                  <div>→ Defence Bonus: {params.target_defence_bonus}</div>
                  <div>→ Defence Roll: {results.defence_roll}</div>
                  <div>→ Hit Chance: {(results.hit_chance * 100).toFixed(2)}%</div>
                  <div>→ Average Hit: {results.average_hit.toFixed(2)}</div>
                  <div>→ Attack Speed: {params.attack_speed.toFixed(1)}s</div>
                  <div className="font-semibold">→ Final DPS: {results.dps.toFixed(2)}</div>
                </div>
              )}

              {params.combat_style === 'ranged' && (
                <div className="mt-6 p-4 border rounded bg-slate-100 dark:bg-slate-800 text-sm space-y-1">
                  <div className="font-bold mb-2">🧠 Full Calculation Debug</div>
                  <div>→ Effective Ranged Strength: {results.effective_str}</div>
                  <div>→ Ranged Strength Bonus: {params.ranged_strength_bonus}</div>
                  <div>→ Max Hit: {results.max_hit}</div>
                  <div>→ Effective Ranged Attack: {results.effective_atk}</div>
                  <div>→ Ranged Attack Bonus: {params.ranged_attack_bonus}</div>
                  <div>→ Attack Roll: {results.attack_roll}</div>
                  <div>→ Defence Level: {params.target_defence_level}</div>
                  <div>→ Ranged Defence Bonus: {params.target_ranged_defence_bonus}</div>
                  <div>→ Defence Roll: {results.defence_roll}</div>
                  <div>→ Hit Chance: {(results.hit_chance * 100).toFixed(2)}%</div>
                  <div>→ Average Hit: {results.average_hit.toFixed(2)}</div>
                  <div>→ Attack Speed: {params.attack_speed.toFixed(1)}s</div>
                  <div className="font-semibold">→ Final DPS: {results.dps.toFixed(2)}</div>
                </div>
              )}

              {params.combat_style === 'magic' && (
                <div className="mt-6 p-4 border rounded bg-slate-100 dark:bg-slate-800 text-sm space-y-1">
                  <div className="font-bold mb-2">🧠 Full Calculation Debug</div>
                  <div>→ Max Hit (after bonuses): {results.max_hit}</div>
                  <div>→ Base Spell Max Hit: {params.base_spell_max_hit}</div>
                  <div>Total Damage Multiplier: {((results.damage_multiplier ?? 1.0) * 100).toFixed(1)}%</div>
                  <div>→ Effective Magic Attack: {results.effective_atk}</div>
                  <div>→ Magic Attack Bonus: {params.magic_attack_bonus}</div>
                  <div>→ Attack Roll: {results.attack_roll}</div>
                  <div>→ Target Magic Level: {params.target_magic_level}</div>
                  <div>→ Target Magic Defence: {params.target_magic_defence}</div>
                  <div>→ Defence Roll: {results.defence_roll}</div>
                  <div>→ Hit Chance: {(results.hit_chance * 100).toFixed(2)}%</div>
                  <div>→ Average Hit: {results.average_hit.toFixed(2)}</div>
                  <div>→ Attack Speed: {params.attack_speed.toFixed(1)}s</div>
                  <div className="font-semibold">→ Final DPS: {results.dps.toFixed(2)}</div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto justify-center text-center">
        <BossSelector onSelectForm={handleBossUpdate} />
        <PrayerPotionSelector />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto justify-center text-center">
        <CombinedEquipmentDisplay onEquipmentUpdate={handleEquipmentUpdate} />
        <DpsComparison />
      </div>
    </div>
  );
}