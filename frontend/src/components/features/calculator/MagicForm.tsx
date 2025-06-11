'use client';

import { z } from 'zod';
import { 
  Form, 
  FormControl,  
  FormField, 
  FormItem, 
  FormLabel,
  FormDescription
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCombatForm } from '@/hooks/useCombatForm';
import { MagicCalculatorParams } from '@/types/calculator';
import { useEffect } from 'react';

// Magic form schema for validation
const magicFormSchema = z.object({
  magic_level: z.number().min(1).max(99),
  magic_boost: z.number().min(0).max(20),
  magic_prayer: z.number().min(1).max(1.25),
  base_spell_max_hit: z.number().min(0).max(100),
  magic_attack_bonus: z.number().min(-100).max(200),
  magic_damage_bonus: z.number().min(0).max(1),
  attack_style_bonus_attack: z.number().min(0).max(3),
  attack_style_bonus_strength: z.number().min(0).max(3),
  attack_style_bonus: z.number().min(0).max(3),
  void_magic: z.boolean(),
  shadow_bonus: z.number().min(0).max(1),
  virtus_bonus: z.number().min(0).max(0.09),
  tome_bonus: z.number().min(0).max(0.5),
  prayer_bonus: z.number().min(0).max(0.2),
  elemental_weakness: z.number().min(0).max(0.5),
  target_magic_level: z.number().min(0).max(500),
  target_magic_defence: z.number().min(-100).max(500),
  attack_speed: z.number().min(1).max(10),
  spellbook: z.enum(['standard', 'ancient', 'lunars']),
  spell_type: z.enum(['offensive', 'defensive']),
  god_spell_charged: z.boolean()
});

type MagicFormValues = z.infer<typeof magicFormSchema>;

export function MagicForm() {
  // Use the shared form hook with magic-specific options
  const {
    form,
    onValueChange,
    isFieldDisabled,
    params
  } = useCombatForm<MagicFormValues>({
    combatStyle: 'magic',
    formSchema: magicFormSchema,
    defaultValues: {
      magic_level: 99,
      magic_boost: 0,
      magic_prayer: 1,
      base_spell_max_hit: 24, // Default to Fire Surge
      magic_attack_bonus: 0,
      magic_damage_bonus: 0,
      attack_style_bonus_attack: 0,
      attack_style_bonus_strength: 0,
      attack_style_bonus: 0,
      void_magic: false,
      shadow_bonus: 0,
      virtus_bonus: 0,
      tome_bonus: 0,
      prayer_bonus: 0,
      elemental_weakness: 0,
      target_magic_level: 1,
      target_magic_defence: 0,
      attack_speed: 3.0, // Standard spellbook speed
      spellbook: 'standard',
      spell_type: 'offensive',
      god_spell_charged: false
    },
    gearLockedFields: ['magic_attack_bonus', 'magic_damage_bonus'],
    bossLockedFields: ['target_magic_level', 'target_magic_defence'],
  });

  // Cast params to magic params for type safety
  const magicParams = params as MagicCalculatorParams;

  // Log gear bonuses only during development
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEBUG] Magic gear bonuses from store:', {
        magic_attack_bonus: magicParams.magic_attack_bonus,
        magic_damage_bonus: magicParams.magic_damage_bonus,
        attack_style_bonus_attack: magicParams.attack_style_bonus_attack,
        attack_style_bonus_strength: magicParams.attack_style_bonus_strength,
        attack_speed: magicParams.attack_speed,
      });
    }
  }, [
    magicParams.magic_attack_bonus,
    magicParams.magic_damage_bonus,
    magicParams.attack_style_bonus_attack,
    magicParams.attack_style_bonus_strength,
    magicParams.attack_speed
  ]);

  return (
    <Form {...form}>
      <form className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Player Stats Section */}
          <div className="space-y-4">
            <h3 className="text-3xl font-semibold m-6">Player Stats</h3>
            
            <FormField
              control={form.control}
              name="magic_boost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Magic Boost: {field.value}</FormLabel>
                  <FormControl>
                    <Slider
                      min={0}
                      max={20}
                      step={1}
                      value={[field.value]}
                      onValueChange={(values) => {
                        field.onChange(values[0]);
                        onValueChange({ magic_boost: values[0] });
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Magic potion: 4, Ancient brew: 2, Forgotten brew: 3
                  </FormDescription>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="magic_prayer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prayer Bonus: {((field.value * 100) - 100).toFixed(0)}%</FormLabel>
                  <FormControl>
                    <Slider
                      min={1}
                      max={1.25}
                      step={0.01}
                      value={[field.value]}
                      onValueChange={(values) => {
                        field.onChange(values[0]);
                        onValueChange({ magic_prayer: values[0] });
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    None: 0%, Mystic Might: 15%, Augury: 25%
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
                      value={field.value}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value || "3.0");
                        field.onChange(value);
                        onValueChange({ attack_speed: value });
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Standard: 3.0s, Trident: 2.4s, Harmonised: 1.8s
                  </FormDescription>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="spellbook"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Spellbook</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value: 'standard' | 'ancient' | 'lunars') => {
                      field.onChange(value);
                      onValueChange({ spellbook: value });
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select spellbook" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="ancient">Ancient</SelectItem>
                      <SelectItem value="lunars">Lunar</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="spell_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Spell Type</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value: 'offensive' | 'defensive') => {
                      field.onChange(value);
                      onValueChange({ spell_type: value });
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select spell type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="offensive">Offensive</SelectItem>
                      <SelectItem value="defensive">Defensive</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="base_spell_max_hit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base Spell Max Hit</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={field.value}
                      onChange={(e) => {
                        const value = parseInt(e.target.value || "0");
                        field.onChange(value);
                        onValueChange({ base_spell_max_hit: value });
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Fire Surge: 24, Trident: 25, Tumeken&apos;s Shadow: 29
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
              name="magic_attack_bonus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Magic Attack Bonus</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={-100}
                      max={200}
                      value={magicParams.magic_attack_bonus || 0}
                      onChange={(e) => {
                        if (!isFieldDisabled('magic_attack_bonus')) {
                          const value = parseInt(e.target.value || "0");
                          field.onChange(value);
                          onValueChange({ magic_attack_bonus: value });
                        }
                      }}
                      disabled={isFieldDisabled('magic_attack_bonus')}
                      className={isFieldDisabled('magic_attack_bonus') ? "opacity-50" : ""}
                    />
                  </FormControl>
                  {isFieldDisabled('magic_attack_bonus') && <FormDescription className="text-amber-500">Using equipment bonuses</FormDescription>}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="magic_damage_bonus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Magic Damage Bonus (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={Math.round((magicParams.magic_damage_bonus ?? 0) * 100)}
                      onChange={(e) => {
                        const percent = parseInt(e.target.value || '0') / 100;
                        if (!isFieldDisabled('magic_damage_bonus')) {
                          field.onChange(percent); // update the form
                          onValueChange({ magic_damage_bonus: percent }); // update the store
                        }
                      }}
                      disabled={isFieldDisabled('magic_damage_bonus')}
                      className={isFieldDisabled('magic_damage_bonus') ? "opacity-50" : ""}
                    />
                  </FormControl>
                  {isFieldDisabled('magic_damage_bonus') && <FormDescription className="text-amber-500">Using equipment bonuses</FormDescription>}
                  <FormDescription>
                    Occult: 10%, Tormented: 5%, Ancestral: 6%
                  </FormDescription>
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
                        onValueChange({ 
                          attack_style_bonus_attack: values[0],
                          attack_style_bonus: values[0] // Also update the backend field
                        });
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Accurate: +3, Longrange: 0
                  </FormDescription>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="void_magic"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Void Magic</FormLabel>
                    <FormDescription>
                      Elite Void Magic gives 45% accuracy and 2.5% damage
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        onValueChange({ void_magic: checked });
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="shadow_bonus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tumeken&apos;s Shadow Bonus: {(field.value * 100).toFixed(0)}%</FormLabel>
                  <FormControl>
                    <Slider
                      min={0}
                      max={0.5}
                      step={0.01}
                      value={[field.value]}
                      onValueChange={(values) => {
                        field.onChange(values[0]);
                        onValueChange({ shadow_bonus: values[0] });
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    0% for no Shadow, 50% for Shadow
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="virtus_bonus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Virtus Set Bonus: {(field.value * 100).toFixed(0)}%</FormLabel>
                  <FormControl>
                    <Slider
                      min={0}
                      max={0.09}
                      step={0.03}
                      value={[field.value]}
                      onValueChange={(values) => {
                        field.onChange(values[0]);
                        onValueChange({ virtus_bonus: values[0] });
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    3% per piece for Ancient Magicks
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tome_bonus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tome of Fire Bonus: {(field.value * 100).toFixed(0)}%</FormLabel>
                  <FormControl>
                    <Slider
                      min={0}
                      max={0.5}
                      step={0.01}
                      value={[field.value]}
                      onValueChange={(values) => {
                        field.onChange(values[0]);
                        onValueChange({ tome_bonus: values[0] });
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    0% for no Tome, 50% for Tome with fire spells
                  </FormDescription>
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Target Stats */}
        <div className="space-y-4">
          <h3 className="text-4xl font-semibold m-16">Target Stats</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="target_magic_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Magic Level</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={500}
                      value={magicParams.target_magic_level || 1}
                      onChange={(e) => {
                        if (!isFieldDisabled('target_magic_level')) {
                          const value = parseInt(e.target.value || "0");
                          field.onChange(value);
                          onValueChange({ target_magic_level: value });
                        }
                      }}
                      disabled={isFieldDisabled('target_magic_level')}
                      className={isFieldDisabled('target_magic_level') ? "opacity-50" : ""}
                    />
                  </FormControl>
                  {isFieldDisabled('target_magic_level') && <FormDescription className="text-amber-500">Using target stats from boss</FormDescription>}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="target_magic_defence"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Magic Defence Bonus</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={-100}
                      max={500}
                      value={magicParams.target_magic_defence || 0}
                      onChange={(e) => {
                        if (!isFieldDisabled('target_magic_defence')) {
                          const value = parseInt(e.target.value || "0");
                          field.onChange(value);
                          onValueChange({ target_magic_defence: value });
                        }
                      }}
                      disabled={isFieldDisabled('target_magic_defence')}
                      className={isFieldDisabled('target_magic_defence') ? "opacity-50" : ""}
                    />
                  </FormControl>
                  {isFieldDisabled('target_magic_defence') && <FormDescription className="text-amber-500">Using target stats from boss</FormDescription>}
                </FormItem>
              )}
            />
          </div>
        </div>
      </form>
    </Form>
  );
}