export interface FileNode {
  name: string;
  type: "file" | "directory" | "folder";
  children?: FileNode[];
  size?: number;
  path?: string;
}

export interface ApiResponse {
  success?: boolean;
  error?: string;
  message?: string;
  deleted?: string;
  created?: string;
}
