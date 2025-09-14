import React from "react";
import { Github, Heart } from "lucide-react";
import Link from "next/link";

const Footer = () => {
  return (
    <footer className="w-full bg-black/50 border-t border-[rgba(255,30,0,0.51)] backdrop-blur-md py-6 mt-auto">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-[#b4b4b4] text-sm flex items-center">
            <span>Made with</span>
            <Heart size={20} className="mx-2 text-[#ff2600] stroke-2" />
            <span>for tubox.de</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/datenschutz" className="text-[#b4b4b4] hover:text-[#ff2600] transition-colors text-sm">
              Datenschutz
            </Link>
            <Link href="/impressum" className="text-[#b4b4b4] hover:text-[#ff2600] transition-colors text-sm">
              Impressum
            </Link>
            <a
              href="#"
              className="text-[#b4b4b4] hover:text-[#ff2600] transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github size={22} />
            </a>
            <span className="text-[#b4b4b4] text-sm">2025</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
