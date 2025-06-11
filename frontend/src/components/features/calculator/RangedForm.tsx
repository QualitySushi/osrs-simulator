'use client';

import { z } from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel
} from '@/components/ui/form';
import { safeFixed } from '@/utils/format';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useCombatForm } from '@/hooks/useCombatForm';
import { RangedCalculatorParams } from '@/types/calculator';

// Zod schema for ranged form validation
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
  target_defence_bonus: z.number().min(0).max(500),
  attack_speed: z.number().min(1).max(10),
});

type RangedFormValues = z.infer<typeof rangedFormSchema>;

export function RangedForm() {
  // Create default values from the initial store state
  const defaultValues: RangedFormValues = {
    ranged_level: 99,
    ranged_boost: 0,
    ranged_prayer: 1.0,
    ranged_strength_bonus: 0,
    ranged_attack_bonus: 0,
    attack_style_bonus_attack: 0,
    attack_style_bonus_strength: 0,
    void_ranged: false,
    gear_multiplier: 1.0,
    special_multiplier: 1.0,
    target_defence_level: 1,
    target_defence_bonus: 0,
    attack_speed: 2.4,
  };

  // Use the shared form hook
  const {
    form,
    onValueChange,
    isFieldDisabled,
    params
  } = useCombatForm<RangedFormValues>({
    combatStyle: 'ranged',
    formSchema: rangedFormSchema,
    defaultValues,
    gearLockedFields: ['ranged_strength_bonus', 'ranged_attack_bonus'],
    npcLockedFields: ['target_defence_level', 'target_defence_bonus'],
  });

  const rangedParams = params as RangedCalculatorParams;

  return (
    <Form {...form}>
      <form className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Player Stats Section */}
          <div className="space-y-4">
            <h3 className="text-3xl font-semibold m-6">Player Stats</h3>
            
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
                  <FormLabel>Prayer Bonus: {safeFixed(field.value * 100 - 100, 0)}%</FormLabel>
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
            <h3 className="text-3xl font-semibold m-6">Equipment Stats</h3>
            
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
                      className={isFieldDisabled('ranged_strength_bonus') ? "opacity-50" : ""}
                      value={rangedParams.ranged_strength_bonus} // Ensure we display the actual store value
                    />
                  </FormControl>
                  {isFieldDisabled('ranged_strength_bonus') && <FormDescription className="text-amber-500">Using equipment bonuses</FormDescription>}
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
                      className={isFieldDisabled('ranged_attack_bonus') ? "opacity-50" : ""}
                      value={rangedParams.ranged_attack_bonus} // Ensure we display the actual store value
                    />
                  </FormControl>
                  {isFieldDisabled('ranged_attack_bonus') && <FormDescription className="text-amber-500">Using equipment bonuses</FormDescription>}
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
          </div>
        </div>

        {/* Target Stats */}
        <div className="space-y-4">
          <h3 className="text-3xl font-semibold m-16">Target Stats</h3>
          
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
                      className={isFieldDisabled('target_defence_level') ? "opacity-50" : ""}
                      value={rangedParams.target_defence_level} // Ensure we display the actual store value
                    />
                  </FormControl>
                  {isFieldDisabled('target_defence_level') && <FormDescription className="text-amber-500">Using target stats from npc</FormDescription>}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="target_defence_bonus"
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
                        if (!isFieldDisabled('target_defence_bonus')) {
                          const value = parseInt(e.target.value);
                          field.onChange(value);
                          onValueChange({ target_defence_bonus: value });
                        }
                      }}
                      disabled={isFieldDisabled('target_defence_bonus')}
                      className={isFieldDisabled('target_defence_bonus') ? "opacity-50" : ""}
                      value={rangedParams.target_defence_bonus} // Ensure we display the actual store value
                    />
                  </FormControl>
                  {isFieldDisabled('target_defence_bonus') && <FormDescription className="text-amber-500">Using target stats from npc</FormDescription>}
                </FormItem>
              )}
            />
          </div>
        </div>
      </form>
    </Form>
  );
}