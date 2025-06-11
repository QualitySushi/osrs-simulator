'use client';

import { useState } from 'react';

export default function ReportBugPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    try {
      const res = await fetch('/api/report-bug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body: description }),
      });

      if (res.ok) {
        setTitle('');
        setDescription('');
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <main id="main" className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">Report a Bug</h1>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
        <div>
          <label className="block mb-1 font-medium">Title</label>
          <input
            className="w-full border p-2 rounded"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Description</label>
          <textarea
            className="w-full border p-2 rounded"
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          className="bg-primary text-primary-foreground px-4 py-2 rounded"
          disabled={status === 'submitting'}
        >
          Submit
        </button>
        {status === 'success' && (
          <p className="text-green-600 mt-2">Thank you! Your report has been submitted.</p>
        )}
        {status === 'error' && (
          <p className="text-red-600 mt-2">There was an error submitting your report.</p>
        )}
      </form>
    </main>
  );
}
