'use client';
import { useToast } from '@/hooks/use-toast';
import { Visualizations } from '../Visualizations';
import { PresetSelector } from '../PresetSelector';
import { SpecialAttackOptions } from '../SpecialAttackOptions';
import { PassiveEffectOptions } from '../PassiveEffectOptions';

export function BottomPanels() {
  const { toast } = useToast();
  return (
    <>
      <Visualizations />
      <PresetSelector
        className="flex-grow"
        onPresetLoad={() => toast.success('Preset loaded successfully!')}
      />
      <SpecialAttackOptions />
      <PassiveEffectOptions />
    </>
  );
}

export default BottomPanels;
