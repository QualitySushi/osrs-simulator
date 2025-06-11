import { CalculatorParams, EquipmentLoadout } from '@/types/calculator';

export function encodeSeed(params: CalculatorParams, loadout: EquipmentLoadout) {
  const equipment: Record<string, number | null> = {};
  Object.entries(loadout).forEach(([slot, item]) => {
    equipment[slot] = item ? item.id : null;
  });
  const payload = { ...params, equipment };
  const json = JSON.stringify(payload);
  if (typeof window === 'undefined') {
    return Buffer.from(json, 'utf-8').toString('base64');
  }
  return btoa(json);
}

export function decodeSeed(seed: string): {
  params: CalculatorParams;
  equipment: Record<string, number | null>;
} {
  const json =
    typeof window === 'undefined'
      ? Buffer.from(seed, 'base64').toString('utf-8')
      : atob(seed);
  const data = JSON.parse(json);
  const { equipment = {}, ...params } = data;
  return { params, equipment } as any;
}

