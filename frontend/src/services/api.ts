import axios from 'axios';
import {
  CalculatorParams,
  DpsResult,
  Npc,
  NpcSummary,
  Item,
  ItemSummary,
  NpcForm,
  SpecialAttack,
  PassiveEffect
} from '@/types/calculator';

export interface ApiError {
  message: string;
  status?: number;
}

const handleError = (err: any): ApiError => ({
  message: err.response?.data?.detail || err.message || 'Unknown error',
  status: err.response?.status,
});

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
    try {
      const { data } = await apiClient.post('/calculate/dps', params);
      return data;
    } catch (err: any) {
      throw handleError(err);
    }
  },
  importSeed: async (seed: string): Promise<CalculatorParams> => {
    try {
      const { data } = await apiClient.post('/import-seed', { seed });
      return data;
    } catch (err: any) {
      throw handleError(err);
    }
  },
  calculateSeed: async (seed: string): Promise<DpsResult> => {
    try {
      const { data } = await apiClient.post('/calculate/seed', { seed });
      return data;
    } catch (err: any) {
      throw handleError(err);
    }
  },
  getBis: async (params: CalculatorParams): Promise<Record<string, Item>> => {
    try {
      const { data } = await apiClient.post('/bis', params);
      return data;
    } catch (err: any) {
      throw handleError(err);
    }
  },
};

// Npces API
export const npcsApi = {

  getAllNpces: async (
    params?: { page?: number; page_size?: number }
  ): Promise<NpcSummary[]> => {
    try {
      const { data } = await apiClient.get('/npcs', { params });
      return data;
    } catch (err: any) {
      throw handleError(err);
    }
  },

  getNpcesWithForms: async (
    params?: { page?: number; page_size?: number }
  ): Promise<Npc[]> => {
    try {
      const { data } = await apiClient.get('/npcs/full', { params });
      return data;
    } catch (err: any) {
      throw handleError(err);
    }
  },

  getNpcById: async (id: number): Promise<Npc> => {
    try {
      const { data } = await apiClient.get(`/npc/${id}`);
      return data;
    } catch (err: any) {
      if (err.response?.status === 404) {
        const { data } = await apiClient.get(`/npc/form/${id}`);
        return data;
      }
      throw handleError(err);
    }
  },

  getNpcByFormId: async (formId: number): Promise<Npc> => {
    try {
      const { data } = await apiClient.get(`/npc/form/${formId}`);
      return data;
    } catch (err: any) {
      throw handleError(err);
    }
  },

  getNpcForms: async (npcId: number): Promise<NpcForm[]> => {
    try {
      const { data } = await apiClient.get(`/npc/${npcId}`);
      return data.forms || [];
    } catch (err: any) {
      if (err.response?.status === 404) {
        const { data } = await apiClient.get(`/npc/form/${npcId}`);
        return data.forms || [];
      }
      throw handleError(err);
    }
  },

  searchNpces: async (query: string, limit?: number): Promise<NpcSummary[]> => {
    const params: Record<string, unknown> = { query };
    if (limit !== undefined) {
      params.limit = limit;
    }
    try {
      const { data } = await apiClient.get('/search/npcs', { params });
      return data;
    } catch (err: any) {
      throw handleError(err);
    }
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

  ): Promise<ItemSummary[]> => {
    try {
      const { data } = await apiClient.get('/items', { params });
      return data;
    } catch (err: any) {
      throw handleError(err);
    }
  },

  getItemById: async (id: number): Promise<Item> => {
    try {
      const { data } = await apiClient.get(`/item/${id}`);
      return data;
    } catch (err: any) {
      throw handleError(err);
    }
  },

  searchItems: async (query: string, limit?: number): Promise<ItemSummary[]> => {
    const params: Record<string, unknown> = { query };
    if (limit !== undefined) {
      params.limit = limit;
    }
    try {
      const { data } = await apiClient.get('/search/items', { params });
      return data;
    } catch (err: any) {
      throw handleError(err);
    }
  },
};

export const specialAttacksApi = {
  getAll: async (): Promise<Record<string, SpecialAttack>> => {
    try {
      const { data } = await apiClient.get('/special-attacks');
      return data;
    } catch (err: any) {
      throw handleError(err);
    }
  },
};

export const passiveEffectsApi = {
  getAll: async (): Promise<Record<string, PassiveEffect>> => {
    try {
      const { data } = await apiClient.get('/passive-effects');
      return data;
    } catch (err: any) {
      throw handleError(err);
    }
  },
};
