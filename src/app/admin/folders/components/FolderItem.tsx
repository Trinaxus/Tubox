"use client";
import React, { useState } from 'react';
import { Folder, File, ChevronRight, ChevronDown, MoreHorizontal } from 'lucide-react';

interface FileNode {
  name: string;
  type: "file" | "directory" | "folder";
  children?: FileNode[];
  size?: number;
  path?: string;
}

interface FolderItemProps {
  item: FileNode;
  path: string;
  selectedFolder: string | null;
  onSelect: (item: FileNode, path: string) => void;
  onToggle: (path: string) => void;
  isOpen: boolean;
  level: number;
  openFolders: Record<string, boolean>;
}


const FolderItem: React.FC<FolderItemProps> = ({
  item,
  path,
  selectedFolder,
  onSelect,
  onToggle,
  isOpen,
  level,
  openFolders
}) => {
  const fullPath = `${path}/${item.name}`;
  const isFolder = item.type === 'folder' || item.type === 'directory';
  const hasChildren = isFolder && item.children && item.children.length > 0;
  const isSelected = selectedFolder === fullPath;
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(item, fullPath);
    if (isFolder && hasChildren) {
      onToggle(fullPath);
    }
  };
  
  const formatFileSize = (size?: number): string => {
    if (size === undefined) return '';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };
  
  return (
    <div className="folder-tree-item">
      <div 
        className={`flex items-center p-2 rounded-md cursor-pointer hover:bg-[var(--color-bg-hover)] ${isSelected ? 'bg-[var(--color-bg-selected)]' : ''}`}
        onClick={handleClick}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        <div className="w-6 flex justify-center">
          {isFolder && hasChildren ? (
            isOpen ? (
              <ChevronDown size={16} className="text-gray-400" />
            ) : (
              <ChevronRight size={16} className="text-gray-400" />
            )
          ) : (
            <span className="w-4"></span>
          )}
        </div>
        
        <div className="mr-2">
          {isFolder ? (
            <Folder size={18} className="text-[var(--color-primary-500)]" />
          ) : (
            <File size={18} className="text-gray-400" />
          )}
        </div>
        
        <span className="truncate">{item.name}</span>
        
        {item.type === 'file' && item.size !== undefined && (
          <span className="ml-auto text-xs text-gray-400">
            {formatFileSize(item.size)}
          </span>
        )}
        
        {/* Mobile action button */}
        <button 
          className="p-1.5 rounded-full bg-[var(--color-bg-secondary)]/50 hover:bg-[var(--color-bg-hover)] ml-auto md:hidden"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(item, fullPath);
          }}
        >
          <MoreHorizontal size={16} className="text-gray-300" />
        </button>
      </div>
      
      {isFolder && isOpen && item.children && (
        <div className="folder-children">
          {item.children.map((child, index) => {
            const childFullPath = `${fullPath}/${child.name}`;
            return (
              <FolderItem
                key={childFullPath}
                item={child}
                path={fullPath}
                selectedFolder={selectedFolder}
                onSelect={onSelect}
                onToggle={onToggle}
                isOpen={openFolders[childFullPath] || false}
                level={level + 1}
                openFolders={openFolders}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FolderItem;
