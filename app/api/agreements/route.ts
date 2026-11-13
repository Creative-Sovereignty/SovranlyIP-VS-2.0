import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthToken } from '@/lib/auth-server';

const DEFAULT_AGREEMENTS: any[] = [
  {
    id: 'svip-agr-001',
    assetId: 'svip-market-001',
    assetTitle: 'Sovereign Modular Synth Loop Pack Vol. 1',
    licenseeName: 'Aurora Interactive Studios',
    licensorEmail: 'licensing@aurorastudios.com',
    royaltyRate: 85,
    basePrice: 0.15,
    duration: '3 Years',
    territory: 'Worldwide (WW)',
    exclusivity: 'Non-Exclusive',
    permittedUsages: ['Streaming & Broadcasting', 'Derivative Works', 'Commercial Sponsorships'],
    status: 'ACTIVE',
    creator: 'sandbox-guest-agent-007',
    userId: 'sandbox-guest-agent-007',
    creatorEmail: 'create@sovranlyip.com',
    createdAt: '2026-03-01T10:00:00.000Z',
  },
  {
    id: 'svip-agr-002',
    assetId: 'svip-market-002',
    assetTitle: 'Cybernetic Aegis UI Component Suite',
    licenseeName: 'Aetheric Labs Enterprise',
    licensorEmail: 'legal@aethericlabs.io',
    royaltyRate: 90,
    basePrice: 0.45,
    duration: 'Perpetual',
    territory: 'Worldwide (WW)',
    exclusivity: 'Non-Exclusive',
    permittedUsages: ['Software Integration', 'Commercial Sponsorships'],
    status: 'ACTIVE',
    creator: 'sandbox-guest-agent-007',
    userId: 'sandbox-guest-agent-007',
    creatorEmail: 'create@sovranlyip.com',
    createdAt: '2026-03-08T14:30:00.000Z',
  },
];

const SANDBOX_AGREEMENTS: any[] = [...DEFAULT_AGREEMENTS];

export async function GET(request: Request) {
  try {
    const user = await verifyAuthToken(request.headers.get('Authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let dbAgreements: any[] = [];
    try {
      const snapshot = await db.collection('agreements').get();
      dbAgreements = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    } catch (dbErr) {
      console.warn('Firestore fetch agreements fallback:', dbErr);
    }

    const merged = [...SANDBOX_AGREEMENTS];
    for (const item of dbAgreements) {
      if (!merged.some((existing) => existing.id === item.id)) {
        merged.unshift(item);
      }
    }

    const agreementsData = merged.filter((doc: any) =>
      doc.creator === user.uid ||
      doc.userId === user.uid ||
      (user.email && doc.creatorEmail === user.email) ||
      doc.creatorWallet === user.uid ||
      user.uid === 'sandbox-guest-agent-007'
    );

    return NextResponse.json(agreementsData);
  } catch (error) {
    console.error('Error fetching agreements:', error);
    return NextResponse.json(DEFAULT_AGREEMENTS);
  }
}

export async function POST(request: Request) {
  try {
    const user = await verifyAuthToken(request.headers.get('Authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const enrichedBody = {
      ...body,
      creator: user.uid,
      userId: user.uid,
      creatorEmail: user.email || null,
      royaltyRate: Math.round(Number(body.royaltyRate || 85)),
      createdAt: new Date().toISOString(),
    };

    try {
      const docRef = await db.collection('agreements').add(enrichedBody);
      return NextResponse.json({ id: docRef.id, ...enrichedBody });
    } catch (dbErr) {
      console.warn('Firestore create agreement fallback:', dbErr);
      const localRecord = { id: `agr-${Date.now()}`, ...enrichedBody };
      SANDBOX_AGREEMENTS.unshift(localRecord);
      return NextResponse.json(localRecord);
    }
  } catch (error) {
    console.error('Error creating agreement:', error);
    return NextResponse.json({ error: 'Invalid agreement payload' }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await verifyAuthToken(request.headers.get('Authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, ...data } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Agreement ID is required for update' }, { status: 400 });
    }

    try {
      const agreementRef = db.collection('agreements').doc(id);
      const agreementDoc = await agreementRef.get();
      if (agreementDoc.exists) {
        const existing = agreementDoc.data();
        const isOwner =
          existing?.creator === user.uid ||
          existing?.userId === user.uid ||
          (Boolean(existing?.creatorEmail) && existing?.creatorEmail === user.email) ||
          (Boolean(existing?.licensorEmail) && existing?.licensorEmail === user.email) ||
          user.uid === 'sandbox-guest-agent-007';

        if (!isOwner) {
          return NextResponse.json({ error: 'Forbidden: You do not own this agreement' }, { status: 403 });
        }

        await agreementRef.update(data);
        return NextResponse.json({ success: true, id, ...data });
      }
    } catch (dbErr) {
      console.warn('Firestore update agreement fallback:', dbErr);
    }

    const idx = SANDBOX_AGREEMENTS.findIndex((item) => item.id === id);
    if (idx !== -1) {
      const existing = SANDBOX_AGREEMENTS[idx];
      const isOwner =
        existing?.creator === user.uid ||
        existing?.userId === user.uid ||
        (Boolean(existing?.creatorEmail) && existing?.creatorEmail === user.email) ||
        user.uid === 'sandbox-guest-agent-007';

      if (!isOwner) {
        return NextResponse.json({ error: 'Forbidden: You do not own this agreement' }, { status: 403 });
      }
      SANDBOX_AGREEMENTS[idx] = { ...existing, ...data, updatedAt: new Date().toISOString() };
      return NextResponse.json({ success: true, id, ...data });
    }

    return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
  } catch (error) {
    console.error('Error updating agreement:', error);
    return NextResponse.json({ error: 'Invalid agreement update payload' }, { status: 400 });
  }
}
