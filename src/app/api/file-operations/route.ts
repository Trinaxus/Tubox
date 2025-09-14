import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Sicherheitscheck für Admin-Berechtigungen
async function checkAdminPermission(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('tubox_session')?.value;
    if (!sessionCookie) return false;
    const sessionData = JSON.parse(decodeURIComponent(sessionCookie));
    return sessionData.role === 'admin';
  } catch (error) {
    console.error('Fehler bei der Berechtigungsprüfung:', error);
    return false;
  }
}

// Hilfsfunktionen für lokale Pfade
const UPLOADS_FS = path.join(process.cwd(), 'server', 'uploads');
function ensureUploadsRoot() {
  if (!fs.existsSync(UPLOADS_FS)) fs.mkdirSync(UPLOADS_FS, { recursive: true });
}
function safeJoinUploads(rel: string) {
  const clean = rel.replace(/^\/+/, '').replace(/^uploads\/?/, '');
  return path.join(UPLOADS_FS, clean);
}

type FileNode = { name: string; path: string; type: 'file' | 'directory' | 'folder'; children?: FileNode[]; size?: number };

function buildTree(rel: string = ''): FileNode[] {
  ensureUploadsRoot();
  const abs = safeJoinUploads(rel);
  if (!fs.existsSync(abs)) return [];
  const entries = fs.readdirSync(abs, { withFileTypes: true });
  const out: FileNode[] = [];
  for (const ent of entries) {
    const name = ent.name;
    const relPath = (rel ? `${rel}/` : '') + name;
    const absPath = path.join(abs, name);
    if (ent.isDirectory()) {
      out.push({ name, path: `uploads/${relPath}`, type: 'directory', children: buildTree(relPath) });
    } else {
      const stat = fs.statSync(absPath);
      out.push({ name, path: `uploads/${relPath}`, type: 'file', size: stat.size });
    }
  }
  // Sort dirs first
  out.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'directory' ? -1 : 1));
  return out;
}

export async function POST(req: NextRequest) {
  const isAdmin = await checkAdminPermission(req);
  if (!isAdmin) {
    return NextResponse.json({ success: false, error: 'Keine Berechtigung für diese Operation' }, { status: 403 });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  const useExternal = (process.env.USE_EXTERNAL || 'false').toLowerCase() === 'true';

  try {
    // Unterstützung für zwei Stile: action=... (FormData/URL-encoded) und JSON body {operation: 'list'}
    if (action) {
      // Action-basierte Aufrufe
      if (useExternal) {
        // Forward to external FILE_OPERATIONS_API
        const apiUrl = (process.env.FILE_OPERATIONS_API || '').trim();
        if (!apiUrl) return NextResponse.json({ success: false, error: 'FILE_OPERATIONS_API not configured' }, { status: 500 });

        // Build a request to external
        const method = req.method;
        let headers: Record<string, string> = {
          'Authorization': `Bearer ${process.env.FILE_OPERATIONS_TOKEN || ''}`,
          'X-API-TOKEN': process.env.FILE_OPERATIONS_TOKEN || '',
        };

        let body: BodyInit | undefined = undefined;
        const ct = req.headers.get('content-type') || '';
        if (ct.includes('application/x-www-form-urlencoded')) {
          const raw = await req.text();
          headers['Content-Type'] = 'application/x-www-form-urlencoded';
          body = raw;
        } else if (ct.includes('application/json')) {
          const raw = await req.text();
          headers['Content-Type'] = 'application/json';
          body = raw;
        } else if (action === 'upload') {
          // For upload, forward formdata
          const form = await req.formData();
          const f = form.get('file') as File | null;
          const pathVal = String(form.get('path') || '');
          const fd = new FormData();
          if (f) fd.append('file', f);
          fd.append('path', pathVal);
          body = fd as any;
        }

        const forwardUrl = `${apiUrl}?action=${encodeURIComponent(action)}`;
        const resp = await fetch(forwardUrl, { method, headers, body } as any);
        const text = await resp.text();
        try {
          const json = JSON.parse(text);
          return NextResponse.json(json, { status: resp.status });
        } catch {
          // Non-JSON response
          return NextResponse.json({ success: resp.ok, raw: text }, { status: resp.status });
        }
      }

      if (action === 'list') {
        const root = url.searchParams.get('path') || 'uploads';
        const rel = root.replace(/^uploads\/?/, '');
        const tree = buildTree(rel);
        return NextResponse.json({ success: true, folders: tree });
      }

      if (action === 'create_folder') {
        const contentType = req.headers.get('content-type') || '';
        let targetPath = '';
        if (contentType.includes('application/x-www-form-urlencoded')) {
          const bodyText = await req.text();
          const params = new URLSearchParams(bodyText);
          targetPath = params.get('path') || '';
        } else if (contentType.includes('application/json')) {
          const body = await req.json();
          targetPath = body?.path || '';
        }
        if (!targetPath) return NextResponse.json({ success: false, error: 'path fehlt' }, { status: 400 });
        const abs = safeJoinUploads(targetPath);
        fs.mkdirSync(abs, { recursive: true });
        return NextResponse.json({ success: true });
      }

      if (action === 'rename_file' || action === 'rename_folder') {
        const bodyText = await req.text();
        const params = new URLSearchParams(bodyText);
        const oldPath = params.get('old') || '';
        const newPath = params.get('new') || '';
        if (!oldPath || !newPath) return NextResponse.json({ success: false, error: 'old/new fehlen' }, { status: 400 });
        const absOld = safeJoinUploads(oldPath);
        const absNew = safeJoinUploads(newPath);
        fs.mkdirSync(path.dirname(absNew), { recursive: true });
        fs.renameSync(absOld, absNew);
        return NextResponse.json({ success: true });
      }

      if (action === 'move_file' || action === 'move_folder') {
        const bodyText = await req.text();
        const params = new URLSearchParams(bodyText);
        const src = params.get('source') || '';
        const tgt = params.get('target') || '';
        if (!src || !tgt) return NextResponse.json({ success: false, error: 'source/target fehlen' }, { status: 400 });
        const absSrc = safeJoinUploads(src);
        const absTgt = safeJoinUploads(tgt);
        fs.mkdirSync(path.dirname(absTgt), { recursive: true });
        fs.renameSync(absSrc, absTgt);
        return NextResponse.json({ success: true });
      }

      if (action === 'delete_by_path' || action === 'delete_folder') {
        const bodyText = await req.text();
        const params = new URLSearchParams(bodyText);
        const p = params.get('path') || '';
        if (!p) return NextResponse.json({ success: false, error: 'path fehlt' }, { status: 400 });
        const abs = safeJoinUploads(p);
        if (!fs.existsSync(abs)) return NextResponse.json({ success: false, error: 'Pfad existiert nicht' }, { status: 404 });
        const stat = fs.statSync(abs);
        if (stat.isDirectory()) {
          fs.rmSync(abs, { recursive: true, force: true });
        } else {
          fs.unlinkSync(abs);
        }
        return NextResponse.json({ success: true });
      }

      if (action === 'upload') {
        const form = await req.formData();
        const file = form.get('file') as File | null;
        let relPath = String(form.get('path') || '/');
        if (!file) return NextResponse.json({ success: false, error: 'file fehlt' }, { status: 400 });
        relPath = relPath.replace(/^\/+/, '').replace(/^uploads\/?/, '');
        const targetDir = path.join(UPLOADS_FS, relPath);
        fs.mkdirSync(targetDir, { recursive: true });
        const origName = (file as any).name || 'upload.bin';
        const target = path.join(targetDir, origName);
        const buf = Buffer.from(await file.arrayBuffer());
        fs.writeFileSync(target, buf);
        return NextResponse.json({ success: true });
      }

      return NextResponse.json({ success: false, error: `Unbekannte action: ${action}` }, { status: 400 });
    }

    // JSON-basierte Aufrufe
    let payload: any = {};
    try { payload = await req.json(); } catch {}
    const { operation, source } = payload || {};

    if (useExternal) {
      const apiUrl = (process.env.FILE_OPERATIONS_API || '').trim();
      if (!apiUrl) return NextResponse.json({ success: false, error: 'FILE_OPERATIONS_API not configured' }, { status: 500 });
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${process.env.FILE_OPERATIONS_TOKEN || ''}`,
        'X-API-TOKEN': process.env.FILE_OPERATIONS_TOKEN || '',
        'Content-Type': 'application/x-www-form-urlencoded',
      };

      if (operation === 'list') {
        const root = (source as string) || 'uploads';
        const forwardUrl = `${apiUrl}?action=list`;
        const params = new URLSearchParams();
        params.set('path', root);
        const resp = await fetch(forwardUrl, { method: 'POST', headers, body: params.toString() });
        const text = await resp.text();
        try { return NextResponse.json(JSON.parse(text), { status: resp.status }); } catch { return NextResponse.json({ success: resp.ok, raw: text }, { status: resp.status }); }
      }

      if (operation === 'deleteGallery') {
        const galleryName = payload.galleryName as string;
        if (!galleryName) return NextResponse.json({ success: false, error: 'galleryName fehlt' }, { status: 400 });
        const forwardUrl = `${apiUrl}?action=delete_folder`;
        const params = new URLSearchParams();
        params.set('path', `uploads/${galleryName}`);
        const resp = await fetch(forwardUrl, { method: 'POST', headers, body: params.toString() });
        const text = await resp.text();
        try { return NextResponse.json(JSON.parse(text), { status: resp.status }); } catch { return NextResponse.json({ success: resp.ok, raw: text }, { status: resp.status }); }
      }

      if (operation === 'renameGallery') {
        const galleryName = payload.galleryName as string;
        const newName = payload.newName as string;
        if (!galleryName || !newName) return NextResponse.json({ success: false, error: 'galleryName/newName fehlen' }, { status: 400 });
        const forwardUrl = `${apiUrl}?action=rename_folder`;
        const params = new URLSearchParams();
        params.set('old', `uploads/${galleryName}`);
        params.set('new', `uploads/${newName}`);
        const resp = await fetch(forwardUrl, { method: 'POST', headers, body: params.toString() });
        const text = await resp.text();
        try { return NextResponse.json(JSON.parse(text), { status: resp.status }); } catch { return NextResponse.json({ success: resp.ok, raw: text }, { status: resp.status }); }
      }

      if (operation === 'updateMetadata') {
        const galleryName = payload.galleryName as string;
        const metadata = payload.metadata as any;
        if (!galleryName || !metadata) return NextResponse.json({ success: false, error: 'galleryName/metadata fehlen' }, { status: 400 });
        // Schreibe meta.json im Galerieordner
        const forwardUrl = `${apiUrl}?action=write_file`;
        const pathForMeta = `uploads/${galleryName}/meta.json`;
        const params = new URLSearchParams();
        params.set('path', pathForMeta);
        params.set('content', JSON.stringify(metadata, null, 2));
        const resp = await fetch(forwardUrl, { method: 'POST', headers, body: params.toString() });
        const text = await resp.text();
        try { return NextResponse.json(JSON.parse(text), { status: resp.status }); } catch { return NextResponse.json({ success: resp.ok, raw: text }, { status: resp.status }); }
      }

      return NextResponse.json({ success: false, error: `Unbekannte Operation (extern): ${operation}` }, { status: 400 });
    }

    if (operation === 'list') {
      const root = (source as string) || 'uploads';
      const rel = root.replace(/^uploads\/?/, '');
      const tree = buildTree(rel);
      return NextResponse.json({ success: true, folders: tree });
    }
    return NextResponse.json({ success: false, error: `Unbekannte Operation: ${operation}` }, { status: 400 });
  } catch (error) {
    console.error('Fehler bei Dateioperation:', error);
    return NextResponse.json({ success: false, error: `Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}` }, { status: 500 });
  }
}

// Optional: GET kann einfache List-Infos liefern
export async function GET(req: NextRequest) {
  const isAdmin = await checkAdminPermission(req);
  if (!isAdmin) {
    return NextResponse.json({ success: false, error: 'Keine Berechtigung' }, { status: 403 });
  }
  const root = req.nextUrl.searchParams.get('path') || 'uploads';
  const useExternal = (process.env.USE_EXTERNAL || 'false').toLowerCase() === 'true';
  if (useExternal) {
    const apiUrl = (process.env.FILE_OPERATIONS_API || '').trim();
    if (!apiUrl) return NextResponse.json({ success: false, error: 'FILE_OPERATIONS_API not configured' }, { status: 500 });
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${process.env.FILE_OPERATIONS_TOKEN || ''}`,
      'X-API-TOKEN': process.env.FILE_OPERATIONS_TOKEN || '',
      'Content-Type': 'application/json',
    };
    const forwardUrl = `${apiUrl}?action=list`;
    const resp = await fetch(forwardUrl, { method: 'POST', headers, body: JSON.stringify({ path: root }) });
    const text = await resp.text();
    try { return NextResponse.json(JSON.parse(text), { status: resp.status }); } catch { return NextResponse.json({ success: resp.ok, raw: text }, { status: resp.status }); }
  }
  const rel = root.replace(/^uploads\/?/, '');
  const tree = buildTree(rel);
  return NextResponse.json({ success: true, folders: tree });
}
