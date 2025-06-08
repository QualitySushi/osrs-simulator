import { useEffect } from 'react';
import { useCalculatorStore } from '@/store/calculator-store';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useRef } from 'react';
import { 
  Shield
} from 'lucide-react';

export function DefenceReductionPanel() {
  const { params, setParams } = useCalculatorStore();

  const numericEffects = [
    { key: 'elder_maul_hits', label: 'Elder maul hits' },
    { key: 'dwh_hits', label: 'Dragon warhammer hits' },
    { key: 'arclight_hits', label: 'Arclight hits' },
    { key: 'emberlight_hits', label: 'Emberlight hits' },
    { key: 'tonalztics_hits', label: 'Tenacity of Ralos hits' },
    { key: 'bandos_godsword_damage', label: 'Bandos godsword damage' },
    { key: 'seercull_damage', label: 'Seercull damage' },
  ];

  const toggleEffects = [
    { key: 'accursed_sceptre', label: 'Accursed sceptre' },
    { key: 'vulnerability', label: 'Vulnerability' },
  ];

    // inside component
    const lastEffectHash = useRef<string | null>(null);

    useEffect(() => {
    const allEffects = {
        dwh_hits: params.dwh_hits ?? 0,
        elder_maul_hits: params.elder_maul_hits ?? 0,
        arclight_hits: params.arclight_hits ?? 0,
        emberlight_hits: params.emberlight_hits ?? 0,
        tonalztics_hits: params.tonalztics_hits ?? 0,
        bandos_godsword_damage: params.bandos_godsword_damage ?? 0,
        seercull_damage: params.seercull_damage ?? 0,
        accursed_sceptre: !!params.accursed_sceptre,
        vulnerability: !!params.vulnerability,
    };

    const hash = JSON.stringify(allEffects);
    const prevHash = lastEffectHash.current;
    lastEffectHash.current = hash;

    const hasChanged = hash !== prevHash;
    const isEffectActive = Object.values(allEffects).some((v) => v !== 0 && v !== false);

    // Ensure original defence is always captured
    if (
        !params.original_defence_level &&
        typeof params.target_defence_level === 'number'
    ) {
        setParams({ original_defence_level: params.target_defence_level });
        return;
    }

    // Reset to original if all effects cleared
    if (!isEffectActive && hasChanged && params.original_defence_level !== undefined) {
        setParams({ target_defence_level: params.original_defence_level });
        return;
    }

    if (isEffectActive) {
        let def = params.original_defence_level ?? params.target_defence_level ?? 0;

        for (let i = 0; i < allEffects.dwh_hits; i++) def *= 0.7;
        for (let i = 0; i < allEffects.elder_maul_hits; i++) {
          def = Math.floor(def * 0.65);
        }
        for (let i = 0; i < allEffects.arclight_hits; i++) def *= 0.95;
        for (let i = 0; i < allEffects.emberlight_hits; i++) def *= 0.95;
        for (let i = 0; i < allEffects.tonalztics_hits; i++) def *= 0.9;
        def -= allEffects.bandos_godsword_damage;
        def -= allEffects.seercull_damage;
        if (allEffects.accursed_sceptre) def *= 0.85;
        if (allEffects.vulnerability) def *= 0.9;

        def = Math.max(0, Math.floor(def));

        setParams({ target_defence_level: def });
    }
    }, [
    params.dwh_hits,
    params.elder_maul_hits,
    params.arclight_hits,
    params.emberlight_hits,
    params.tonalztics_hits,
    params.bandos_godsword_damage,
    params.seercull_damage,
    params.accursed_sceptre,
    params.vulnerability,
    params.original_defence_level,
    params.target_defence_level,
    setParams,
    ]);

  return (
    <Card className="rs-border h-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Shield className="h-5 w-5 mr-2 text-rs-gold" />
          Defensive Reductions
        </CardTitle>
        <CardDescription>Track special attack effects on boss defence</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {numericEffects.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-2">
            <Input
              type="number"
              value={params[key] ?? 0}
              min={0}
              className="w-16 border-2 border-black bg-rs-dark-stone text-rs-gold"
              onChange={(e) => setParams({ [key]: parseInt(e.target.value) || 0 })}
            />
            <Label className="text-sm font-medium whitespace-nowrap text-rs-gold">{label}</Label>
          </div>
        ))}

        {toggleEffects.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-2">
            <Switch
              checked={!!params[key]}
              onCheckedChange={(value) => setParams({ [key]: value })}
              className="data-[state=checked]:bg-rs-gold"
            />
            <Label className="text-sm font-medium whitespace-nowrap text-rs-gold">{label}</Label>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
