"use client";

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function BlogAdmin() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    author: 'Trinax',
    category: 'Music',
    tags: '',
    featuredImage: '',
    isDraft: '0'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generateSlug = () => {
    if (formData.title) {
      const slug = formData.title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      setFormData(prev => ({ ...prev, slug }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    try {
      // Konvertiere Tags-String in ein Array
      const tagsArray = formData.tags.split(';')
        .map(tag => tag.trim())
        .filter(tag => tag !== '');

      // Erstelle das Blog-Post-Objekt
      const blogPost = {
        id: Date.now(), // Einfache ID-Generierung
        title: formData.title,
        slug: formData.slug,
        excerpt: formData.excerpt,
        content: formData.content,
        author: formData.author,
        category: formData.category,
        tags: tagsArray,
        featuredImage: formData.featuredImage,
        isDraft: formData.isDraft,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Sende den Blog-Post an die API
      const response = await fetch('/api/blog/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(blogPost),
      });

      if (!response.ok) {
        throw new Error('Fehler beim Erstellen des Blog-Posts');
      }

      const result = await response.json();
      setMessage('Blog-Post erfolgreich erstellt!');
      
      // Leere das Formular
      setFormData({
        title: '',
        slug: '',
        excerpt: '',
        content: '',
        author: 'Trinax',
        category: 'Music',
        tags: '',
        featuredImage: '',
        isDraft: '0'
      });

      // Aktualisiere die Blog-Liste
      router.refresh();
    } catch (error) {
      console.error('Fehler:', error);
      setMessage('Fehler beim Erstellen des Blog-Posts. Bitte versuche es erneut.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <h1>Blog-Post erstellen</h1>
      <Link href="/blog" style={{ display: 'inline-block', marginBottom: 20, color: '#0070f3', textDecoration: 'none' }}>
        Zurück zur Blog-Liste
      </Link>

      {message && (
        <div style={{ 
          padding: '10px', 
          marginBottom: '20px', 
          backgroundColor: message.includes('Fehler') ? '#ffecec' : '#e7f7e7',
          border: `1px solid ${message.includes('Fehler') ? '#f5c6cb' : '#c3e6cb'}`,
          borderRadius: '4px'
        }}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label htmlFor="title" style={{ display: 'block', marginBottom: '5px' }}>Titel:</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="slug" style={{ display: 'block', marginBottom: '5px' }}>Slug:</label>
            <input
              type="text"
              id="slug"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>
          <button 
            type="button" 
            onClick={generateSlug}
            style={{ padding: '8px 12px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Generieren
          </button>
        </div>

        <div>
          <label htmlFor="excerpt" style={{ display: 'block', marginBottom: '5px' }}>Auszug:</label>
          <input
            type="text"
            id="excerpt"
            name="excerpt"
            value={formData.excerpt}
            onChange={handleChange}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>

        <div>
          <label htmlFor="content" style={{ display: 'block', marginBottom: '5px' }}>Inhalt (HTML):</label>
          <textarea
            id="content"
            name="content"
            value={formData.content}
            onChange={handleChange}
            rows={10}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>

        <div>
          <label htmlFor="author" style={{ display: 'block', marginBottom: '5px' }}>Autor:</label>
          <input
            type="text"
            id="author"
            name="author"
            value={formData.author}
            onChange={handleChange}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>

        <div>
          <label htmlFor="category" style={{ display: 'block', marginBottom: '5px' }}>Kategorie:</label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="Music">Music</option>
            <option value="Tech">Tech</option>
            <option value="News">News</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="tags" style={{ display: 'block', marginBottom: '5px' }}>Tags (mit Semikolon getrennt):</label>
          <input
            type="text"
            id="tags"
            name="tags"
            value={formData.tags}
            onChange={handleChange}
            placeholder="tag1; tag2; tag3"
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>

        <div>
          <label htmlFor="featuredImage" style={{ display: 'block', marginBottom: '5px' }}>Bild-URL:</label>
          <input
            type="text"
            id="featuredImage"
            name="featuredImage"
            value={formData.featuredImage}
            onChange={handleChange}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>

        <div>
          <label htmlFor="isDraft" style={{ display: 'block', marginBottom: '5px' }}>Status:</label>
          <select
            id="isDraft"
            name="isDraft"
            value={formData.isDraft}
            onChange={handleChange}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="0">Veröffentlicht</option>
            <option value="1">Entwurf</option>
          </select>
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          style={{ 
            padding: '10px 15px', 
            backgroundColor: '#0070f3', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.7 : 1
          }}
        >
          {isSubmitting ? 'Wird erstellt...' : 'Blog-Post erstellen'}
        </button>
      </form>
    </div>
  );
}
