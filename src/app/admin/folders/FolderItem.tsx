"use client";
import React from 'react';
import { Folder, File, ChevronRight, ChevronDown } from 'lucide-react';
import { FileNode } from './types';

interface FolderItemProps {
  node: FileNode;
  path: string;
  isOpen: boolean;
  isSelected: boolean;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
  level: number;
}

const FolderItem: React.FC<FolderItemProps> = ({
  node,
  path,
  isOpen,
  isSelected,
  onToggle,
  onSelect,
  level
}) => {
  const fullPath = `${path}/${node.name}`;
  const hasChildren = node.children && node.children.length > 0;
  const isFolder = node.type === 'folder' || node.type === 'directory';
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFolder) {
      onToggle(fullPath);
    }
    onSelect(fullPath);
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
        
        <span className="truncate">{node.name}</span>
        
        {node.type === 'file' && node.size !== undefined && (
          <span className="ml-auto text-xs text-gray-400">
            {formatFileSize(node.size)}
          </span>
        )}
      </div>
      
      {isFolder && isOpen && node.children && (
        <div className="folder-children">
          {node.children.map((child, index) => (
            <FolderItem
              key={`${fullPath}/${child.name}`}
              node={child}
              path={fullPath}
              isOpen={isOpen}
              isSelected={false}
              onToggle={onToggle}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default FolderItem;
