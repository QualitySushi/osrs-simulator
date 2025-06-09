import { act } from '@testing-library/react';
import { useReferenceDataStore } from '../store/reference-data-store';
import { bossesApi, itemsApi } from '../services/api';

jest.mock('../services/api');

const mockedBossApi = bossesApi as jest.Mocked<typeof bossesApi>;
const mockedItemsApi = itemsApi as jest.Mocked<typeof itemsApi>;

function getStore() {
  return useReferenceDataStore.getState();
}

describe('reference data store', () => {
  beforeEach(() => {
    act(() => {
      useReferenceDataStore.setState({ bosses: [], items: [], initialized: false });
    });
    mockedBossApi.getAllBosses.mockReset();
    mockedItemsApi.getAllItems.mockReset();
  });

  it('loads data from APIs', async () => {
    mockedBossApi.getAllBosses
      .mockResolvedValueOnce([{ id: 1, name: 'Boss' } as any])
      .mockResolvedValueOnce([]);

    mockedItemsApi.getAllItems
      .mockResolvedValueOnce([{ id: 2, name: 'Item' } as any])
      .mockResolvedValueOnce([]);

    await act(async () => {
      await getStore().initData();
    });

    const state = getStore();
    expect(state.bosses).toHaveLength(1);
    expect(state.items).toHaveLength(1);
    expect(mockedBossApi.getAllBosses).toHaveBeenCalledTimes(1);
    expect(mockedItemsApi.getAllItems).toHaveBeenCalledTimes(1);
  });

  it('does not load again when initialized', async () => {
    mockedBossApi.getAllBosses.mockResolvedValue([]);
    mockedItemsApi.getAllItems.mockResolvedValue([]);

    await act(async () => {
      await getStore().initData();
    });

    await act(async () => {
      await getStore().initData();
    });

    expect(mockedBossApi.getAllBosses).toHaveBeenCalledTimes(1);
    expect(mockedItemsApi.getAllItems).toHaveBeenCalledTimes(1);
  });
});
