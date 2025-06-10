import axios from 'axios';
import { 
  CalculatorParams, 
  DpsResult, 
  Boss, 
  Item, 
  BossForm 
} from '@/types/calculator';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
// Log the resolved API URL only during development to help debug environment issues
if (process.env.NODE_ENV !== 'production') {
  console.log('API_URL:', API_URL);
}

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
};

// Bosses API
export const bossesApi = {

  getAllBosses: async (
    params?: { page?: number; page_size?: number }
  ): Promise<Boss[]> => {

    const { data } = await apiClient.get('/bosses', { params });
    return data;
  },

  getBossById: async (id: number): Promise<Boss> => {
    const { data } = await apiClient.get(`/boss/${id}`);
    return data;
  },

  getBossByFormId: async (formId: number): Promise<Boss> => {
    const { data } = await apiClient.get(`/boss/form/${formId}`);
    return data;
  },

  getBossForms: async (bossId: number): Promise<BossForm[]> => {
    const { data } = await apiClient.get(`/boss/${bossId}`);
    return data.forms || [];
  },

  searchBosses: async (query: string, limit?: number): Promise<Boss[]> => {
    const params: Record<string, unknown> = { query };
    if (limit !== undefined) {
      params.limit = limit;
    }
    const { data } = await apiClient.get('/search/bosses', { params });
    return data;
  },
};

// Items API
export const itemsApi = {
  getAllItems: async (

    params?: {
      page?: number;
      page_size?: number;
      combat_only?: boolean;
      tradeable_only?: boolean;
    }

  ): Promise<Item[]> => {
    const { data } = await apiClient.get('/items', { params });
    return data;
  },

  getItemById: async (id: number): Promise<Item> => {
    const { data } = await apiClient.get(`/item/${id}`);
    return data;
  },

  searchItems: async (query: string, limit?: number): Promise<Item[]> => {
    const params: Record<string, unknown> = { query };
    if (limit !== undefined) {
      params.limit = limit;
    }
    const { data } = await apiClient.get('/search/items', { params });
    return data;
  },
};