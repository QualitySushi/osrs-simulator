// 'use client'

// import { useState, useEffect, useCallback } from 'react';
// import { useMutation } from '@tanstack/react-query';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { Button } from '@/components/ui/button';
// import { 
//   RotateCcw, 
//   Info, 
//   Calculator, 
//   Sword, 
//   Target, 
//   Zap, 
// } from 'lucide-react';
// import { useToast } from '@/hooks/use-toast';
// import { calculatorApi } from '@/services/api';
// import { useCalculatorStore } from '@/store/calculator-store';
// import { CombatStyle, CalculatorParams, Item, BossForm } from '@/app/types/calculator';
// import { BossSelector } from './BossSelector';
// import { CombinedEquipmentDisplay } from './CombinedEquipmentDisplay';
// import { EquipmentPanel } from './EquipmentPanel';
// import { DpsComparison } from './DpsComparison';
// import { AlertDescription } from '@/components/ui/alert';
// import { PrayerPotionSelector } from './PrayerPotionSelector'; 
// import { MagicForm } from './MagicForm';
// import calculatePassiveEffectBonuses from './PassiveEffectCalculator';
// import PassiveEffectsDisplay from './PassiveEffectsDisplay';
// import { DefenceReductionPanel } from './DefenceReductionPanel';

// export function DpsCalculator() {
//   const { toast } = useToast();
//   const params = useCalculatorStore((s) => s.params);
//   const results = useCalculatorStore((s) => s.results);
//   const setResults = useCalculatorStore((s) => s.setResults);
//   const switchCombatStyle = useCalculatorStore((s) => s.switchCombatStyle);
//   const resetParams = useCalculatorStore((s) => s.resetParams);
//   const resetLocks = useCalculatorStore((s) => s.resetLocks);
  
//   // Track equipment loadout and boss form for passive effects
//   const [currentLoadout, setCurrentLoadout] = useState<Record<string, Item | null>>({});
//   const [currentBossForm, setCurrentBossForm] = useState<BossForm | null>(null);
//   const [appliedPassiveEffects, setAppliedPassiveEffects] = useState<any>(null);

//   const calculateEffects = useCallback(() => {
//     return calculatePassiveEffectBonuses(
//       params,
//       currentLoadout,
//       currentBossForm
//     );
//   }, [params, currentLoadout, currentBossForm]); // Only essential dependencies

//   useEffect(() => {
//     const effects = calculateEffects();
//     if (effects.isApplicable) {
//       setAppliedPassiveEffects(effects);
//     } else {
//       setAppliedPassiveEffects(null);
//     }
//   }, [calculateEffects]);

//   const calculateMutation = useMutation({
//     mutationFn: (calculationParams: CalculatorParams) => {
//       console.log('[DEBUG] DPS Calculation using parameters:', calculationParams);

//       // Ensure we have a valid target_defence_type for melee combat
//       if (calculationParams.combat_style === 'melee') {
//         // Set default attack type if not present
//         const attackType = 'attack_type' in calculationParams 
//           ? calculationParams.attack_type || 'slash' 
//           : 'slash';
        
//         // Derive the target_defence_type from the attack_type
//         if (!calculationParams.target_defence_type) {
//           calculationParams.target_defence_type = `defence_${attackType}`;
//           console.log(`[DEBUG] Setting target_defence_type to: ${calculationParams.target_defence_type}`);
//         }
        
//         // Get the appropriate defense value based on the attack type
//         if (currentBossForm) {
//           let targetDefenceBonus = calculationParams.target_defence_bonus;
          
//           // Look for the corresponding defense property in the boss form
//           if (attackType === 'stab' && currentBossForm.defence_stab !== undefined) {
//             targetDefenceBonus = currentBossForm.defence_stab;
//           } else if (attackType === 'slash' && currentBossForm.defence_slash !== undefined) {
//             targetDefenceBonus = currentBossForm.defence_slash;
//           } else if (attackType === 'crush' && currentBossForm.defence_crush !== undefined) {
//             targetDefenceBonus = currentBossForm.defence_crush;
//           }
          
//           console.log(`[DEBUG] Using target defence bonus for ${attackType}: ${targetDefenceBonus}`);
//           calculationParams.target_defence_bonus = targetDefenceBonus;
//         }
//       } else if (calculationParams.combat_style === 'ranged') {
//         // For ranged, we use the ranged defense values
//         if (!calculationParams.target_defence_type) {
//           calculationParams.target_defence_type = 'defence_ranged_standard';
//           console.log('[DEBUG] Setting target_defence_type to: defence_ranged_standard');
//         }
//       } else if (calculationParams.combat_style === 'magic') {
//         // For magic, we use the magic defense values
//         if (!calculationParams.target_defence_type) {
//           calculationParams.target_defence_type = 'defence_magic';
//           console.log('[DEBUG] Setting target_defence_type to: defence_magic');
//         }
//       }
//       console.log('[DEBUG] Final calculation parameters:', {
//         combat_style: calculationParams.combat_style,
//         attack_type: (calculationParams as any).attack_type,
//         target_defence_type: calculationParams.target_defence_type,
//         target_defence_bonus: (calculationParams as any).target_defence_bonus
//       });
//       return calculatorApi.calculateDps(calculationParams);
//     },
//     onSuccess: (data) => {
//       setResults(data);
//       toast.success(`DPS Calculated: Max hit: ${data.max_hit}, DPS: ${data.dps.toFixed(2)}`);
//     },
//     onError: (error) => {
//       toast.error('Calculation Failed: There was an error calculating DPS.');
//       console.error('Calculation error:', error);
//     },
//   });

//   const handleTabChange = (value: string) => {
//     setActiveTab(value as CombatStyle);
//     switchCombatStyle(value as CombatStyle);
//     toast.info(`Switched to ${value} combat style`);
//   };

//   const [activeTab, setActiveTab] = useState<CombatStyle>('melee');

//   useEffect(() => {
//     const actual = useCalculatorStore.getState().params.combat_style;
//     if (actual !== activeTab) {
//       setActiveTab(actual);
//     }
//   }, [activeTab]);

// const sanitizeParams = (params: CalculatorParams): CalculatorParams => {
//   const { selected_spell, ...cleaned } = params as any;

//   // Ensure target_defence_type is properly set
//   if (!cleaned.target_defence_type) {
//     if (params.combat_style === 'melee') {
//       cleaned.target_defence_type = `defence_${cleaned.attack_type || 'slash'}`;
//     } else if (params.combat_style === 'ranged') {
//       cleaned.target_defence_type = 'defence_ranged_standard';
//     } else if (params.combat_style === 'magic') {
//       cleaned.target_defence_type = 'defence_magic';
//     }
//   }

//   if (params.combat_style === 'magic') {
//     delete cleaned.attack_style_bonus_attack;
//     delete cleaned.attack_style_bonus_strength;

//     // Ensure all numbers are actually numbers (not strings from form/select)
//     cleaned.magic_level = Number(cleaned.magic_level);
//     cleaned.magic_boost = Number(cleaned.magic_boost);
//     cleaned.magic_prayer = Number(cleaned.magic_prayer);
//     cleaned.base_spell_max_hit = Number(cleaned.base_spell_max_hit);
//     cleaned.magic_attack_bonus = Number(cleaned.magic_attack_bonus);
//     cleaned.magic_damage_bonus = Number(cleaned.magic_damage_bonus);
//     cleaned.target_magic_level = Number(cleaned.target_magic_level);
//     cleaned.target_magic_defence = Number(cleaned.target_magic_defence);
//     cleaned.attack_speed = Number(cleaned.attack_speed);
//   }

//   return cleaned;
// };

// const handleCalculate = useCallback(() => {
//   const clean = sanitizeParams(params);
  
//   // Check for Twisted Bow
//   if (currentLoadout) {
//     const twistedBowEquipped = 
//       (currentLoadout['2h'] && currentLoadout['2h'].name.toLowerCase().includes('twisted bow')) ||
//       (currentLoadout['mainhand'] && currentLoadout['mainhand'].name.toLowerCase().includes('twisted bow'));
      
//       if (twistedBowEquipped && params.combat_style === 'ranged') {
//         clean.weapon_name = "twisted bow";

//         if (currentBossForm?.magic_level) {
//           clean.target_magic_level = currentBossForm.magic_level;
//         }

//         clean.ranged_attack_bonus = params.ranged_attack_bonus;
//         clean.ranged_strength_bonus = params.ranged_strength_bonus;

//       }

    
//     // Handle Tumeken's Shadow
//     const tumekenShadowEquipped = 
//       (currentLoadout['2h'] && currentLoadout['2h'].name.toLowerCase().includes('tumeken')) ||
//       (currentLoadout['mainhand'] && currentLoadout['mainhand'].name.toLowerCase().includes('tumeken'));
      
//     if (tumekenShadowEquipped && params.combat_style === 'magic') {
//       clean.shadow_bonus = 0.5;
//       console.log(`[DEBUG] Applied Tumeken's Shadow bonus: 0.5`);
//     }
//   }
  
//   console.log('[DEBUG] Final params for calculation:', clean);
//   calculateMutation.mutate(clean);
// }, [params, currentLoadout, currentBossForm, calculateMutation]);

//   const handleReset = () => {
//     resetParams();
//     resetLocks();
//     setResults(null);
//     setAppliedPassiveEffects(null);
//     setCurrentLoadout({});
//     setCurrentBossForm(null);
//     toast.success('Calculator reset to defaults');
//   };

//   // Function to handle equipment loadout updates
//   const handleEquipmentUpdate = (loadout: Record<string, Item | null>) => {
//     setCurrentLoadout(loadout);
//   };

//   // Function to handle boss selection updates
//   const handleBossUpdate = (bossForm: BossForm | null) => {
//     setCurrentBossForm(bossForm);
//   };

//   const dpsTriggers = JSON.stringify({
//     combat_style: params.combat_style,
//     attack_type: (params as any).attack_type,
//     attack_style_bonus_attack: params.attack_style_bonus_attack,
//     attack_style_bonus_strength: params.attack_style_bonus_strength,
//     attack_speed: params.attack_speed,
//     melee_attack_bonus: (params as any).melee_attack_bonus,
//     ranged_attack_bonus: (params as any).ranged_attack_bonus,
//     magic_attack_bonus: (params as any).magic_attack_bonus,
//     selected_spell: (params as any).selected_spell,
//     base_spell_max_hit: (params as any).base_spell_max_hit,
//     boss_id: currentBossForm?.id,
//     weapon_id: currentLoadout['2h']?.id || currentLoadout['mainhand']?.id,
//   });

// useEffect(() => {
//   if (!params || !currentBossForm || Object.keys(currentLoadout).length === 0) return;
//   const timeout = setTimeout(() => handleCalculate(), 0);
//   return () => clearTimeout(timeout);
// }, [dpsTriggers]);

//   return (
//     <div className="space-y-6">
//       <Card className="w-full max-w-4xl mx-auto rs-border">
//         <CardHeader className="justify-between items-center border-b border-rs-border">
//           <CardTitle className="text-2xl font-bold main-title flex items-center">
//             <Calculator className="h-5 w-5 mr-2 text-rs-gold" />
//             OSRS DPS Calculator
//           </CardTitle>
//           <Button variant="outline" size="sm" onClick={handleReset} className="hover:border-rs-gold">
//             <RotateCcw className="h-4 w-4 mr-2" />
//             Reset All
//           </Button>
//         </CardHeader>
//         <CardContent>
//           <div className="bg-rs-dark-stone bg-opacity-50 border border-rs-gold rounded-md p-3 mb-4 flex items-start">
//             <Info className="h-5 w-5 mr-2 text-rs-gold mt-0.5 flex-shrink-0" />
//             <AlertDescription className="text-rs-gold">
//               Select your combat style, prayers, potions, attack style, equipment, and target to calculate DPS.
//             </AlertDescription>
//           </div>

//           <Tabs
//             value={activeTab}
//             onValueChange={handleTabChange}
//             className="w-full"
//           >
//             <TabsList className="grid grid-cols-3 mb-6">
//               <TabsTrigger value="melee" className="flex items-center justify-center">
//                 <Sword className="h-4 w-4 mr-2" />
//                 Melee
//               </TabsTrigger>
//               <TabsTrigger value="ranged" className="flex items-center justify-center">
//                 <Target className="h-4 w-4 mr-2" />
//                 Ranged
//               </TabsTrigger>
//               <TabsTrigger value="magic" className="flex items-center justify-center">
//                 <Zap className="h-4 w-4 mr-2" />
//                 Magic
//               </TabsTrigger>
//             </TabsList>

//             <TabsContent value="melee">{/* Stats renderer */}</TabsContent>
//             <TabsContent value="ranged">{/* Stats renderer */}</TabsContent>
//             <TabsContent value="magic">
//               <MagicForm />
//             </TabsContent>

//             <div className="mt-6 flex justify-center">
//               <Button 
//                 onClick={handleCalculate} 
//                 disabled={calculateMutation.isPending}
//                 className="font-rs-value px-6 py-2"
//               >
//                 {calculateMutation.isPending ? 'Calculating...' : 'Calculate DPS'}
//               </Button>
//             </div>
//           </Tabs>

//           {/* Display passive effects relevant to the current loadout and boss */}
//           {Object.keys(currentLoadout).length > 0 && (
//             <div className="mt-6">
//               <PassiveEffectsDisplay loadout={currentLoadout} target={currentBossForm} />
//             </div>
//           )}

//           {results && (
//             <div className="mt-8">
//               <h2 className="text-xl font-bold mb-4 main-title text-center">Results</h2>
//               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                 <div className="bg-rs-panel p-4 rounded-lg border-2 border-black shadow-inner">
//                   <div className="text-sm font-medium text-muted-foreground">DPS</div>
//                   <div className="text-2xl font-bold text-rs-gold font-rs-value">{results.dps.toFixed(2)}</div>
//                 </div>
//                 <div className="bg-rs-panel p-4 rounded-lg border-2 border-black shadow-inner">
//                   <div className="text-sm font-medium text-muted-foreground">Max Hit</div>
//                   <div className="text-2xl font-bold text-rs-gold font-rs-value">{results.max_hit}</div>
//                 </div>
//                 <div className="bg-rs-panel p-4 rounded-lg border-2 border-black shadow-inner">
//                   <div className="text-sm font-medium text-muted-foreground">Hit Chance</div>
//                   <div className="text-2xl font-bold text-rs-gold font-rs-value">{(results.hit_chance * 100).toFixed(1)}%</div>
//                 </div>
//               </div>

//               {/* Display passive effect bonuses if applied */}
//               {appliedPassiveEffects && appliedPassiveEffects.isApplicable && (
//                 <div className="mt-4 p-3 border-2 border-black rounded-md bg-rs-panel">
//                   <h3 className="text-sm font-medium mb-1 text-rs-gold">Applied Passive Effects</h3>
//                   <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
//                     {appliedPassiveEffects.accuracy !== 1.0 && (
//                       <div>
//                         <span className="text-muted-foreground">Accuracy Bonus:</span>{' '}
//                         <span className="font-medium text-rs-good">
//                           +{((appliedPassiveEffects.accuracy - 1) * 100).toFixed(1)}%
//                         </span>
//                       </div>
//                     )}
//                     {appliedPassiveEffects.damage !== 1.0 && (
//                       <div>
//                         <span className="text-muted-foreground">Damage Bonus:</span>{' '}
//                         <span className="font-medium text-rs-good">
//                           +{((appliedPassiveEffects.damage - 1) * 100).toFixed(1)}%
//                         </span>
//                       </div>
//                     )}
//                     {appliedPassiveEffects.maxHit > 0 && (
//                       <div>
//                         <span className="text-muted-foreground">Max Hit Bonus:</span>{' '}
//                         <span className="font-medium text-rs-good">
//                           +{appliedPassiveEffects.maxHit}
//                         </span>
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               )}

//               {params.combat_style === 'melee' && (
//                 <div className="mt-6 p-4 border-2 border-black rounded bg-rs-panel text-sm space-y-1">
//                   <div className="font-bold mb-2 text-rs-gold">🧠 Full Calculation Debug</div>
//                   <div>→ <span className="text-rs-gold">Effective Strength:</span> <span className="font-rs-value">{results.effective_str}</span></div>
//                   <div>→ <span className="text-rs-gold">Strength Bonus:</span> <span className="font-rs-value">{params.melee_strength_bonus}</span></div>
//                   <div>→ <span className="text-rs-gold">Max Hit:</span> <span className="font-rs-value">{results.max_hit}</span></div>
//                   <div>→ <span className="text-rs-gold">Effective Attack:</span> <span className="font-rs-value">{results.effective_atk}</span></div>
//                   <div>→ <span className="text-rs-gold">Attack Bonus:</span> <span className="font-rs-value">{params.melee_attack_bonus}</span></div>
//                   <div>→ <span className="text-rs-gold">Attack Roll:</span> <span className="font-rs-value">{results.attack_roll}</span></div>
//                   <div>→ <span className="text-rs-gold">Defence Level:</span> <span className="font-rs-value">{params.target_defence_level}</span></div>
//                   <div>→ <span className="text-rs-gold">Defence Bonus:</span> <span className="font-rs-value">{params.target_defence_bonus}</span></div>
//                   <div>→ <span className="text-rs-gold">Defence Roll:</span> <span className="font-rs-value">{results.defence_roll}</span></div>
//                   <div>→ <span className="text-rs-gold">Hit Chance:</span> <span className="font-rs-value">{(results.hit_chance * 100).toFixed(2)}%</span></div>
//                   <div>→ <span className="text-rs-gold">Average Hit:</span> <span className="font-rs-value">{results.average_hit.toFixed(2)}</span></div>
//                   <div>→ <span className="text-rs-gold">Attack Speed:</span> <span className="font-rs-value">{params.attack_speed.toFixed(1)}s</span></div>
//                   <div className="font-semibold">→ <span className="text-rs-gold">Final DPS:</span> <span className="font-rs-value">{results.dps.toFixed(2)}</span></div>
//                 </div>
//               )}

//               {params.combat_style === 'ranged' && (
//                 <div className="mt-6 p-4 border-2 border-black rounded bg-rs-panel text-sm space-y-1">
//                   <div className="font-bold mb-2 text-rs-gold">🧠 Full Calculation Debug</div>
//                   <div>→ <span className="text-rs-gold">Effective Ranged Strength:</span> <span className="font-rs-value">{results.effective_str}</span></div>
//                   <div>→ <span className="text-rs-gold">Ranged Strength Bonus:</span> <span className="font-rs-value">{params.ranged_strength_bonus}</span></div>
//                   <div>→ <span className="text-rs-gold">Max Hit:</span> <span className="font-rs-value">{results.max_hit}</span></div>
//                   <div>→ <span className="text-rs-gold">Effective Ranged Attack:</span> <span className="font-rs-value">{results.effective_atk}</span></div>
//                   <div>→ <span className="text-rs-gold">Ranged Attack Bonus:</span> <span className="font-rs-value">{params.ranged_attack_bonus}</span></div>
//                   <div>→ <span className="text-rs-gold">Attack Roll:</span> <span className="font-rs-value">{results.attack_roll}</span></div>
//                   <div>→ <span className="text-rs-gold">Defence Level:</span> <span className="font-rs-value">{params.target_defence_level}</span></div>
//                   <div>→ <span className="text-rs-gold">Defence Bonus:</span> <span className="font-rs-value">{params.target_defence_bonus}</span></div>
//                   <div>→ <span className="text-rs-gold">Defence Roll:</span> <span className="font-rs-value">{results.defence_roll}</span></div>
//                   <div>→ <span className="text-rs-gold">Hit Chance:</span> <span className="font-rs-value">{(results.hit_chance * 100).toFixed(2)}%</span></div>
//                   <div>→ <span className="text-rs-gold">Average Hit:</span> <span className="font-rs-value">{results.average_hit.toFixed(2)}</span></div>
//                   <div>→ <span className="text-rs-gold">Attack Speed:</span> <span className="font-rs-value">{params.attack_speed.toFixed(1)}s</span></div>
//                   <div className="font-semibold">→ <span className="text-rs-gold">Final DPS:</span> <span className="font-rs-value">{results.dps.toFixed(2)}</span></div>
//                 </div>
//               )}

//               {params.combat_style === 'magic' && (
//                 <div className="mt-6 p-4 border-2 border-black rounded bg-rs-panel text-sm space-y-1">
//                   <div className="font-bold mb-2 text-rs-gold">🧠 Full Calculation Debug</div>
//                   <div>→ <span className="text-rs-gold">Max Hit (after bonuses):</span> <span className="font-rs-value">{results.max_hit}</span></div>
//                   <div>→ <span className="text-rs-gold">Base Spell Max Hit:</span> <span className="font-rs-value">{params.base_spell_max_hit}</span></div>
//                   <div>→ <span className="text-rs-gold">Total Damage Multiplier:</span> <span className="font-rs-value">{((results.damage_multiplier ?? 1.0) * 100).toFixed(1)}%</span></div>
//                   <div>→ <span className="text-rs-gold">Effective Magic Attack:</span> <span className="font-rs-value">{results.effective_atk}</span></div>
//                   <div>→ <span className="text-rs-gold">Magic Attack Bonus:</span> <span className="font-rs-value">{params.magic_attack_bonus}</span></div>
//                   <div>→ <span className="text-rs-gold">Attack Roll:</span> <span className="font-rs-value">{results.attack_roll}</span></div>
//                   <div>→ <span className="text-rs-gold">Target Magic Level:</span> <span className="font-rs-value">{params.target_magic_level}</span></div>
//                   <div>→ <span className="text-rs-gold">Target Magic Defence:</span> <span className="font-rs-value">{params.target_magic_defence}</span></div>
//                   <div>→ <span className="text-rs-gold">Defence Roll:</span> <span className="font-rs-value">{results.defence_roll}</span></div>
//                   <div>→ <span className="text-rs-gold">Hit Chance:</span> <span className="font-rs-value">{(results.hit_chance * 100).toFixed(2)}%</span></div>
//                   <div>→ <span className="text-rs-gold">Average Hit:</span> <span className="font-rs-value">{results.average_hit.toFixed(2)}</span></div>
//                   <div>→ <span className="text-rs-gold">Attack Speed:</span> <span className="font-rs-value">{params.attack_speed.toFixed(1)}s</span></div>
//                   <div className="font-semibold">→ <span className="text-rs-gold">Final DPS:</span> <span className="font-rs-value">{results.dps.toFixed(2)}</span></div>
//                 </div>
//               )}
//             </div>
//           )}
//         </CardContent>
//       </Card>

//       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
//         <BossSelector onSelectForm={handleBossUpdate} />
//         <PrayerPotionSelector />
//       </div>

//       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
//         <EquipmentPanel onEquipmentUpdate={handleEquipmentUpdate} bossForm={currentBossForm} />
//         <DefenceReductionPanel/>
//       </div>
//       <DpsComparison />
//     </div>
//   );
// }