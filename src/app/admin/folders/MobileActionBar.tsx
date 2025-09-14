"use client";
import React from 'react';
import { Edit, Trash2, FolderPlus } from 'lucide-react';

interface MobileActionBarProps {
  selectedFolder: string | null;
  onNewFolder: () => void;
  onRename: () => void;
  onDelete: () => void;
}

const MobileActionBar: React.FC<MobileActionBarProps> = ({
  selectedFolder,
  onNewFolder,
  onRename,
  onDelete
}) => {
  if (!selectedFolder) return null;
  
  return (
    <div className="fixed bottom-4 left-0 right-0 z-40 flex justify-center px-4 md:hidden">
      <div className="bg-[var(--color-bg-panel)] rounded-full shadow-lg flex items-center p-1.5 space-x-1">
        <button
          onClick={onRename}
          className="p-2.5 rounded-full bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors"
          aria-label="Umbenennen"
        >
          <Edit size={20} className="text-gray-300" />
        </button>
        
        <button
          onClick={onNewFolder}
          className="p-2.5 rounded-full bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors"
          aria-label="Neuer Unterordner"
        >
          <FolderPlus size={20} className="text-gray-300" />
        </button>
        
        <button
          onClick={onDelete}
          className="p-2.5 rounded-full bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors"
          aria-label="Löschen"
        >
          <Trash2 size={20} className="text-red-400" />
        </button>
      </div>
    </div>
  );
};

export default MobileActionBar;
