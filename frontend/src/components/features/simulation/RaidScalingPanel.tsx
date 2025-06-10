'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Raid, RAID_NAME_MAP } from '@/types/raid';

export interface RaidScalingConfig {
  teamSize: number;
  raidLevel?: number;
}

interface RaidScalingPanelProps {
  raid: Raid;
  config: RaidScalingConfig;
  onChange: (config: RaidScalingConfig) => void;
}

export function RaidScalingPanel({ raid, config, onChange }: RaidScalingPanelProps) {
  const handleChange = (key: keyof RaidScalingConfig, value: number) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{RAID_NAME_MAP[raid]} Scaling</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-left">
        <div className="flex items-center gap-2">
          <Label className="w-28">Team Size</Label>
          <Input
            type="number"
            min={1}
            value={config.teamSize}
            onChange={(e) => handleChange('teamSize', parseInt(e.target.value) || 1)}
            className="w-24"
          />
        </div>
        {raid === 'toa' && (
          <div className="flex items-center gap-2">
            <Label className="w-28">Raid Level</Label>
            <Input
              type="number"
              min={0}
              max={600}
              value={config.raidLevel ?? 0}
              onChange={(e) => handleChange('raidLevel', parseInt(e.target.value) || 0)}
              className="w-24"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default RaidScalingPanel;
