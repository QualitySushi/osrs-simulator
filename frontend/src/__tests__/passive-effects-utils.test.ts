import {
  isNpcDraconic,
  isNpcDemonic,
  hasVoidKnightSet,
  countInquisitorPieces,
} from '../utils/passiveEffectsUtils';

const dragonNpc = { npc_id: 50, form_name: 'King Black Dragon' } as any;
const demonNpc = { form_name: "K'ril Tsutsaroth", weakness: 'demon' } as any;

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
    expect(isNpcDraconic(dragonNpc)).toBe(true);
    expect(isNpcDemonic(demonNpc)).toBe(true);
  });

  it('detects void set and inquisitor pieces', () => {
    expect(hasVoidKnightSet(equipment)).toBe(true);
    expect(countInquisitorPieces(inquisitorEquip)).toBe(3);
  });
});
