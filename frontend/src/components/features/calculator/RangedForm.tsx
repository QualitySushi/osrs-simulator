'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useCalculatorStore } from '@/store/calculator-store';
import { RangedCalculatorParams } from '@/app/types/calculator';

// Zod schema for validation
const rangedFormSchema = z.object({
  ranged_level: z.number().min(1).max(99),
  ranged_boost: z.number().min(0).max(20),
  ranged_prayer: z.number().min(1).max(1.25),
  ranged_strength_bonus: z.number().min(0).max(200),
  ranged_attack_bonus: z.number().min(0).max(200),
  attack_style_bonus_attack: z.number().min(0).max(3),
  attack_style_bonus_strength: z.number().min(0).max(3),
  void_ranged: z.boolean(),
  gear_multiplier: z.number().min(1).max(2),
  special_multiplier: z.number().min(1).max(2),
  target_defence_level: z.number().min(0).max(500),
  target_ranged_defence_bonus: z.number().min(0).max(500),
  attack_speed: z.number().min(1).max(10),
});

type RangedFormValues = z.infer<typeof rangedFormSchema>;

export function RangedForm() {
  const { params, setParams, gearLocked, bossLocked } = useCalculatorStore();
  const rangedParams = params as RangedCalculatorParams;

  // Initialize form with current store values
  const form = useForm<RangedFormValues>({
    resolver: zodResolver(rangedFormSchema),
    defaultValues: {
      ranged_level: rangedParams.ranged_level,
      ranged_boost: rangedParams.ranged_boost,
      ranged_prayer: rangedParams.ranged_prayer,
      ranged_strength_bonus: rangedParams.ranged_strength_bonus,
      ranged_attack_bonus: rangedParams.ranged_attack_bonus,
      attack_style_bonus_attack: rangedParams.attack_style_bonus_attack,
      attack_style_bonus_strength: rangedParams.attack_style_bonus_strength,
      void_ranged: rangedParams.void_ranged || false,
      gear_multiplier: rangedParams.gear_multiplier || 1.0,
      special_multiplier: rangedParams.special_multiplier || 1.0,
      target_defence_level: rangedParams.target_defence_level,
      target_ranged_defence_bonus: rangedParams.target_ranged_defence_bonus,
      attack_speed: rangedParams.attack_speed,
    },
  });

  // Update form values when store changes (e.g., when a boss is selected or gear is added)
  useEffect(() => {
    form.reset({
      ...form.getValues(),
      ranged_strength_bonus: rangedParams.ranged_strength_bonus,
      ranged_attack_bonus: rangedParams.ranged_attack_bonus,
      target_defence_level: rangedParams.target_defence_level,
      target_ranged_defence_bonus: rangedParams.target_ranged_defence_bonus,
    });
  }, [
    rangedParams.ranged_strength_bonus,
    rangedParams.ranged_attack_bonus,
    rangedParams.target_defence_level,
    rangedParams.target_ranged_defence_bonus,
    form,
    rangedParams
  ]);

  // Update store when form values change (but only if not locked)
  const onValueChange = (values: Partial<RangedFormValues>) => {
    // Determine which values to update based on lock status
    const updatedValues: Partial<RangedFormValues> = { ...values };
    
    // Don't update gear stats if gear is locked
    if (gearLocked) {
      delete updatedValues.ranged_strength_bonus;
      delete updatedValues.ranged_attack_bonus;
    }
    
    // Don't update target stats if boss is locked
    if (bossLocked) {
      delete updatedValues.target_defence_level;
      delete updatedValues.target_ranged_defence_bonus;
    }
    
    // Only update the store with non-locked values
    if (Object.keys(updatedValues).length > 0) {
      setParams(updatedValues);
    }
  };

  // Helper to check if field should be disabled
  const isFieldDisabled = (fieldName: string) => {
    // Equipment stat fields should be disabled when gear is locked
    if (gearLocked && ['ranged_strength_bonus', 'ranged_attack_bonus'].includes(fieldName)) {
      return true;
    }
    
    // Target stat fields should be disabled when boss is locked
    if (bossLocked && ['target_defence_level', 'target_ranged_defence_bonus'].includes(fieldName)) {
      return true;
    }
    
    return false;
  };

  return (
    <Form {...form}>
      <form className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Player Stats Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Player Stats</h3>
            
            <FormField
              control={form.control}
              name="ranged_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ranged Level: {field.value}</FormLabel>
                  <FormControl>
                    <Slider
                      min={1}
                      max={99}
                      step={1}
                      value={[field.value]}
                      onValueChange={(values) => {
                        field.onChange(values[0]);
                        onValueChange({ ranged_level: values[0] });
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ranged_boost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ranged Boost: {field.value}</FormLabel>
                  <FormControl>
                    <Slider
                      min={0}
                      max={20}
                      step={1}
                      value={[field.value]}
                      onValueChange={(values) => {
                        field.onChange(values[0]);
                        onValueChange({ ranged_boost: values[0] });
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Ranging potion: 4-10, Divine ranging: 5-13, Overload: 6+
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ranged_prayer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prayer Bonus: {(field.value * 100 - 100).toFixed(0)}%</FormLabel>
                  <FormControl>
                    <Slider
                      min={1}
                      max={1.23}
                      step={0.01}
                      value={[field.value]}
                      onValueChange={(values) => {
                        field.onChange(values[0]);
                        onValueChange({ ranged_prayer: values[0] });
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    None: 0%, Eagle Eye: 15%, Rigour: 23%
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="attack_speed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Attack Speed (seconds)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      step={0.1}
                      {...field}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        field.onChange(value);
                        onValueChange({ attack_speed: value });
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Shortbow: 1.8s, Crossbow: 3.0s, Blowpipe: 1.8s
                  </FormDescription>
                </FormItem>
              )}
            />
          </div>

          {/* Equipment Stats Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Equipment Stats</h3>
            
            <FormField
              control={form.control}
              name="ranged_strength_bonus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ranged Strength Bonus</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={200}
                      {...field}
                      onChange={(e) => {
                        if (!isFieldDisabled('ranged_strength_bonus')) {
                          const value = parseInt(e.target.value);
                          field.onChange(value);
                          onValueChange({ ranged_strength_bonus: value });
                        }
                      }}
                      disabled={isFieldDisabled('ranged_strength_bonus')}
                      className={gearLocked ? "opacity-50" : ""}
                      value={rangedParams.ranged_strength_bonus} // Ensure we display the actual store value
                    />
                  </FormControl>
                  {gearLocked && <FormDescription className="text-amber-500">Using equipment bonuses</FormDescription>}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ranged_attack_bonus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ranged Attack Bonus</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={200}
                      {...field}
                      onChange={(e) => {
                        if (!isFieldDisabled('ranged_attack_bonus')) {
                          const value = parseInt(e.target.value);
                          field.onChange(value);
                          onValueChange({ ranged_attack_bonus: value });
                        }
                      }}
                      disabled={isFieldDisabled('ranged_attack_bonus')}
                      className={gearLocked ? "opacity-50" : ""}
                      value={rangedParams.ranged_attack_bonus} // Ensure we display the actual store value
                    />
                  </FormControl>
                  {gearLocked && <FormDescription className="text-amber-500">Using equipment bonuses</FormDescription>}
                </FormItem>
              )}
            />

            <FormField
            control={form.control}
            name="attack_style_bonus_attack"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Attack Style Bonus (Attack): {field.value}</FormLabel>
                <FormControl>
                    <Slider
                    min={0}
                    max={3}
                    step={1}
                    value={[field.value]}
                    onValueChange={(values) => {
                        field.onChange(values[0]);
                        onValueChange({ attack_style_bonus_attack: values[0] });
                    }}
                    />
                </FormControl>
                </FormItem>
            )}
            />

            <FormField
            control={form.control}
            name="attack_style_bonus_strength"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Attack Style Bonus (Strength): {field.value}</FormLabel>
                <FormControl>
                    <Slider
                    min={0}
                    max={3}
                    step={1}
                    value={[field.value]}
                    onValueChange={(values) => {
                        field.onChange(values[0]);
                        onValueChange({ attack_style_bonus_strength: values[0] });
                    }}
                    />
                </FormControl>
                </FormItem>
            )}
            />
            
            <FormField
              control={form.control}
              name="void_ranged"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Void Ranged</FormLabel>
                    <FormDescription>
                      Elite Void Ranged gives 12.5% accuracy and damage
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        onValueChange({ void_ranged: checked });
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gear_multiplier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gear Multiplier: {field.value}x</FormLabel>
                  <FormControl>
                    <Slider
                      min={1}
                      max={1.25}
                      step={0.01}
                      value={[field.value]}
                      onValueChange={(values) => {
                        field.onChange(values[0]);
                        onValueChange({ gear_multiplier: values[0] });
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Slayer Helm: 1.1667x, Salve (e): 1.16x, Salve (ei): 1.2x
                  </FormDescription>
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Target Stats */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Target Stats</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="target_defence_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Defence Level</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={500}
                      {...field}
                      onChange={(e) => {
                        if (!isFieldDisabled('target_defence_level')) {
                          const value = parseInt(e.target.value);
                          field.onChange(value);
                          onValueChange({ target_defence_level: value });
                        }
                      }}
                      disabled={isFieldDisabled('target_defence_level')}
                      className={bossLocked ? "opacity-50" : ""}
                      value={rangedParams.target_defence_level} // Ensure we display the actual store value
                    />
                  </FormControl>
                  {bossLocked && <FormDescription className="text-amber-500">Using target stats from boss</FormDescription>}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="target_ranged_defence_bonus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Ranged Defence Bonus</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={500}
                      {...field}
                      onChange={(e) => {
                        if (!isFieldDisabled('target_ranged_defence_bonus')) {
                          const value = parseInt(e.target.value);
                          field.onChange(value);
                          onValueChange({ target_ranged_defence_bonus: value });
                        }
                      }}
                      disabled={isFieldDisabled('target_ranged_defence_bonus')}
                      className={bossLocked ? "opacity-50" : ""}
                      value={rangedParams.target_ranged_defence_bonus} // Ensure we display the actual store value
                    />
                  </FormControl>
                  {bossLocked && <FormDescription className="text-amber-500">Using target stats from boss</FormDescription>}
                </FormItem>
              )}
            />
          </div>
        </div>
      </form>
    </Form>
  );
}