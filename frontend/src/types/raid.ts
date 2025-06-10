export type Raid = 'cox' | 'tob' | 'toa';

export const RAID_OPTIONS: { id: Raid; name: string }[] = [
  { id: 'cox', name: 'Chambers of Xeric' },
  { id: 'tob', name: 'Theatre of Blood' },
  { id: 'toa', name: 'Tombs of Amascut' },
];

export const RAID_NAME_MAP = RAID_OPTIONS.reduce<Record<Raid, string>>((acc, r) => {
  acc[r.id] = r.name;
  return acc;
}, {} as Record<Raid, string>);

export const RAID_NAME_TO_ID = RAID_OPTIONS.reduce<Record<string, Raid>>((acc, r) => {
  acc[r.name] = r.id;
  return acc;
}, {} as Record<string, Raid>);
