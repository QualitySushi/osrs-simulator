"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CombinedEquipmentDisplay } from "./CombinedEquipmentDisplay";
import { useCalculatorStore } from "@/store/calculator-store";
import { encodeSeed } from "@/utils/seed";
import { NpcForm, Item } from "@/types/calculator";

export function LoadoutTabs({
  npcForm,
  onEquipmentUpdate,
}: {
  npcForm?: NpcForm | null;
  onEquipmentUpdate?: (loadout: Record<string, Item | null>) => void;
}) {
  const presets = useCalculatorStore((s) => s.presets);
  const addPreset = useCalculatorStore((s) => s.addPreset);
  const setLoadout = useCalculatorStore((s) => s.setLoadout);
  const setParams = useCalculatorStore((s) => s.setParams);
  const switchCombatStyle = useCalculatorStore((s) => s.switchCombatStyle);
  const params = useCalculatorStore((s) => s.params);
  const loadout = useCalculatorStore((s) => s.loadout);

  const [activePreset, setActivePreset] = useState("current");

  useEffect(() => {
    if (
      activePreset !== "current" &&
      !presets.find((p) => p.id === activePreset)
    ) {
      setActivePreset("current");
    }
  }, [presets, activePreset]);

  const handlePresetChange = (id: string) => {
    setActivePreset(id);
    if (id === "current") return;
    const preset = presets.find((p) => p.id === id);
    if (preset) {
      switchCombatStyle(preset.params.combat_style as any);
      setParams(preset.params);
      setLoadout(preset.equipment || {});
    }
  };

  const handleAddPreset = () => {
    const name = prompt("Preset name?");
    if (!name) return;
    const newPreset = {
      id: Date.now().toString(),
      name,
      combatStyle: params.combat_style,
      timestamp: Date.now(),
      params: { ...params },
      equipment: { ...loadout },
      seed: encodeSeed(params, loadout as any),
    };
    addPreset(newPreset as any);
    setActivePreset(newPreset.id);
  };

  return (
    <Tabs
      value={activePreset}
      onValueChange={handlePresetChange}
      className="w-full flex flex-col items-center"
    >
      <TabsList className="mb-4 flex gap-2 flex-wrap justify-center w-full text-center">
        <TabsTrigger value="current" className="text-center">
          Current
        </TabsTrigger>
        {presets.slice(0, 6).map((p) => (
          <TabsTrigger key={p.id} value={p.id} className="text-center">
            {p.name}
          </TabsTrigger>
        ))}
        {presets.length < 6 && (
          <Button variant="outline" size="sm" onClick={handleAddPreset}>
            +
          </Button>
        )}
      </TabsList>
      <TabsContent value={activePreset} className="w-full">
        <CombinedEquipmentDisplay
          npcForm={npcForm}
          showSuggestButton={false}
          onEquipmentUpdate={onEquipmentUpdate}
        />
      </TabsContent>
    </Tabs>
  );
}

export default LoadoutTabs;
