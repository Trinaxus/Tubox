"use client";

import React, { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText, Image, Music, Video, Code, File, Package } from "lucide-react";

// Hilfsfunktion zur Erkennung von Mobilgeräten
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkMobile();
    
    // Add event listener
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return isMobile;
};

// Funktion zur Bestimmung des Dateityp-Icons basierend auf der Dateiendung
const getFileIcon = (filename: string) => {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  switch(extension) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
    case 'svg':
      return <Image size={16} style={{ color: "#4dabf7" }} />;
    case 'mp3':
    case 'wav':
    case 'ogg':
    case 'flac':
      return <Music size={16} style={{ color: "#9775fa" }} />;
    case 'mp4':
    case 'webm':
    case 'avi':
    case 'mov':
      return <Video size={16} style={{ color: "#f783ac" }} />;
    case 'html':
    case 'css':
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
    case 'json':
    case 'php':
      return <Code size={16} style={{ color: "#69db7c" }} />;
    case 'pdf':
      return <File size={16} style={{ color: "#ff6b6b" }} />;
    case 'zip':
    case 'rar':
    case 'tar':
    case 'gz':
      return <Package size={16} style={{ color: "#ffa94d" }} />;
    default:
      return <FileText size={16} style={{ color: "#888" }} />;
  }
};

interface FileNode {
  name: string;
  path: string;
  type: "folder" | "directory" | "file";
  children?: FileNode[];
}

interface FolderTreeProps {
  items: FileNode[];
  currentNode: FileNode | null;
  setCurrentNode: (node: FileNode | null) => void;
  level?: number;
}

const FolderTree: React.FC<FolderTreeProps> = ({
  items,
  currentNode,
  setCurrentNode,
  level = 0,
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const isMobile = useIsMobile();

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  return (
    <ul style={{ 
      listStyle: "none", 
      padding: 0, 
      margin: 0,
      maxWidth: "100%",
      overflowX: "hidden"
    }}>
      {items.map((item) => {
        if (item.type === "folder" || item.type === "directory") {
          const isExpanded = expandedFolders[item.path];
          const isActive = currentNode?.path === item.path;
          
          return (
            <li key={item.path} style={{ marginBottom: "8px" }}>
              <div 
                style={{
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                  padding: isMobile ? "10px 8px" : "8px 12px",
                  borderRadius: "8px",
                  backgroundColor: isActive ? "#2a2a2a" : "#1a1a1a",
                  border: isActive ? "1px solid #00e5ff" : "1px solid #333",
                  marginLeft: isMobile ? Math.max(0, (level - 1) * 8) : level * 8,
                  color: "#fff",
                  fontSize: isMobile ? "14px" : "inherit",
                  width: isMobile ? `calc(100% - ${level * 8}px)` : "auto",
                  boxSizing: "border-box" as "border-box",
                  overflowX: "hidden" as "hidden",
                  textOverflow: "ellipsis" as "ellipsis",
                  whiteSpace: "nowrap" as "nowrap"
                }}
                onClick={() => setCurrentNode(item)}
              >
                <button
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: isMobile ? "2px" : "4px",
                    display: "flex",
                    color: "#888",
                    minWidth: isMobile ? "20px" : "24px"
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFolder(item.path);
                  }}
                >
                  {item.children && item.children.length > 0 ? (
                    isExpanded ? 
                      <ChevronDown size={isMobile ? 14 : 16} /> : 
                      <ChevronRight size={isMobile ? 14 : 16} />
                  ) : (
                    <span style={{ width: isMobile ? 14 : 16, display: "inline-block" }} />
                  )}
                </button>
                
                {isExpanded ? 
                  <FolderOpen size={isMobile ? 16 : 18} style={{ color: "#00e5ff", marginRight: "8px" }} /> : 
                  <Folder size={isMobile ? 16 : 18} style={{ color: "#00e5ff", marginRight: "8px" }} />
                }
                <span style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: isMobile ? "calc(100% - 50px)" : "auto"
                }}>{item.name}</span>
              </div>
              
              {isExpanded && Array.isArray(item.children) && item.children.length > 0 && (
                <div style={{ 
                  paddingLeft: isMobile ? "12px" : "16px", 
                  marginLeft: isMobile ? "6px" : "10px", 
                  borderLeft: "1px dashed #333" 
                }}>
                  <FolderTree
                    items={item.children}
                    currentNode={currentNode}
                    setCurrentNode={setCurrentNode}
                    level={level + 1}
                  />
                </div>
              )}
            </li>
          );
        } else {
          // Datei-Node
          const isActive = currentNode?.path === item.path;
          const fileName = item.name;
          
          return (
            <li key={item.path} style={{ marginBottom: "4px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                  padding: isMobile ? "8px 8px" : "6px 12px",
                  borderRadius: "6px",
                  backgroundColor: isActive ? "rgba(0, 229, 255, 0.1)" : "transparent",
                  color: isActive ? "#00e5ff" : "#ddd",
                  marginLeft: isMobile ? Math.max(0, (level - 1) * 8) + 12 : (level * 8) + 16,
                  fontSize: isMobile ? "13px" : "inherit",
                  width: isMobile ? `calc(100% - ${(level * 8) + 20}px)` : "auto",
                  boxSizing: "border-box" as "border-box",
                  overflowX: "hidden" as "hidden",
                  textOverflow: "ellipsis" as "ellipsis",
                  whiteSpace: "nowrap" as "nowrap"
                }}
                onClick={() => setCurrentNode(item)}
              >
                {getFileIcon(fileName)}
                <span style={{
                  marginLeft: "8px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: isMobile ? "calc(100% - 30px)" : "auto"
                }}>{fileName}</span>
              </div>
            </li>
          );
        }
      })}
    </ul>
  );
};

export default FolderTree;
