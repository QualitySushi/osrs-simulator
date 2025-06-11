import { CalculatorParams, Item } from '@/types/calculator';
import { itemsApi } from '@/services/api';

export function encodeSeed(params: CalculatorParams, loadout: Record<string, Item | null>): string {
  const equipment: Record<string, number | null> = {};
  for (const [slot, item] of Object.entries(loadout)) {
    equipment[slot] = item?.id ?? null;
  }
  const payload = { ...params, equipment };
  const jsonStr = JSON.stringify(payload);
  if (typeof window !== 'undefined') {
    return btoa(jsonStr);
  }
  return Buffer.from(jsonStr, 'utf-8').toString('base64');
}

export async function decodeSeed(seed: string): Promise<{ params: CalculatorParams; loadout: Record<string, Item | null> }> {
  const jsonStr = typeof window !== 'undefined' ? atob(seed.trim()) : Buffer.from(seed.trim(), 'base64').toString('utf-8');
  const data = JSON.parse(jsonStr);
  const { equipment, equipped_armor, equipped_weapon, ...params } = data;
  const rawLoadout: Record<string, number | null> = equipment || { ...equipped_armor, ...equipped_weapon } || {};
  const processedLoadout: Record<string, Item | null> = {};
  await Promise.all(
    Object.entries(rawLoadout).map(async ([slot, itemId]) => {
      if (!itemId) {
        processedLoadout[slot] = null;
        return;
      }
      try {
        const item = await itemsApi.getItemById(itemId as number);
        processedLoadout[slot] = item;
      } catch {
        processedLoadout[slot] = null;
      }
    })
  );
  return { params: params as CalculatorParams, loadout: processedLoadout };
}
