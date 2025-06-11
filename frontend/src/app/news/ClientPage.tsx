'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Article {
  id: number;
  title: string;
  content: string;
  author: string;
  date: string;
  image: string;
}

const defaultArticles: Article[] = [
  {
    id: 1,
    title: 'Yama Storms Into Gielinor',
    author: 'ScapeLab Reporter',
    date: '2025-05-14',
    image: '/landscape-placeholder.svg',
    content:
      'May wrapped up with the fiery arrival of Yama and a flurry of blogs detailing upcoming combat tweaks.',
  },
  {
    id: 2,
    title: 'Community Cheers for Stackable Clues',
    author: 'ScapeLab Reporter',
    date: '2025-05-30',
    image: '/landscape-placeholder.svg',
    content:
      'Poll 84 results kept the one-hour clue timer and let players hold up to five clues at once.',
  },
  {
    id: 3,
    title: 'A Mixed June for OSRS Events',
    author: 'ScapeLab Reporter',
    date: '2025-06-08',
    image: '/landscape-placeholder.svg',
    content:
      'June brought Yama tweaks but no OSRS League as resources shifted to other projects.',
  },
  {
    id: 4,
    title: "Reddit's Latest Running Jokes",
    author: 'ScapeLab Reporter',
    date: '2025-06-10',
    image: '/landscape-placeholder.svg',
    content:
      'Memes about insane grinds and hooded slayer helms kept the community entertained.',
  },
];

export default function NewsClientPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('newsArticles');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setArticles(parsed);
          return;
        }
      } catch {
        // ignore
      }
    }
    setArticles(defaultArticles);
  }, []);

  useEffect(() => {
    localStorage.setItem('newsArticles', JSON.stringify(articles));
  }, [articles]);

  const addArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setArticles(prev => [
      ...prev,
      {
        id: Date.now(),
        title: title.trim(),
        content: content.trim(),
        author: 'ScapeLab Reporter',
        date: new Date().toISOString().slice(0, 10),
        image: '/landscape-placeholder.svg',
      },
    ]);
    setTitle('');
    setContent('');
  };

  return (
    <main id="main" className="container mx-auto py-8 px-4">
      <h1 className="text-4xl font-bold mb-8 text-center">News</h1>
      <form onSubmit={addArticle} className="space-y-4 mb-8 max-w-xl mx-auto">
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Title"
        />
        <textarea
          className="w-full h-32 p-2 rounded border"
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Content"
        />
        <Button type="submit" className="w-full">
          Post Article
        </Button>
      </form>
      <ul className="space-y-6 max-w-xl mx-auto">
        {articles.map(article => (
          <li
            key={article.id}
            id={`article-${article.id}`}
            className="border p-4 rounded"
          >
            <img
              src={article.image}
              alt=""
              className="mb-2 w-full h-48 object-cover rounded"
            />
            <h2 className="text-xl font-semibold mb-1">{article.title}</h2>
            <p className="text-gray-500 text-sm mb-2">
              {article.author} - {new Date(article.date).toLocaleDateString()}
            </p>
            <p>{article.content}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
