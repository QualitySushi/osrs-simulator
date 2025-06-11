'use client';
import { useToast } from '@/hooks/use-toast';
import { SpecialAttackOptions } from '../SpecialAttackOptions';
import { PassiveEffectOptions } from '../PassiveEffectOptions';

export function BottomPanels() {
  const { toast } = useToast();
  return (
    <>
      <SpecialAttackOptions />
      <PassiveEffectOptions />
    </>
  );
}

export default BottomPanels;
