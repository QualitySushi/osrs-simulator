import { useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCalculatorStore } from '@/store/calculator-store';
import { CombatStyle, CalculatorParams } from '@/types/calculator';
import { FieldValues, DefaultValues } from 'react-hook-form';

// Common field validation types - we'll keep these for reference even if not directly used
export const CommonFieldValidations = {
  combatLevel: z.number().min(1).max(99),
  boost: z.number().min(0).max(20),
  prayer: z.number().min(1).max(1.25),
  attackBonus: z.number().min(-100).max(200),
  strengthBonus: z.number().min(-100).max(200),
  damageBonus: z.number().min(0).max(1),
  styleBonus: z.number().min(0).max(3),
  targetDefence: z.number().min(0).max(500),
  targetBonus: z.number().min(-100).max(500),
  attackSpeed: z.number().min(1).max(10),
  boolFlag: z.boolean(),
  multiplier: z.number().min(1).max(2),
};

export type CombatFormFields = Record<string, unknown>;

// Options for the form hook
export interface UseCombatFormOptions<T extends FieldValues> {
  // Combat style this form is for
  combatStyle: CombatStyle;
  
  // Schema for form fields
  formSchema: z.ZodType<T>;
  
  // Default values for form fields
  defaultValues: DefaultValues<T>;
  
  // Mapping of equipment fields to check gearLocked status
  gearLockedFields: string[];
  
  // Mapping of target fields to check bossLocked status
  bossLockedFields: string[];
}

export interface UseCombatFormResult<T extends FieldValues> {
  // React Hook Form object
  form: ReturnType<typeof useForm<T>>;
  
  // Helper functions
  onValueChange: (values: Partial<T>) => void;
  isFieldDisabled: (fieldName: string) => boolean;
  
  // Store access
  params: CalculatorParams;
  setParams: (params: Partial<CalculatorParams>) => void;
  gearLocked: boolean;
  bossLocked: boolean;
}

/**
 * Custom hook for handling combat forms
 */
export function useCombatForm<T extends FieldValues>({
  combatStyle,
  formSchema,
  defaultValues,
  gearLockedFields,
  bossLockedFields
}: UseCombatFormOptions<T>): UseCombatFormResult<T> {
  const { params, setParams, gearLocked, bossLocked } = useCalculatorStore();
  
  // Initialize form with validation
  const form = useForm<T>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });
  
// Type for the record that can be indexed by string
type ParamsRecord = Record<string, unknown>;

  // Update form values when store changes
  useEffect(() => {
    const storeValues: Partial<T> = {};
    
    // Extract values from the store that match form fields
    Object.keys(defaultValues || {}).forEach(key => {
      const storeKey = key as keyof typeof params;
      if (storeKey in params) {
        // Convert to Record<string, unknown>
        const paramsAsRecord = params as unknown as ParamsRecord;
        (storeValues as ParamsRecord)[key] = paramsAsRecord[storeKey as string];
      }
    });
    
    // Reset form with new values
    const current = form.getValues();
    const merged = { ...current };

    for (const key of Object.keys(storeValues)) {
      const isGearLockedField = gearLocked && gearLockedFields.includes(key);
      const isBossLockedField = bossLocked && bossLockedFields.includes(key);

      if (!isGearLockedField && !isBossLockedField) {
        merged[key] = storeValues[key];
      }
    }

    const hasDiff = Object.keys(merged).some(
      key => merged[key] !== current[key]
    );

    if (hasDiff) {
      form.reset(merged);
    }
  }, [form, params, defaultValues]);
  
  // Handler for when form values change
  const onValueChange = useCallback((values: Partial<T>) => {
    // Determine which values to update based on lock status
    const updatedValues = { ...values };
    const updatedValuesRecord = updatedValues as ParamsRecord;
    
    // Don't update gear stats if gear is locked
    if (gearLocked) {
      gearLockedFields.forEach(field => {
        delete updatedValuesRecord[field];
      });
    }
    
    // Don't update target stats if boss is locked
    if (bossLocked) {
      bossLockedFields.forEach(field => {
        delete updatedValuesRecord[field];
      });
    }
    
    // Only update the store if there are remaining values
    if (Object.keys(updatedValues).length > 0) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEBUG] Setting ${combatStyle} params:`, updatedValues);
      }
      // Set parameters in the store - use type assertion for safety
      setParams(updatedValues as unknown as Partial<CalculatorParams>);
    }
  }, [setParams, gearLocked, bossLocked, gearLockedFields, bossLockedFields, combatStyle]);
  
  // Helper to check if field should be disabled
  const isFieldDisabled = useCallback((fieldName: string) => {
    // Equipment stat fields should be disabled when gear is locked
    if (gearLocked && gearLockedFields.includes(fieldName)) {
      return true;
    }
    
    // Target stat fields should be disabled when boss is locked
    if (bossLocked && bossLockedFields.includes(fieldName)) {
      return true;
    }
    
    return false;
  }, [gearLocked, bossLocked, gearLockedFields, bossLockedFields]);
  
  return {
    form,
    onValueChange,
    isFieldDisabled,
    params,
    setParams,
    gearLocked,
    bossLocked
  };
}