import { act } from '@testing-library/react';
import { useReferenceDataStore } from '../store/reference-data-store';
import {
  bossesApi,
  itemsApi,
  specialAttacksApi,
  passiveEffectsApi,
} from '../services/api';

jest.mock('../services/api');

const mockedBossApi = bossesApi as jest.Mocked<typeof bossesApi>;
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
        bosses: [],
        bossForms: {},
        items: [],
        specialAttacks: {},
        passiveEffects: {},
        initialized: false,
        loading: false,
        progress: 0,
      });
    });
    mockedBossApi.getAllBosses.mockReset();
    mockedItemsApi.getAllItems.mockReset();
    mockedSpecialApi.getAll.mockReset();
    mockedPassiveApi.getAll.mockReset();
  });

  it('loads data from APIs', async () => {
    mockedBossApi.getAllBosses
      .mockResolvedValueOnce([{ id: 1, name: 'Boss' } as any])
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
    expect(state.bosses).toHaveLength(1);
    expect(state.items).toHaveLength(1);
    expect(Object.keys(state.specialAttacks)).toHaveLength(1);
    expect(Object.keys(state.passiveEffects)).toHaveLength(1);
    expect(mockedBossApi.getAllBosses).toHaveBeenCalledTimes(1);
    expect(mockedItemsApi.getAllItems).toHaveBeenCalledTimes(1);
    expect(mockedSpecialApi.getAll).toHaveBeenCalledTimes(1);
    expect(mockedPassiveApi.getAll).toHaveBeenCalledTimes(1);
  });

  it('does not load again when initialized', async () => {
    mockedBossApi.getAllBosses.mockResolvedValue([]);
    mockedItemsApi.getAllItems.mockResolvedValue([]);
    mockedSpecialApi.getAll.mockResolvedValue({});
    mockedPassiveApi.getAll.mockResolvedValue({});

    await act(async () => {
      await getStore().initData();
    });

    await act(async () => {
      await getStore().initData();
    });

    expect(mockedBossApi.getAllBosses).toHaveBeenCalledTimes(1);
    expect(mockedItemsApi.getAllItems).toHaveBeenCalledTimes(1);
    expect(mockedSpecialApi.getAll).toHaveBeenCalledTimes(1);
    expect(mockedPassiveApi.getAll).toHaveBeenCalledTimes(1);
  });
});
