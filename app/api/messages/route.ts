import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthToken } from '@/lib/auth-server';

const SANDBOX_INQUIRIES: any[] = [];

export async function GET(request: Request) {
  try {
    const user = await verifyAuthToken(request.headers.get('Authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const recipientAddress = searchParams.get('recipientAddress');

    let inquiriesData: any[] = [];
    try {
      const queryRef = db.collection('inquiries');
      let snapshot;
      if (recipientAddress) {
        snapshot = await queryRef.where('recipientAddress', '==', recipientAddress).get();
        if (snapshot.empty) {
          snapshot = await queryRef.where('recipientAddress', '==', recipientAddress.toLowerCase()).get();
        }
      } else {
        snapshot = await queryRef.get();
      }
      inquiriesData = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    } catch (dbErr) {
      console.warn('Firestore inquiries fetch fallback:', dbErr);
      inquiriesData = recipientAddress
        ? SANDBOX_INQUIRIES.filter(
            (inq) => inq.recipientAddress?.toLowerCase() === recipientAddress.toLowerCase()
          )
        : [...SANDBOX_INQUIRIES];
    }

    inquiriesData.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(inquiriesData);
  } catch (error) {
    console.error('Error fetching inquiries:', error);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { assetId, assetTitle, senderName, senderContact, subject, message, recipientAddress } = body;

    if (!assetId || !assetTitle || !senderName || !senderContact || !subject || !message || !recipientAddress) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const enrichedBody = {
      assetId,
      assetTitle,
      senderName,
      senderContact,
      subject,
      message,
      recipientAddress,
      createdAt: new Date().toISOString(),
    };

    try {
      const docRef = await db.collection('inquiries').add(enrichedBody);
      return NextResponse.json({ id: docRef.id, ...enrichedBody });
    } catch (dbErr) {
      console.warn('Firestore inquiry create fallback:', dbErr);
      const localRecord = { id: `inq-${Date.now()}`, ...enrichedBody };
      SANDBOX_INQUIRIES.unshift(localRecord);
      return NextResponse.json(localRecord);
    }
  } catch (error) {
    console.error('Error creating inquiry:', error);
    return NextResponse.json({ error: 'Invalid inquiry payload' }, { status: 400 });
  }
}
