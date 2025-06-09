'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useCalculatorStore } from '@/store/calculator-store';
import { CalculatorParams} from '@/types/calculator';
// import { CalculatorParams, DpsResult } from '@/types/calculator';

export function DpsComparison() {
  const { params, results, comparisonResults, addComparisonResult, removeComparisonResult, clearComparisonResults } = useCalculatorStore();
  const [label, setLabel] = useState('Setup 1');

  const handleAddComparison = () => {
    if (!results) return;
    
    addComparisonResult(label, { ...params }, { ...results });
    setLabel('');
  };

  const handleRemoveComparison = (index: number) => {
    removeComparisonResult(index);
  };

  const getCombatStyleLabel = (style: string) => {
    switch (style) {
      case 'melee': return 'Melee';
      case 'ranged': return 'Ranged';
      case 'magic': return 'Magic';
      default: return style;
    }
  };

  // Get readable parameter labels for display in the comparison table
  const getReadableParams = (params: CalculatorParams) => {
    const combatStyle = params.combat_style;
    const commonParams = {
      'Attack Speed': `${params.attack_speed}s`,
    };

    if (combatStyle === 'melee') {
      return {
        ...commonParams,
        'Strength': params.strength_level,
        'Attack': params.attack_level,
        'Strength Bonus': params.melee_strength_bonus,
        'Attack Bonus': params.melee_attack_bonus,
        'Void': params.void_melee ? 'Yes' : 'No',
        'Target Def': params.target_defence_level,
      };
    } else if (combatStyle === 'ranged') {
      return {
        ...commonParams,
        'Ranged': params.ranged_level,
        'Ranged Str Bonus': params.ranged_strength_bonus,
        'Ranged Atk Bonus': params.ranged_attack_bonus,
        'Void': params.void_ranged ? 'Yes' : 'No',
        'Target Def': params.target_defence_level,
      };
    } else if (combatStyle === 'magic') {
      return {
        ...commonParams,
        'Magic': params.magic_level,
        'Base Max Hit': params.base_spell_max_hit,
        'Magic Atk Bonus': params.magic_attack_bonus,
        'Magic Dmg Bonus': `${(params.magic_damage_bonus * 100).toFixed(0)}%`,
        'Void': params.void_magic ? 'Yes' : 'No',
        'Target Magic': params.target_magic_level,
      };
    }

    return commonParams;
  };

  // Show a message if there are no comparison results
  if (comparisonResults.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex gap-2 justify-center items-center"><CardTitle>DPS Comparison</CardTitle></div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm mb-4 justify-center items-center">
            Save your current setup to compare different equipment, stats, and combat styles.
          </p>
          
          <div className="flex gap-2 justify-center items-center">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Enter setup name..."
              className="max-w-xs"
              disabled={!results}
            />
            <Button 
              onClick={handleAddComparison} 
              disabled={!results}
            >
              Save Current Setup
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">DPS Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-end mb-2">
          <Button variant="outline" size="sm" onClick={clearComparisonResults}>
            Clear All
          </Button>
        </div>
        <div className="flex gap-2 mb-4 justify-center items-center">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Enter setup name..."
            className="max-w-xs"
            disabled={!results}
          />
          <Button 
            onClick={handleAddComparison} 
            disabled={!results}
          >
            Add Current Setup
          </Button>
        </div>
        
        <div className="overflow-x-auto justify-center items-center">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Setup</TableHead>
                <TableHead>Style</TableHead>
                <TableHead className="text-right">DPS</TableHead>
                <TableHead className="text-right">Max Hit</TableHead>
                <TableHead className="text-right">Hit Chance</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisonResults.map((item, index) => {
                const readableParams = getReadableParams(item.params);
                
                return (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.label}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getCombatStyleLabel(item.params.combat_style)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {item.results.dps.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.results.max_hit}
                    </TableCell>
                    <TableCell className="text-right">
                      {(item.results.hit_chance * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(readableParams).map(([key, value]) => (
                          <Badge key={key} variant="secondary" className="text-xs">
                            {key}: {value}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveComparison(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}