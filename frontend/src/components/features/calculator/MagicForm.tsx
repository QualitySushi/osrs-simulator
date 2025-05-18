'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { useCalculatorStore } from '@/store/calculator-store';
import { MagicCalculatorParams } from '@/app/types/calculator';

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
  const { params, setParams, gearLocked, bossLocked } = useCalculatorStore();
  const magicParams = params as MagicCalculatorParams;

  // Initialize form with current store values
const form = useForm<MagicFormValues>({
  resolver: zodResolver(magicFormSchema),
  defaultValues: {
    magic_level: magicParams.magic_level || 99,
    magic_boost: magicParams.magic_boost || 0,
    magic_prayer: magicParams.magic_prayer || 1,
    base_spell_max_hit: magicParams.base_spell_max_hit || 0,
    magic_attack_bonus: magicParams.magic_attack_bonus || 0,
    magic_damage_bonus: magicParams.magic_damage_bonus || 0,
    attack_style_bonus_attack: magicParams.attack_style_bonus_attack || 0,
    attack_style_bonus_strength: magicParams.attack_style_bonus_strength || 0,
    attack_style_bonus: magicParams.attack_style_bonus || magicParams.attack_style_bonus_attack || 0, // Add this
    void_magic: magicParams.void_magic || false,
    shadow_bonus: magicParams.shadow_bonus || 0,
    virtus_bonus: magicParams.virtus_bonus || 0,
    tome_bonus: magicParams.tome_bonus || 0,
    prayer_bonus: magicParams.prayer_bonus || 0,
    elemental_weakness: magicParams.elemental_weakness || 0,
    target_magic_level: magicParams.target_magic_level || 1,
    target_magic_defence: magicParams.target_magic_defence || 0,
    attack_speed: magicParams.attack_speed || 2.4,
    spellbook: magicParams.spellbook || 'standard',
    spell_type: magicParams.spell_type || 'offensive',
    god_spell_charged: magicParams.god_spell_charged || false
  },
});

  // Update form when store changes
  useEffect(() => {
    form.reset({
      ...form.getValues(),
      magic_attack_bonus: magicParams.magic_attack_bonus || 0,
      magic_damage_bonus: magicParams.magic_damage_bonus || 0,
      target_magic_level: magicParams.target_magic_level || 1,
      target_magic_defence: magicParams.target_magic_defence || 0,
      base_spell_max_hit: magicParams.base_spell_max_hit || 0,
    });
  }, [
    magicParams.magic_attack_bonus,
    magicParams.magic_damage_bonus,
    magicParams.target_magic_level,
    magicParams.target_magic_defence,
    magicParams.base_spell_max_hit,
    form,
    magicParams
  ]);

  // Update store when form values change (but only if not locked)
  const onValueChange = (values: Partial<MagicFormValues>) => {
    const updatedValues = { ...values };
    if (gearLocked) {
      delete updatedValues.magic_attack_bonus;
      delete updatedValues.magic_damage_bonus;
    }
    if (bossLocked) {
      delete updatedValues.target_magic_level;
      delete updatedValues.target_magic_defence;
    }
    if (Object.keys(updatedValues).length > 0) {
      console.log('[DEBUG] Updating magic params:', updatedValues);
      setParams(updatedValues);
    }
  };

  // Helper to check if field should be disabled
  const isFieldDisabled = (fieldName: string) => {
    // Equipment stat fields should be disabled when gear is locked
    if (gearLocked && ['magic_attack_bonus', 'magic_damage_bonus'].includes(fieldName)) {
      return true;
    }
    
    // Target stat fields should be disabled when boss is locked
    if (bossLocked && ['target_magic_level', 'target_magic_defence'].includes(fieldName)) {
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
              name="magic_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Magic Level: {field.value}</FormLabel>
                  <FormControl>
                    <Slider
                      min={1}
                      max={99}
                      step={1}
                      value={[field.value || 0]}
                      onValueChange={(values) => {
                        field.onChange(values[0]);
                        onValueChange({ magic_level: values[0] });
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

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
                      value={[field.value || 0]}
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
                  <FormLabel>Prayer Bonus: {((field.value || 1) * 100 - 100).toFixed(0)}%</FormLabel>
                  <FormControl>
                    <Slider
                      min={1}
                      max={1.25}
                      step={0.01}
                      value={[field.value || 1]}
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
                      value={field.value || 2.4}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value || "0");
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
                    value={field.value || 'standard'}
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
                    value={field.value || 'offensive'}
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
                      value={field.value || 0}
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
            <h3 className="text-lg font-semibold">Equipment Stats</h3>
            
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
                      className={gearLocked ? "opacity-50" : ""}
                    />
                  </FormControl>
                  {gearLocked && <FormDescription className="text-amber-500">Using equipment bonuses</FormDescription>}
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
                      value={Math.round((magicParams.magic_damage_bonus || 0) * 100)}
                      onChange={(e) => {
                        if (!isFieldDisabled('magic_damage_bonus')) {
                          // Convert percentage to decimal (e.g. 20 → 0.2)
                          const value = parseInt(e.target.value || "0") / 100;
                          field.onChange(value);
                          onValueChange({ magic_damage_bonus: value });
                        }
                      }}
                      disabled={isFieldDisabled('magic_damage_bonus')}
                      className={gearLocked ? "opacity-50" : ""}
                    />
                  </FormControl>
                  {gearLocked && <FormDescription className="text-amber-500">Using equipment bonuses</FormDescription>}
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
                <FormLabel>Attack Style Bonus (Attack): {field.value || 0}</FormLabel>
                <FormControl>
                    <Slider
                    min={0}
                    max={3}
                    step={1}
                    value={[field.value || 0]}
                    onValueChange={(values) => {
                        field.onChange(values[0]);
                        onValueChange({ 
                        attack_style_bonus_attack: values[0],
                        attack_style_bonus: values[0] // This is now included in the form schema
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
                      Elite Void Magic gives 2.5% accuracy and damage
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value || false}
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
                  <FormLabel>Tumeken&apos;s Shadow Bonus: {((field.value || 0) * 100).toFixed(0)}%</FormLabel>
                  <FormControl>
                    <Slider
                      min={0}
                      max={0.5}
                      step={0.01}
                      value={[field.value || 0]}
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
              name="tome_bonus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tome of Fire Bonus: {((field.value || 0) * 100).toFixed(0)}%</FormLabel>
                  <FormControl>
                    <Slider
                      min={0}
                      max={0.5}
                      step={0.01}
                      value={[field.value || 0]}
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
          <h3 className="text-lg font-semibold">Target Stats</h3>
          
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
                      className={bossLocked ? "opacity-50" : ""}
                    />
                  </FormControl>
                  {bossLocked && <FormDescription className="text-amber-500">Using target stats from boss</FormDescription>}
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
                      className={bossLocked ? "opacity-50" : ""}
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