'use client';

import { useEffect, useState } from 'react';

export default function TermsContent() {
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/tnc');
        if (!res.ok) {
          throw new Error('Failed to load terms');
        }
        const data = await res.text();
        setContent(data);
      } catch (e) {
        setError('Unable to load Terms & Conditions right now. Please try again later.');
      }
    };
    load();
  }, []);

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  return (
    <article className="prose max-w-none prose-indigo">
      <pre className="whitespace-pre-wrap text-gray-800 leading-7">{content}</pre>
    </article>
  );
}


