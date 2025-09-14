'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const handleLogin = () => {
    window.location.href = '/login';
  };
  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch {}
    // Zur Sicherheit Seite neu laden/redirect
    window.location.href = '/';
  };

  useEffect(() => {
    setMounted(true);
    // Auth-Status laden
    (async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setIsLoggedIn(Boolean(data?.isLoggedIn ?? true));
          setIsAdmin((data?.role || data?.user?.role) === 'admin');
        } else {
          setIsLoggedIn(false);
          setIsAdmin(false);
        }
      } catch {
        setIsLoggedIn(false);
        setIsAdmin(false);
      }
    })();
  }, []);

  if (!mounted) return null;
  return (
    <header className="sticky top-0 z-50 bg-black/50 backdrop-blur-md border-b border-[rgba(255,30,0,0.51)] py-5">
      <div className="max-w-[1200px] w-full mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center">
          <Link href="/" onClick={() => window.scrollTo(0, 0)} className="transition-transform duration-800 hover:scale-110">
            <Image 
              src="/Dennis Lach-Photography.png" 
              alt="Tubox Logo"
              width={100}
              height={35}
              className="h-10 w-auto"
              priority
            />
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex space-x-4 items-center">
          <Link href="/" className="px-4 py-2 border border-transparent bg-black/70 hover:bg-[rgba(255,59,48,0.3)] hover:border-[#ff3b30] hover:shadow-[0_0_20px_rgb(255,42,0)] text-white text-sm font-medium uppercase tracking-wider rounded-2xl transition-all duration-300">
            Portfolio
          </Link>
          <Link href="/blog" className="px-4 py-2 border border-transparent bg-black/70 hover:bg-[rgba(255,59,48,0.3)] hover:border-[#ff3b30] hover:shadow-[0_0_20px_rgb(255,42,0)] text-white text-sm font-medium uppercase tracking-wider rounded-2xl transition-all duration-300">
            Blog
          </Link>
          {isAdmin && (
            <Link href="/admin" className="px-4 py-2 border border-transparent bg-black/70 hover:bg-[rgba(255,59,48,0.3)] hover:border-[#ff3b30] hover:shadow-[0_0_20px_rgb(255,42,0)] text-white text-sm font-medium uppercase tracking-wider rounded-2xl transition-all duration-300">
              Admin
            </Link>
          )}
          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              title="Logout"
              aria-label="Logout"
              className="ml-2 p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              {/* Standard Logout Icon (Heroicons - Arrow Right On Rectangle) */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M3.75 4.5A2.25 2.25 0 0 1 6 2.25h6A2.25 2.25 0 0 1 14.25 4.5v1.5a.75.75 0 0 1-1.5 0V4.5A.75.75 0 0 0 12 3.75H6A.75.75 0 0 0 5.25 4.5v15A.75.75 0 0 0 6 20.25h6a.75.75 0 0 0 .75-.75v-1.5a.75.75 0 0 1 1.5 0V19.5A2.25 2.25 0 0 1 12 21.75H6A2.25 2.25 0 0 1 3.75 19.5v-15Z" clipRule="evenodd"/>
                <path d="M17.47 15.53a.75.75 0 0 1-1.06-1.06l2.47-2.47H9.75a.75.75 0 0 1 0-1.5h9.13l-2.47-2.47A.75.75 0 0 1 17.47 6.47l4 4a.75.75 0 0 1 0 1.06l-4 4Z"/>
              </svg>
            </button>
          ) : (
            <button
              onClick={handleLogin}
              title="Login"
              aria-label="Login"
              className="ml-2 p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              {/* Standard Login Icon (Heroicons - Arrow Left On Rectangle) */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M20.25 4.5A2.25 2.25 0 0 0 18 2.25h-6A2.25 2.25 0 0 0 9.75 4.5v1.5a.75.75 0 0 0 1.5 0V4.5A.75.75 0 0 1 12 3.75h6a.75.75 0 0 1 .75.75v15a.75.75 0 0 1-.75.75h-6a.75.75 0 0 1-.75-.75v-1.5a.75.75 0 0 0-1.5 0V19.5A2.25 2.25 0 0 0 12 21.75h6A2.25 2.25 0 0 0 20.25 19.5v-15Z" clipRule="evenodd"/>
                <path d="M6.53 8.47a.75.75 0 0 1 1.06 1.06L5.122 12l2.47 2.47a.75.75 0 1 1-1.06 1.06l-4-4a.75.75 0 0 1 0-1.06l4-4Z"/>
              </svg>
            </button>
          )}
        </nav>

        {/* Mobile Hamburger Button */}
        <button 
          className="md:hidden p-2 text-white focus:outline-none"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="w-6 flex flex-col gap-1">
            <span className={`h-0.5 w-full bg-white transition-all ${isOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
            <span className={`h-0.5 w-full bg-white transition-all ${isOpen ? 'opacity-0' : 'opacity-100'}`}></span>
            <span className={`h-0.5 w-full bg-white transition-all ${isOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
          </div>
        </button>
      </div>

      {/* Mobile Menu */}
      <div className={`md:hidden ${isOpen ? 'block' : 'hidden'} bg-black/90 backdrop-blur-md`}>
        <div className="px-4 py-2 flex flex-col space-y-2 items-center">
          <Link 
            href="/" 
            className="px-4 py-2 border border-transparent hover:bg-[rgba(255,59,48,0.3)] hover:border-[#ff3b30] text-white text-sm font-medium uppercase tracking-wider rounded-2xl transition-all duration-300 text-center"
            onClick={() => setIsOpen(false)}
          >
            Portfolio
          </Link>
          <Link 
            href="/blog" 
            className="px-4 py-2 border border-transparent hover:bg-[rgba(255,59,48,0.3)] hover:border-[#ff3b30] text-white text-sm font-medium uppercase tracking-wider rounded-2xl transition-all duration-300 text-center"
            onClick={() => setIsOpen(false)}
          >
            Blog
          </Link>
          {isAdmin && (
            <Link 
              href="/admin" 
              className="px-4 py-2 border border-transparent hover:bg-[rgba(255,59,48,0.3)] hover:border-[#ff3b30] text-white text-sm font-medium uppercase tracking-wider rounded-2xl transition-all duration-300 text-center"
              onClick={() => setIsOpen(false)}
            >
              Admin
            </Link>
          )}
          {isLoggedIn ? (
            <button 
              onClick={() => { setIsOpen(false); handleLogout(); }}
              title="Logout"
              aria-label="Logout"
              className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M3.75 4.5A2.25 2.25 0 0 1 6 2.25h6A2.25 2.25 0 0 1 14.25 4.5v1.5a.75.75 0 0 1-1.5 0V4.5A.75.75 0 0 0 12 3.75H6A.75.75 0 0 0 5.25 4.5v15A.75.75 0 0 0 6 20.25h6a.75.75 0 0 0 .75-.75v-1.5a.75.75 0 0 1 1.5 0V19.5A2.25 2.25 0 0 1 12 21.75H6A2.25 2.25 0 0 1 3.75 19.5v-15Z" clipRule="evenodd"/>
                <path d="M17.47 15.53a.75.75 0 0 1-1.06-1.06l2.47-2.47H9.75a.75.75 0 0 1 0-1.5h9.13l-2.47-2.47A.75.75 0 0 1 17.47 6.47l4 4a.75.75 0 0 1 0 1.06l-4 4Z"/>
              </svg>
            </button>
          ) : (
            <button 
              onClick={() => { setIsOpen(false); handleLogin(); }}
              title="Login"
              aria-label="Login"
              className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M20.25 4.5A2.25 2.25 0 0 0 18 2.25h-6A2.25 2.25 0 0 0 9.75 4.5v1.5a.75.75 0 0 0 1.5 0V4.5A.75.75 0 0 1 12 3.75h6a.75.75 0 0 1 .75.75v15a.75.75 0 0 1-.75.75h-6a.75.75 0 0 1-.75-.75v-1.5a.75.75 0 0 0-1.5 0V19.5A2.25 2.25 0 0 0 12 21.75h6A2.25 2.25 0 0 0 20.25 19.5v-15Z" clipRule="evenodd"/>
                <path d="M6.53 8.47a.75.75 0 0 1 1.06 1.06L5.122 12l2.47 2.47a.75.75 0 1 1-1.06 1.06l-4-4a.75.75 0 0 1 0-1.06l4-4Z"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
