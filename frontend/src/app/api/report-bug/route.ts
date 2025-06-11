import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { title, body } = await request.json();

  if (!title || !body) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const token = process.env.GITHUB_BUG_TOKEN;
  const repo = process.env.GITHUB_REPO || 'QualitySushi/osrs-simulator';

  if (!token) {
    return NextResponse.json({ error: 'GitHub token not configured' }, { status: 500 });
  }

  const res = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json',
    },
    body: JSON.stringify({
      event_type: 'bug_report',
      client_payload: { title, body },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: 'GitHub dispatch failed', details: text }, { status: 500 });
  }

  return NextResponse.json({ status: 'queued' });
}
