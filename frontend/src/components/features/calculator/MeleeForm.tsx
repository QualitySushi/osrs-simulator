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
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useCombatForm } from '@/hooks/useCombatForm';
import { MeleeCalculatorParams } from '@/types/calculator';

// Zod schema for melee form validation
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
  // Create default values from the initial store state
  const defaultValues: MeleeFormValues = {
    strength_level: 99,
    strength_boost: 0,
    strength_prayer: 1.0,
    attack_level: 99,
    attack_boost: 0,
    attack_prayer: 1.0,
    melee_strength_bonus: 0,
    melee_attack_bonus: 0,
    attack_style_bonus_attack: 0,
    attack_style_bonus_strength: 0,
    void_melee: false,
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
  } = useCombatForm<MeleeFormValues>({
    combatStyle: 'melee',
    formSchema: meleeFormSchema,
    defaultValues,
    gearLockedFields: ['melee_strength_bonus', 'melee_attack_bonus'],
    bossLockedFields: ['target_defence_level', 'target_defence_bonus'],
  });

  const meleeParams = params as MeleeCalculatorParams;

  return (
    <Form {...form}>
      <form className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Player Stats Section */}
          <div className="space-y-4">
            <h3 className="text-3xl font-semibold m-6">Player Stats</h3>
            
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
            <h3 className="text-3xl font-semibold m-6">Equipment Stats</h3>
            
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
                      className={isFieldDisabled('melee_strength_bonus') ? "opacity-50" : ""}
                      value={meleeParams.melee_strength_bonus} // Ensure we display the actual store value
                    />
                  </FormControl>
                  {isFieldDisabled('melee_strength_bonus') && <FormDescription className="text-amber-500">Using equipment bonuses</FormDescription>}
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
                      className={isFieldDisabled('melee_attack_bonus') ? "opacity-50" : ""}
                      value={meleeParams.melee_attack_bonus} // Ensure we display the actual store value
                    />
                  </FormControl>
                  {isFieldDisabled('melee_attack_bonus') && <FormDescription className="text-amber-500">Using equipment bonuses</FormDescription>}
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
                      value={meleeParams.target_defence_level} // Ensure we display the actual store value
                    />
                  </FormControl>
                  {isFieldDisabled('target_defence_level') && <FormDescription className="text-amber-500">Using target stats from boss</FormDescription>}
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
                      className={isFieldDisabled('target_defence_bonus') ? "opacity-50" : ""}
                      value={meleeParams.target_defence_bonus} // Ensure we display the actual store value
                    />
                  </FormControl>
                  {isFieldDisabled('target_defence_bonus') && <FormDescription className="text-amber-500">Using target stats from boss</FormDescription>}
                </FormItem>
              )}
            />
          </div>
        </div>
      </form>
    </Form>
  );
}