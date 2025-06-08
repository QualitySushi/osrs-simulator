'use client';
import { useState } from 'react';
import { useCalculatorStore } from '@/store/calculator-store';

export default function ImportPage() {
  const [seed, setSeed] = useState('');

  const handleImport = () => {
    try {
      const jsonStr = atob(seed.trim());
      const data = JSON.parse(jsonStr);
      useCalculatorStore.getState().setParams(data);
      alert('Profile imported');
    } catch (e) {
      alert('Invalid seed');
    }
  };

  return (
    <main id="main" className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">Import Profile Seed</h1>
      <textarea
        className="w-full border p-2 mb-4 rounded"
        rows={6}
        value={seed}
        onChange={(e) => setSeed(e.target.value)}
      />
      <button
        className="bg-primary text-primary-foreground px-4 py-2 rounded"
        onClick={handleImport}
      >
        Import
      </button>
    </main>
  );
}
