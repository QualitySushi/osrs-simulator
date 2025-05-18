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
import { MeleeCalculatorParams } from '@/app/types/calculator';

// Zod schema for validation
const meleeFormSchema = z.object({
  strength_level: z.number().min(1).max(99),
  strength_boost: z.number().min(0).max(20),
  strength_prayer: z.number().min(1).max(1.25),
  attack_level: z.number().min(1).max(99),
  attack_boost: z.number().min(0).max(20),
  attack_prayer: z.number().min(1).max(1.25),
  melee_strength_bonus: z.number().min(0).max(200),
  melee_attack_bonus: z.number().min(0).max(200),
  attack_style_bonus_attack: z.number().min(0).max(3),
  attack_style_bonus_strength: z.number().min(0).max(3),
  void_melee: z.boolean(),
  gear_multiplier: z.number().min(1).max(2),
  special_multiplier: z.number().min(1).max(2),
  target_defence_level: z.number().min(0).max(500),
  target_defence_bonus: z.number().min(0).max(500),
  attack_speed: z.number().min(1).max(10),
});

type MeleeFormValues = z.infer<typeof meleeFormSchema>;

export function MeleeForm() {
  const { params, setParams, gearLocked, bossLocked } = useCalculatorStore();
  const meleeParams = params as MeleeCalculatorParams;

  // Initialize form with current store values
  const form = useForm<MeleeFormValues>({
    resolver: zodResolver(meleeFormSchema),
    defaultValues: {
      strength_level: meleeParams.strength_level,
      strength_boost: meleeParams.strength_boost,
      strength_prayer: meleeParams.strength_prayer,
      attack_level: meleeParams.attack_level,
      attack_boost: meleeParams.attack_boost,
      attack_prayer: meleeParams.attack_prayer,
      melee_strength_bonus: meleeParams.melee_strength_bonus,
      melee_attack_bonus: meleeParams.melee_attack_bonus,
      attack_style_bonus_attack: meleeParams.attack_style_bonus_attack,
      attack_style_bonus_strength: meleeParams.attack_style_bonus_strength,
      void_melee: meleeParams.void_melee || false,
      gear_multiplier: meleeParams.gear_multiplier || 1.0,
      special_multiplier: meleeParams.special_multiplier || 1.0,
      target_defence_level: meleeParams.target_defence_level,
      target_defence_bonus: meleeParams.target_defence_bonus,
      attack_speed: meleeParams.attack_speed,
    },
  });

  // Update form values when store changes (e.g., when a boss is selected or gear is added)
  useEffect(() => {
    form.reset({
      ...form.getValues(),
      melee_strength_bonus: meleeParams.melee_strength_bonus,
      melee_attack_bonus: meleeParams.melee_attack_bonus,
      target_defence_level: meleeParams.target_defence_level,
      target_defence_bonus: meleeParams.target_defence_bonus,
    });
  }, [
    meleeParams.melee_strength_bonus, 
    meleeParams.melee_attack_bonus, 
    meleeParams.target_defence_level, 
    meleeParams.target_defence_bonus,
    form,
    meleeParams
  ]);

  // Update store when form values change (but only if not locked)
  const onValueChange = (values: Partial<MeleeFormValues>) => {
    // Determine which values to update based on lock status
    const updatedValues: Partial<MeleeFormValues> = { ...values };
    
    // Don't update gear stats if gear is locked
    if (gearLocked) {
      delete updatedValues.melee_strength_bonus;
      delete updatedValues.melee_attack_bonus;
    }
    
    // Don't update target stats if boss is locked
    if (bossLocked) {
      delete updatedValues.target_defence_level;
      delete updatedValues.target_defence_bonus;
    }
    
    // Only update the store with non-locked values
    if (Object.keys(updatedValues).length > 0) {
      setParams(updatedValues);
    }
  };

  // Helper to check if field should be disabled
  const isFieldDisabled = (fieldName: string) => {
    // Equipment stat fields should be disabled when gear is locked
    if (gearLocked && ['melee_strength_bonus', 'melee_attack_bonus'].includes(fieldName)) {
      return true;
    }
    
    // Target stat fields should be disabled when boss is locked
    if (bossLocked && ['target_defence_level', 'target_defence_bonus'].includes(fieldName)) {
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
              name="strength_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Strength Level: {field.value}</FormLabel>
                  <FormControl>
                    <Slider
                      min={1}
                      max={99}
                      step={1}
                      value={[field.value]}
                      onValueChange={(values) => {
                        field.onChange(values[0]);
                        onValueChange({ strength_level: values[0] });
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="strength_boost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Strength Boost: {field.value}</FormLabel>
                  <FormControl>
                    <Slider
                      min={0}
                      max={20}
                      step={1}
                      value={[field.value]}
                      onValueChange={(values) => {
                        field.onChange(values[0]);
                        onValueChange({ strength_boost: values[0] });
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Super Strength: 5, Super Combat: 5, Overload: 6+
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="attack_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Attack Level: {field.value}</FormLabel>
                  <FormControl>
                    <Slider
                      min={1}
                      max={99}
                      step={1}
                      value={[field.value]}
                      onValueChange={(values) => {
                        field.onChange(values[0]);
                        onValueChange({ attack_level: values[0] });
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="attack_boost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Attack Boost: {field.value}</FormLabel>
                  <FormControl>
                    <Slider
                      min={0}
                      max={20}
                      step={1}
                      value={[field.value]}
                      onValueChange={(values) => {
                        field.onChange(values[0]);
                        onValueChange({ attack_boost: values[0] });
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Super Attack: 5, Super Combat: 5, Overload: 6+
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
              name="melee_strength_bonus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Melee Strength Bonus</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={200}
                      {...field}
                      onChange={(e) => {
                        if (!isFieldDisabled('melee_strength_bonus')) {
                          const value = parseInt(e.target.value);
                          field.onChange(value);
                          onValueChange({ melee_strength_bonus: value });
                        }
                      }}
                      disabled={isFieldDisabled('melee_strength_bonus')}
                      className={gearLocked ? "opacity-50" : ""}
                      value={meleeParams.melee_strength_bonus} // Ensure we display the actual store value
                    />
                  </FormControl>
                  {gearLocked && <FormDescription className="text-amber-500">Using equipment bonuses</FormDescription>}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="melee_attack_bonus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Melee Attack Bonus</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={200}
                      {...field}
                      onChange={(e) => {
                        if (!isFieldDisabled('melee_attack_bonus')) {
                          const value = parseInt(e.target.value);
                          field.onChange(value);
                          onValueChange({ melee_attack_bonus: value });
                        }
                      }}
                      disabled={isFieldDisabled('melee_attack_bonus')}
                      className={gearLocked ? "opacity-50" : ""}
                      value={meleeParams.melee_attack_bonus} // Ensure we display the actual store value
                    />
                  </FormControl>
                  {gearLocked && <FormDescription className="text-amber-500">Using equipment bonuses</FormDescription>}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="void_melee"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Void Melee</FormLabel>
                    <FormDescription>
                      Elite Void Melee gives 10% accuracy and damage
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        onValueChange({ void_melee: checked });
                      }}
                    />
                  </FormControl>
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
                      value={meleeParams.target_defence_level} // Ensure we display the actual store value
                    />
                  </FormControl>
                  {bossLocked && <FormDescription className="text-amber-500">Using target stats from boss</FormDescription>}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="target_defence_bonus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Defence Bonus</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={500}
                      {...field}
                      onChange={(e) => {
                        if (!isFieldDisabled('target_defence_bonus')) {
                          const value = parseInt(e.target.value);
                          field.onChange(value);
                          onValueChange({ target_defence_bonus: value });
                        }
                      }}
                      disabled={isFieldDisabled('target_defence_bonus')}
                      className={bossLocked ? "opacity-50" : ""}
                      value={meleeParams.target_defence_bonus} // Ensure we display the actual store value
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