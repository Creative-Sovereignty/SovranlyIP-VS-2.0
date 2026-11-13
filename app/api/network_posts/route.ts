import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthToken } from '@/lib/auth-server';

const SANDBOX_POSTS: any[] = [
  {
    id: 'post-svip-001',
    content: 'Just sealed the Modular Synth Loop Pack Vol. 1 with SHA-256 provenance and 85/15 automated royalty splits. Zero middlemen, instant YouTube micro-permissions active.',
    authorName: 'Duane & Sovranly Labs',
    authorAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    postType: 'milestone',
    likes: 14,
    createdAt: '2026-03-10T15:00:00.000Z',
  },
  {
    id: 'post-svip-002',
    content: 'Enabled BIPA & GDPR Art. 9 biometric identity anchoring on my vocal masters. AI training scrapers are explicitly excluded at the smart contract layer.',
    authorName: 'Elena Rostova',
    authorAddress: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
    postType: 'security',
    likes: 9,
    createdAt: '2026-03-11T09:20:00.000Z',
  },
];

export async function GET(request: Request) {
  try {
    const user = await verifyAuthToken(request.headers.get('Authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const snapshot = await db.collection('network_posts')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();

      const posts = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      if (posts.length > 0) {
        return NextResponse.json(posts);
      }
    } catch (dbErr) {
      console.warn('Firestore network_posts fetch fallback:', dbErr);
    }

    return NextResponse.json(SANDBOX_POSTS);
  } catch (error) {
    console.error('Error fetching network posts:', error);
    return NextResponse.json(SANDBOX_POSTS);
  }
}

export async function POST(request: Request) {
  try {
    const user = await verifyAuthToken(request.headers.get('Authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content, authorName, authorAddress, postType } = body;

    if (!content || !authorName) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const newPost = {
      content,
      authorName,
      authorAddress: authorAddress || 'Unknown',
      postType: postType || 'general',
      likes: 0,
      creator: user.uid,
      createdAt: new Date().toISOString(),
    };

    try {
      const docRef = await db.collection('network_posts').add(newPost);
      return NextResponse.json({ id: docRef.id, ...newPost });
    } catch (dbErr) {
      console.warn('Firestore create post fallback:', dbErr);
      const localPost = { id: `post-${Date.now()}`, ...newPost };
      SANDBOX_POSTS.unshift(localPost);
      return NextResponse.json(localPost);
    }
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json({ error: 'Invalid network post payload' }, { status: 400 });
  }
}
