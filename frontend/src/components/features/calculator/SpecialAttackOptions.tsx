'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Swords } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { itemsApi } from '@/services/api';

export function SpecialAttackOptions() {
  const { data: specials } = useQuery(['special-attacks'], itemsApi.getSpecialAttacks);

  return (
    <Card className="w-full border">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Swords className="h-5 w-5 mr-2 text-primary" />
          Special Attacks
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Weapon</TableHead>
              <TableHead className="text-right">Special Cost</TableHead>
              <TableHead className="text-right">Accuracy Multiplier</TableHead>
              <TableHead className="text-right">Damage Multiplier</TableHead>
              <TableHead className="text-right">Hit Count</TableHead>
              <TableHead className="text-right">Guaranteed Hit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {specials?.map((s) => (
              <TableRow key={s.weapon_name}>
                <TableCell className="font-medium">{s.weapon_name}</TableCell>
                <TableCell className="text-right">{s.special_cost}</TableCell>
                <TableCell className="text-right">{s.accuracy_multiplier}</TableCell>
                <TableCell className="text-right">{s.damage_multiplier}</TableCell>
                <TableCell className="text-right">{s.hit_count}</TableCell>
                <TableCell className="text-right">{s.guaranteed_hit ? 'Yes' : 'No'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default SpecialAttackOptions;
