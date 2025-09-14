import { redirect } from 'next/navigation';

export default function Home() {
  // Leite direkt zur Galerie-Seite weiter
  redirect('/gallery');
  
  // Der folgende Code wird nie ausgeführt, ist aber notwendig für TypeScript
  return null;
}
