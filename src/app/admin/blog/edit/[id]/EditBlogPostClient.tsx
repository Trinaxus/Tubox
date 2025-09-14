"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import EditBlogPostForm from "../EditBlogPostForm";

export default function EditBlogPostPage({ id, token }: { id: string, token: string }) {
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchPost() {
      try {
        // Zuerst den Index laden, um den Slug für die gegebene ID zu finden
        // Verwende die interne API
        const indexRes = await fetch(`/api/json-blog`, { cache: 'no-store' });
        
        if (!indexRes.ok) {
          console.error('Fehler beim Laden des Blog-Index:', await indexRes.text());
          router.replace("/404");
          return;
        }
        
        const indexData = await indexRes.json();
        console.log('Blog-Index geladen:', indexData);
        const postsArray = Array.isArray(indexData?.results) ? indexData.results : [];
        
        // Finde den Blog-Post mit der angegebenen ID oder Slug
        const postMeta = postsArray.find((p: any) => 
          // Suche nach ID-Übereinstimmung
          (p.id && p.id.toString() === id.toString()) ||
          // Oder nach Slug-Übereinstimmung
          (p.slug && p.slug === id)
        );
        
        if (!postMeta) {
          console.error(`Blog-Post mit ID ${id} nicht gefunden`);
          router.replace("/404");
          return;
        }
        
        console.log('Blog-Post-Metadaten gefunden:', postMeta);
        
        // Lade den vollständigen Blog-Post mit dem gefundenen Slug über interne API
        const res = await fetch(`/api/json-blog/${encodeURIComponent(postMeta.slug)}`, { cache: 'no-store' });
        
        if (!res.ok) {
          console.error(`Fehler beim Laden des Blog-Posts mit Slug ${postMeta.slug}:`, await res.text());
          router.replace("/404");
          return;
        }
        
        const data = await res.json();
        console.log('Geladener Blog-Post:', data);
        setPost(data);
      } catch (e) {
        console.error('Fehler beim Laden des Blog-Posts:', e);
        router.replace("/404");
      } finally {
        setLoading(false);
      }
    }
    fetchPost();
  }, [id, router]);

  if (loading) return <div>Lade...</div>;
  if (!post) return null;

  return <EditBlogPostForm post={post} />;
}
