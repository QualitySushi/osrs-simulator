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
      useReferenceDataStore.setState({ bosses: [], bossForms: {}, items: [], initialized: false });
    });
    mockedBossApi.getBossesWithForms.mockReset();
    mockedBossApi.getBossForms.mockReset();
    mockedItemsApi.getAllItems.mockReset();
  });

  it('loads data from APIs', async () => {
    mockedBossApi.getBossesWithForms
      .mockResolvedValueOnce([{ id: 1, name: 'Boss', forms: [{ id: 10, boss_id: 1 }] } as any])
      .mockResolvedValueOnce([]);

    mockedItemsApi.getAllItems
      .mockResolvedValueOnce([{ id: 2, name: 'Item' } as any])
      .mockResolvedValueOnce([]);

    await act(async () => {
      await getStore().initData();
    });

    const state = getStore();
    expect(state.bosses).toHaveLength(1);
    expect(state.bossForms[1]).toHaveLength(1);
    expect(state.items).toHaveLength(1);
    expect(mockedBossApi.getBossesWithForms).toHaveBeenCalledTimes(1);
    expect(mockedBossApi.getBossForms).toHaveBeenCalledTimes(0);
    expect(mockedItemsApi.getAllItems).toHaveBeenCalledTimes(1);
  });

  it('does not load again when initialized', async () => {
    mockedBossApi.getBossesWithForms.mockResolvedValue([]);
    mockedBossApi.getBossForms.mockResolvedValue([]);
    mockedItemsApi.getAllItems.mockResolvedValue([]);

    await act(async () => {
      await getStore().initData();
    });

    await act(async () => {
      await getStore().initData();
    });

    expect(mockedBossApi.getBossesWithForms).toHaveBeenCalledTimes(1);
    expect(mockedBossApi.getBossForms).toHaveBeenCalledTimes(0);
    expect(mockedItemsApi.getAllItems).toHaveBeenCalledTimes(1);
  });
});
