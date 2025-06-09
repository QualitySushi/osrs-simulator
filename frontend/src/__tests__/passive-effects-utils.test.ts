import {
  isTargetDraconic,
  isTargetDemonic,
  hasVoidKnightSet,
  countInquisitorPieces,
} from '../utils/passiveEffectsUtils';

const dragonBoss = { boss_id: 50, form_name: 'King Black Dragon' } as any;
const demonBoss = { form_name: "K'ril Tsutsaroth", weakness: 'demon' } as any;

const equipment = {
  body: { name: 'Void knight top' },
  legs: { name: 'Void knight robe' },
  hands: { name: 'Void knight gloves' },
  head: null,
  mainhand: { name: "Inquisitor's mace" },
};

const inquisitorEquip = {
  head: { name: 'Inquisitor helm' },
  body: { name: 'Inquisitor body' },
  legs: { name: 'Inquisitor legs' },
};

describe('passiveEffectsUtils', () => {
  it('detects target types', () => {
    expect(isTargetDraconic(dragonBoss)).toBe(true);
    expect(isTargetDemonic(demonBoss)).toBe(true);
  });

  it('detects void set and inquisitor pieces', () => {
    expect(hasVoidKnightSet(equipment)).toBe(true);
    expect(countInquisitorPieces(inquisitorEquip)).toBe(3);
  });
});
