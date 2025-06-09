import { act } from '@testing-library/react';
import { useCalculatorStore } from '../store/calculator-store';

describe('calculator store', () => {
  it('updates parameters', () => {
    act(() => {
      useCalculatorStore.getState().setParams({ attack_speed: 3 });
    });
    expect(useCalculatorStore.getState().params.attack_speed).toBe(3);
  });

  it('adds comparison results', () => {
    act(() => {
      useCalculatorStore.getState().addComparisonResult('test', useCalculatorStore.getState().params, { dps:1, max_hit:1, hit_chance:1, attack_roll:1, defence_roll:1, average_hit:1 });
    });
    expect(useCalculatorStore.getState().comparisonResults.length).toBeGreaterThan(0);
  });

  it('switches combat styles and resets params', () => {
    act(() => {
      useCalculatorStore.getState().switchCombatStyle('ranged');
    });
    expect(useCalculatorStore.getState().params.combat_style).toBe('ranged');

    act(() => {
      useCalculatorStore.getState().switchCombatStyle('magic');
    });
    expect(useCalculatorStore.getState().params.combat_style).toBe('magic');
  });

  it('stores equipment loadout', () => {
    act(() => {
      useCalculatorStore.getState().setLoadout({ head: { id: 1, name: 'Bronze helm' } } as any);
    });
    expect(useCalculatorStore.getState().loadout.head?.name).toBe('Bronze helm');
    act(() => {
      useCalculatorStore.getState().setLoadout({});
    });
    expect(Object.keys(useCalculatorStore.getState().loadout).length).toBe(0);
  });
});
