import axios from 'axios';
import { 
  CalculatorParams, 
  DpsResult, 
  Boss, 
  Item, 
  BossForm 
} from '@/types/calculator';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Calculator API
export const calculatorApi = {
  calculateDps: async (params: CalculatorParams): Promise<DpsResult> => {
    const { data } = await apiClient.post('/calculate/dps', params);
    return data;
  },
  importSeed: async (seed: string): Promise<CalculatorParams> => {
    const { data } = await apiClient.post('/import-seed', { seed });
    return data;
  },
  calculateSeed: async (seed: string): Promise<DpsResult> => {
    const { data } = await apiClient.post('/calculate/seed', { seed });
    return data;
  },
  getBis: async (params: CalculatorParams): Promise<Record<string, Item>> => {
    const { data } = await apiClient.post('/bis', params);
    return data;
  },
  simulateBosses: async (
    params: CalculatorParams,
    bossIds: number[]
  ): Promise<Record<number, DpsResult>> => {
    const { data } = await apiClient.post('/simulate/bosses', {
      params,
      boss_ids: bossIds,
    });
    return data;
  },
  getUpgradeSuggestions: async (
    bossId: number,
    params: CalculatorParams
  ): Promise<any> => {
    const { data } = await apiClient.post(`/bis/upgrades?boss_id=${bossId}`, params);
    return data;
  },
};

// Bosses API
export const bossesApi = {
  getAllBosses: async (): Promise<Boss[]> => {
    const { data } = await apiClient.get('/bosses');
    return data;
  },

  getBossById: async (id: number): Promise<Boss> => {
    const { data } = await apiClient.get(`/boss/${id}`);
    return data;
  },

  getBossForms: async (bossId: number): Promise<BossForm[]> => {
    const { data } = await apiClient.get(`/boss/${bossId}`);
    return data.forms || [];
  },
};

// Items API
export const itemsApi = {
  getAllItems: async (params?: { combat_only?: boolean; tradeable_only?: boolean }): Promise<Item[]> => {
    const { data } = await apiClient.get('/items', { params });
    return data;
  },

  getItemById: async (id: number): Promise<Item> => {
    const { data } = await apiClient.get(`/item/${id}`);
    return data;
  },
};