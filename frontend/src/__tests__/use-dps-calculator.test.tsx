import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDpsCalculator } from '../hooks/useDpsCalculator';
import { calculatorApi } from '../services/api';
import { useCalculatorStore } from '../store/calculator-store';

jest.mock('../services/api');
jest.mock('../hooks/use-toast', () => ({
  useToast: () => ({
    toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  }),
}));

const mockedApi = calculatorApi as jest.Mocked<typeof calculatorApi>;

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const client = new QueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

describe('useDpsCalculator hook', () => {
  beforeEach(() => {
    useCalculatorStore.getState().resetParams();
    useCalculatorStore.getState().setResults(null);
  });

  it('switches combat styles', () => {
    const { result } = renderHook(() => useDpsCalculator(), { wrapper });
    act(() => {
      result.current.handleTabChange('ranged');
    });
    expect(result.current.activeTab).toBe('ranged');
    expect(useCalculatorStore.getState().params.combat_style).toBe('ranged');
  });

  it('calculates DPS and stores results', async () => {
    mockedApi.calculateDps.mockResolvedValueOnce({
      dps: 5,
      max_hit: 20,
      hit_chance: 0.5,
      attack_roll: 1,
      defence_roll: 1,
      average_hit: 10,
    });

    const { result } = renderHook(() => useDpsCalculator(), { wrapper });
    await act(async () => {
      await result.current.handleCalculate();
    });
    expect(result.current.results?.dps).toBe(5);
  });
});
