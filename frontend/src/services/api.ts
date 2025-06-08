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