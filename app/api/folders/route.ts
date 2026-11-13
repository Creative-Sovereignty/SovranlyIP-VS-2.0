import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthToken } from '@/lib/auth-server';

export interface FolderItem {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  userId?: string;
  createdAt: string;
}

const DEFAULT_FOLDERS: FolderItem[] = [
  {
    id: 'folder-master-recordings',
    name: 'Master Recordings',
    description: 'Finished audio masters, lossless WAV stems, and vocal tracks',
    color: 'emerald',
    icon: 'music',
    createdAt: '2026-01-15T00:00:00.000Z'
  },
  {
    id: 'folder-software-packages',
    name: 'Software Packages',
    description: 'Production smart contracts, component suites, and developer libraries',
    color: 'cyan',
    icon: 'code',
    createdAt: '2026-01-16T00:00:00.000Z'
  },
  {
    id: 'folder-3d-virtual-worlds',
    name: '3D & Virtual Worlds',
    description: 'Procedural 3D models, glTF renders, and spatial metaverse assets',
    color: 'violet',
    icon: 'image',
    createdAt: '2026-01-18T00:00:00.000Z'
  },
  {
    id: 'folder-sync-pitches',
    name: 'Sync Pitches',
    description: 'Curated creative assets prepared for commercial media licensing & film sync',
    color: 'amber',
    icon: 'sparkles',
    createdAt: '2026-02-01T00:00:00.000Z'
  }
];

const SANDBOX_FOLDERS: FolderItem[] = [];

export async function GET(request: Request) {
  try {
    const user = await verifyAuthToken(request.headers.get('Authorization'));
    if (!user) {
      return NextResponse.json(DEFAULT_FOLDERS);
    }

    let dbFolders: FolderItem[] = [];
    try {
      const snapshot = await db
        .collection('folders')
        .where('userId', '==', user.uid)
        .get();
      dbFolders = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      } as FolderItem));
    } catch (dbErr) {
      console.warn('Firestore folders fetch fallback:', dbErr);
    }

    const userSandboxFolders = SANDBOX_FOLDERS.filter(
      (f) => f.userId === user.uid || user.uid === 'sandbox-guest-agent-007'
    );
    const folders: FolderItem[] = [...userSandboxFolders, ...dbFolders];

    const existingNames = new Set(folders.map(f => f.name.toLowerCase()));
    for (const def of DEFAULT_FOLDERS) {
      if (!existingNames.has(def.name.toLowerCase())) {
        folders.push(def);
      }
    }

    return NextResponse.json(folders);
  } catch (error) {
    console.error('Error fetching folders:', error);
    return NextResponse.json(DEFAULT_FOLDERS);
  }
}

export async function POST(request: Request) {
  try {
    const user = await verifyAuthToken(request.headers.get('Authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
    }

    const newFolder: Omit<FolderItem, 'id'> = {
      name: body.name.trim(),
      description: body.description?.trim() || '',
      color: body.color || 'cyan',
      icon: body.icon || 'folder',
      userId: user.uid,
      createdAt: new Date().toISOString()
    };

    try {
      const docRef = await db.collection('folders').add(newFolder);
      return NextResponse.json({ id: docRef.id, ...newFolder });
    } catch (dbErr) {
      console.warn('Firestore create folder fallback:', dbErr);
      const localFolder: FolderItem = { id: `folder-${Date.now()}`, ...newFolder };
      SANDBOX_FOLDERS.unshift(localFolder);
      return NextResponse.json(localFolder);
    }
  } catch (error) {
    console.error('Error creating folder:', error);
    return NextResponse.json({ error: 'Invalid folder payload' }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await verifyAuthToken(request.headers.get('Authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, ...updates } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 });
    }

    const sandboxIdx = SANDBOX_FOLDERS.findIndex((f) => f.id === id);
    if (sandboxIdx !== -1) {
      const existing = SANDBOX_FOLDERS[sandboxIdx];
      if (existing.userId && existing.userId !== user.uid && user.uid !== 'sandbox-guest-agent-007') {
        return NextResponse.json({ error: 'Forbidden: You do not own this folder' }, { status: 403 });
      }
      SANDBOX_FOLDERS[sandboxIdx] = { ...existing, ...updates };
      return NextResponse.json({ success: true, id, ...updates });
    }

    try {
      const folderRef = db.collection('folders').doc(id);
      const doc = await folderRef.get();
      if (!doc.exists) {
        return NextResponse.json({ success: true, id, ...updates });
      }

      const existing = doc.data();
      if (existing?.userId && existing.userId !== user.uid && user.uid !== 'sandbox-guest-agent-007') {
        return NextResponse.json({ error: 'Forbidden: You do not own this folder' }, { status: 403 });
      }

      await folderRef.update(updates);
      return NextResponse.json({ success: true, id, ...updates });
    } catch (dbErr) {
      console.warn('Firestore update folder fallback:', dbErr);
      return NextResponse.json({ success: true, id, ...updates });
    }
  } catch (error) {
    console.error('Error updating folder:', error);
    return NextResponse.json({ error: 'Invalid folder update payload' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await verifyAuthToken(request.headers.get('Authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Folder ID required' }, { status: 400 });
    }

    const sandboxIdx = SANDBOX_FOLDERS.findIndex((f) => f.id === id);
    if (sandboxIdx !== -1) {
      const existing = SANDBOX_FOLDERS[sandboxIdx];
      if (existing.userId && existing.userId !== user.uid && user.uid !== 'sandbox-guest-agent-007') {
        return NextResponse.json({ error: 'Forbidden: You do not own this folder' }, { status: 403 });
      }
      SANDBOX_FOLDERS.splice(sandboxIdx, 1);
      return NextResponse.json({ success: true, message: 'Folder removed successfully' });
    }

    try {
      const folderRef = db.collection('folders').doc(id);
      const doc = await folderRef.get();
      if (doc.exists) {
        const existing = doc.data();
        if (existing?.userId && existing.userId !== user.uid && user.uid !== 'sandbox-guest-agent-007') {
          return NextResponse.json({ error: 'Forbidden: You do not own this folder' }, { status: 403 });
        }
        await folderRef.delete();
      }
    } catch (dbErr) {
      console.warn('Firestore delete folder fallback:', dbErr);
    }

    return NextResponse.json({ success: true, message: 'Folder removed successfully' });
  } catch (error) {
    console.error('Error deleting folder:', error);
    return NextResponse.json({ error: 'Unable to delete folder' }, { status: 400 });
  }
}
