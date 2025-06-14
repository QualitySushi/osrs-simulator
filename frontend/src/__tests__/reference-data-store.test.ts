import { act } from '@testing-library/react';
import { useReferenceDataStore } from '../store/reference-data-store';
import {
  npcsApi,
  itemsApi,
  specialAttacksApi,
  passiveEffectsApi,
} from '../services/api';

jest.mock('../services/api');

const mockedNpcApi = npcsApi as jest.Mocked<typeof npcsApi>;
const mockedItemsApi = itemsApi as jest.Mocked<typeof itemsApi>;
const mockedSpecialApi =
  specialAttacksApi as jest.Mocked<typeof specialAttacksApi>;
const mockedPassiveApi =
  passiveEffectsApi as jest.Mocked<typeof passiveEffectsApi>;

function getStore() {
  return useReferenceDataStore.getState();
}

describe('reference data store', () => {
  beforeEach(() => {
    act(() => {
      useReferenceDataStore.setState({
        npcs: [],
        npcForms: {},
        items: [],
        specialAttacks: {},
        passiveEffects: {},
        initialized: false,
        loading: false,
        progress: 0,
        error: false,
      });
    });
    mockedNpcApi.getAllNpces.mockReset();
    mockedItemsApi.getAllItems.mockReset();
    mockedSpecialApi.getAll.mockReset();
    mockedPassiveApi.getAll.mockReset();
  });

  it('loads data from APIs', async () => {
    mockedNpcApi.getAllNpces
      .mockResolvedValueOnce([{ id: 1, name: 'Npc' } as any])
      .mockResolvedValueOnce([]);

    mockedItemsApi.getAllItems
      .mockResolvedValueOnce([{ id: 2, name: 'Item' } as any])
      .mockResolvedValueOnce([]);

    mockedSpecialApi.getAll.mockResolvedValue({ a: { weapon_name: 'A', effect: 'x', special_cost: 50, accuracy_multiplier: 1, damage_multiplier: 1 } });
    mockedPassiveApi.getAll.mockResolvedValue({ b: { item_name: 'B', effect_description: 'desc' } });

    await act(async () => {
      await getStore().initData();
    });

    const state = getStore();
    expect(state.npcs).toHaveLength(1);
    expect(state.items).toHaveLength(1);
    expect(Object.keys(state.specialAttacks)).toHaveLength(1);
    expect(Object.keys(state.passiveEffects)).toHaveLength(1);
    expect(mockedNpcApi.getAllNpces).toHaveBeenCalledTimes(1);
    expect(mockedItemsApi.getAllItems).toHaveBeenCalledTimes(1);
    expect(mockedSpecialApi.getAll).toHaveBeenCalledTimes(1);
    expect(mockedPassiveApi.getAll).toHaveBeenCalledTimes(1);
  });

  it('does not load again when initialized', async () => {
    mockedNpcApi.getAllNpces.mockResolvedValue([]);
    mockedItemsApi.getAllItems.mockResolvedValue([]);
    mockedSpecialApi.getAll.mockResolvedValue({});
    mockedPassiveApi.getAll.mockResolvedValue({});

    await act(async () => {
      await getStore().initData();
    });

    await act(async () => {
      await getStore().initData();
    });

    expect(mockedNpcApi.getAllNpces).toHaveBeenCalledTimes(1);
    expect(mockedItemsApi.getAllItems).toHaveBeenCalledTimes(1);
    expect(mockedSpecialApi.getAll).toHaveBeenCalledTimes(1);
    expect(mockedPassiveApi.getAll).toHaveBeenCalledTimes(1);
  });

  it('filters forms with placeholder names', () => {
    act(() => {
      getStore().addNpcForms(1, [
        { id: 10, npc_id: 1, form_name: 'Form 1', defence_level: 10 } as any,
        { id: 11, npc_id: 1, form_name: 'Normal', defence_level: 20 } as any,
      ]);
    });

    const forms = getStore().npcForms[1];
    expect(forms).toHaveLength(1);
    expect(forms[0].form_name).toBe('Normal');
  });
});
