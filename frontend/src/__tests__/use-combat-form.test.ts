import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { z } from 'zod';
import { useCombatForm } from '../hooks/useCombatForm';
import { useCalculatorStore } from '../store/calculator-store';

type FormValues = {
  magic_attack_bonus: number;
  target_magic_level: number;
};

const schema = z.object({
  magic_attack_bonus: z.number(),
  target_magic_level: z.number(),
});

const defaultValues: FormValues = {
  magic_attack_bonus: 0,
  target_magic_level: 0,
};

describe('useCombatForm hook', () => {
  beforeEach(() => {
    act(() => {
      useCalculatorStore.getState().switchCombatStyle('magic');
      useCalculatorStore.getState().resetLocks();
      useCalculatorStore.getState().setParams({
        magic_attack_bonus: 0,
        target_magic_level: 0,
      } as any);
    });
  });

  it('updates store values when not locked', () => {
    const { result } = renderHook(() =>
      useCombatForm<FormValues>({
        combatStyle: 'magic',
        formSchema: schema,
        defaultValues,
        gearLockedFields: ['magic_attack_bonus'],
        bossLockedFields: ['target_magic_level'],
      })
    );

    act(() => {
      result.current.onValueChange({
        magic_attack_bonus: 50,
        target_magic_level: 75,
      });
    });

    const state = useCalculatorStore.getState().params as any;
    expect(state.magic_attack_bonus).toBe(50);
    expect(state.target_magic_level).toBe(75);
  });

  it('respects gear and boss locks', () => {
    const { result } = renderHook(() =>
      useCombatForm<FormValues>({
        combatStyle: 'magic',
        formSchema: schema,
        defaultValues,
        gearLockedFields: ['magic_attack_bonus'],
        bossLockedFields: ['target_magic_level'],
      })
    );

    act(() => {
      useCalculatorStore.getState().lockGear();
      useCalculatorStore.getState().lockBoss();
    });

    act(() => {
      result.current.onValueChange({
        magic_attack_bonus: 60,
        target_magic_level: 80,
      });
    });

    const state = useCalculatorStore.getState().params as any;
    expect(state.magic_attack_bonus).toBe(0);
    expect(state.target_magic_level).toBe(0);
  });
});
