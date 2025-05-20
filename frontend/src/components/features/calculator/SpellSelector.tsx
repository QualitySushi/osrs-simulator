import { useToast } from '@/hooks/use-toast';
import { CalculatorParams } from '@/app/types/calculator';

interface SpellSelectorProps {
  params: CalculatorParams;
  setParams: (params: Partial<CalculatorParams>) => void;
}

export function SpellSelector({ params, setParams }: SpellSelectorProps) {
  const { toast } = useToast();

  const spellMaxHits: Record<string, number> = {
    'Fire Strike': 8,
    'Fire Bolt': 12,
    'Fire Blast': 16,
    'Fire Wave': 20,
    'Fire Surge': 24,
    'Iban Blast': 25,
    'Trident of the Seas': 23,
    'Trident of the Swamp': 25,
    'Sanguinesti Staff': 24,
    "Tumeken's Shadow": 29
  };

  const handleSpellChange = (selected: string) => {
    const baseHit = spellMaxHits[selected] || 0;
    
    setParams({
      selected_spell: selected,
      base_spell_max_hit: baseHit
    });
    
    toast.success(`Selected ${selected} with base hit ${baseHit}`);
  };

  return (
    <div className="mt-4">
      <h4 className="text-sm font-semibold mb-2">Select Spell</h4>
      <div className="grid grid-cols-1 gap-2">
        <select
          aria-label="Select magic spell"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
          value={params.selected_spell || ''}
          onChange={(e) => handleSpellChange(e.target.value)}
        >
          <option value="">-- Select a Spell --</option>
          <optgroup label="Standard Spellbook">
            <option value="Fire Strike">Fire Strike (8)</option>
            <option value="Fire Bolt">Fire Bolt (12)</option>
            <option value="Fire Blast">Fire Blast (16)</option>
            <option value="Fire Wave">Fire Wave (20)</option>
            <option value="Fire Surge">Fire Surge (24)</option>
          </optgroup>
          <optgroup label="Special Spells">
            <option value="Iban Blast">Iban Blast (25)</option>
          </optgroup>
          <optgroup label="Powered Staves">
            <option value="Trident of the Seas">Trident of the Seas (23)</option>
            <option value="Trident of the Swamp">Trident of the Swamp (25)</option>
            <option value="Sanguinesti Staff">Sanguinesti Staff (24)</option>
            <option value="Tumeken's Shadow">Tumeken&apos;s Shadow (29)</option>
          </optgroup>
        </select>
        
        {params.selected_spell && (
          <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded">
            <div className="text-sm">
              <span className="font-medium">{params.selected_spell}</span>
              <span className="text-muted-foreground ml-2">
                Base Max Hit: {params.base_spell_max_hit}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}