"use client";
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import EditBlogPostPage from "./EditBlogPostClient";

export default function EditBlogPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const { id } = use(params);

  useEffect(() => {
    if (!id) {
      router.push('/404');
    } else {
      setIsReady(true);
    }
  }, [id, router]);

  if (!isReady) return <div>Loading...</div>;

  // Wir benötigen keinen Token mehr, da wir lokale JSON-Dateien verwenden
  return <EditBlogPostPage id={id} token="" />;
}