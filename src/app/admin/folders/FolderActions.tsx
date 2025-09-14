import React from "react";
import { FolderPlus, Upload, Edit, Trash2, FolderUp } from 'lucide-react';

export interface FolderActionProps {
  onRename: () => void;
  onDelete: () => void;
  onNewFolder: () => void;
  onUploadFile: () => void;
  onMove: (sourcePath: string, targetPath: string) => void;
  disableRename?: boolean;
  disableMove?: boolean;
  disableUpload?: boolean;
}

export default function FolderActions({
  onRename,
  onDelete,
  onNewFolder,
  onUploadFile,
  onMove,
  disableRename = false,
  disableMove = false,
  disableUpload = false,
}: FolderActionProps) {
  return (
    <div className="folder-actions-bar" style={{
      display: "flex",
      gap: 16,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 36,
      flexWrap: "wrap"
    }}>
      {/* Desktop-Buttons */}
      <div className="hidden md:flex md:flex-wrap md:gap-4 md:justify-center">
        <HoverButton 
          onClick={onNewFolder} 
          label={<>
            <FolderPlus size={18} className="mr-2" />
            <span className="hidden sm:inline">Neuer Ordner</span>
          </>} 
        />
        <HoverButton 
          onClick={onUploadFile} 
          label={<>
            <Upload size={18} className="mr-2" />
            <span className="hidden sm:inline">Datei hochladen</span>
          </>} 
        />
        <HoverButton 
          onClick={onRename} 
          label={<>
            <Edit size={18} className="mr-2" />
            <span className="hidden sm:inline">Umbenennen</span>
          </>} 
          disabled={disableRename} 
        />
        <HoverButton 
          onClick={() => onMove('dummy-source', 'dummy-target')} 
          label={<>
            <FolderUp size={18} className="mr-2" />
            <span className="hidden sm:inline">Verschieben</span>
          </>} 
          disabled={disableMove} 
        />
        <HoverButton 
          onClick={onDelete} 
          label={<>
            <Trash2 size={18} className="mr-2" />
            <span className="hidden sm:inline">Löschen</span>
          </>} 
        />
      </div>
      
      {/* Mobile-Buttons (nur die wichtigsten) */}
      <div className="flex md:hidden gap-2">
        <MobileButton onClick={onNewFolder} icon={<FolderPlus size={20} />} label="Neu" />
        <MobileButton onClick={onUploadFile} icon={<Upload size={20} />} label="Upload" />
      </div>
    </div>
  );
}

function flatButtonStyle(isHover = false): React.CSSProperties {
  return {
    background: isHover ? "rgba(0,225,255,0.07)" : "transparent",
    color: "var(--color-primary-500)",
    border: "2px solid var(--color-primary-500)",
    borderRadius: 22,
    fontWeight: 700,
    fontSize: 18,
    padding: "8px 28px",
    cursor: "pointer",
    transition: "background 0.18s, color 0.18s, border 0.18s",
    outline: "none",
    marginBottom: 0,
    marginTop: 0,
    letterSpacing: 0.5,
    display: "flex",
    alignItems: "center",
    gap: 4,
    boxShadow: "none",
    minHeight: 44,
  };
}

function HoverButton({ onClick, label, disabled = false }: { onClick: () => void; label: React.ReactNode; disabled?: boolean }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      className="folder-action-btn"
      style={flatButtonStyle(hover)}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {label}
    </button>
  );
}

function MobileButton({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      className="flex flex-col items-center justify-center p-3 rounded-lg bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors"
      onClick={onClick}
    >
      <div className="text-[var(--color-primary-500)]">{icon}</div>
      <span className="text-xs mt-1 text-gray-300">{label}</span>
    </button>
  );
}


