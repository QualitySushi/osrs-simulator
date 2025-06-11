"use client";

import { useState, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCalculatorStore } from "@/store/calculator-store";
import { calculatorApi } from "@/services/api";

export function Visualizations() {
  const { presets } = useCalculatorStore();
  const [data, setData] = useState<Array<{ name: string; dps: number; maxHit: number; hitChance: number }>>([]);

  useEffect(() => {
    const loadData = async () => {
      const results = await Promise.all(
        presets.map(async (p) => {
          try {
            const res = await calculatorApi.calculateDps(p.params);
            return {
              name: p.name,
              dps: res.dps,
              maxHit: res.max_hit,
              hitChance: res.hit_chance * 100,
            };
          } catch {
            return null;
          }
        })
      );
      setData(results.filter(Boolean) as any);
    };
    if (presets.length > 0) {
      loadData();
    } else {
      setData([]);
    }
  }, [presets]);

  if (presets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Visualizations</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm mb-4 text-center">
            Save presets to visualize their performance.
          </p>
          
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
        <div className="mb-4" />
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

