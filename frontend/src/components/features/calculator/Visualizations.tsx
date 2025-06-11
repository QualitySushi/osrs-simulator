"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCalculatorStore } from "@/store/calculator-store";

export function Visualizations() {
  const {
    params,
    results,
    comparisonResults,
    addComparisonResult,
    clearComparisonResults,
  } = useCalculatorStore();

  const [label, setLabel] = useState("Setup 1");

  const handleAdd = () => {
    if (!results) return;
    addComparisonResult(label || `Setup ${comparisonResults.length + 1}`, { ...params }, { ...results });
    setLabel("");
  };

  const data = comparisonResults.map((c) => ({
    name: c.label,
    dps: c.results.dps + (c.results.special_attack_dps ?? 0),
    maxHit: c.results.max_hit,
    hitChance: c.results.hit_chance * 100,
  }));

  if (comparisonResults.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Visualizations</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm mb-4 text-center">
            Save setups to visualize their performance.
          </p>
          <div className="flex gap-2 justify-center">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Enter setup name..."
              className="max-w-xs"
              disabled={!results}
            />
            <Button onClick={handleAdd} disabled={!results}>
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
        <CardTitle className="text-center">Visualizations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-end mb-2">
          <Button variant="outline" size="sm" onClick={clearComparisonResults}>
            Clear All
          </Button>
        </div>
        <div className="flex gap-2 mb-4 justify-center">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Enter setup name..."
            className="max-w-xs"
            disabled={!results}
          />
          <Button onClick={handleAdd} disabled={!results}>
            Add Current Setup
          </Button>
        </div>
        <Tabs defaultValue="dps" className="w-full">
          <TabsList>
            <TabsTrigger value="dps">DPS</TabsTrigger>
            <TabsTrigger value="maxhit">Max Hit</TabsTrigger>
            <TabsTrigger value="hitchance">Hit Chance</TabsTrigger>
          </TabsList>
          <TabsContent value="dps" className="pt-4">
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="dps" fill="var(--color-chart-1)" name="DPS" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          <TabsContent value="maxhit" className="pt-4">
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="maxHit" fill="var(--color-chart-2)" name="Max Hit" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          <TabsContent value="hitchance" className="pt-4">
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" />
                  <YAxis unit="%" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="hitChance" fill="var(--color-chart-3)" name="Hit Chance" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

