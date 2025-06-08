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
});
