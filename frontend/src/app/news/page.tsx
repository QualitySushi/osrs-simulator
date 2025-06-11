'use client';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Article {
  id: number;
  title: string;
  content: string;
}

export default function NewsPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('newsArticles');
    if (stored) {
      try {
        setArticles(JSON.parse(stored));
      } catch {
        setArticles([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('newsArticles', JSON.stringify(articles));
  }, [articles]);

  const addArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setArticles(prev => [
      ...prev,
      { id: Date.now(), title: title.trim(), content: content.trim() },
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
          <li key={article.id} className="border p-4 rounded">
            <h2 className="text-xl font-semibold mb-2">{article.title}</h2>
            <p>{article.content}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
