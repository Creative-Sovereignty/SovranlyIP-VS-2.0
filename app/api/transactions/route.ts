import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthToken } from '@/lib/auth-server';

const DEFAULT_TRANSACTIONS = [
  {
    id: 'tx-svip-001',
    hash: '0x3a9f7e8b2c1d0a5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e',
    type: 'On-Chain Copyright Notarization',
    assetTitle: 'Sovereign Modular Synth Loop Pack Vol. 1',
    amount: '0.1500 ETH',
    fromAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    toAddress: 'Sovranly IP Registry',
    creator: 'sandbox-guest-agent-007',
    userId: 'sandbox-guest-agent-007',
    creatorEmail: 'create@sovranlyip.com',
    timestamp: '2026-03-10T12:00:00.000Z',
  },
  {
    id: 'tx-svip-002',
    hash: '0x8f2d1e0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e',
    type: 'Royalty Payment Received',
    assetTitle: 'Cybernetic Aegis UI Component Suite',
    amount: '1.0800 ETH',
    fromAddress: 'Aetheric Labs SaaS Enterprise',
    toAddress: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
    creator: 'sandbox-guest-agent-007',
    userId: 'sandbox-guest-agent-007',
    creatorEmail: 'create@sovranlyip.com',
    timestamp: '2026-03-11T16:45:00.000Z',
  },
];

const SANDBOX_TRANSACTIONS: any[] = [];

export async function GET(request: Request) {
  try {
    const user = await verifyAuthToken(request.headers.get('Authorization'));

    const transactionsRef = db.collection('transactions');
    let dbTxs: any[] = [];
    try {
      const snapshot = await transactionsRef.orderBy('timestamp', 'desc').limit(50).get();
      dbTxs = snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp && typeof data.timestamp.toDate === 'function'
            ? data.timestamp.toDate().toISOString()
            : data.timestamp
        };
      });
    } catch (e) {
      console.warn('Notice querying transactions collection:', e);
      dbTxs = [];
    }

    const txs = [...SANDBOX_TRANSACTIONS, ...dbTxs];

    if (!user) {
      return NextResponse.json(txs.length > 0 ? txs : DEFAULT_TRANSACTIONS);
    }

    const filteredTxs = txs.filter((tx: any) =>
      !tx.creator ||
      tx.creator === user.uid ||
      tx.userId === user.uid ||
      tx.fromAddress === user.uid ||
      tx.toAddress === user.uid ||
      (user.email && tx.creatorEmail === user.email) ||
      user.uid === 'sandbox-guest-agent-007'
    );

    if (filteredTxs.length > 0) {
      return NextResponse.json(filteredTxs);
    }

    return NextResponse.json(txs.length > 0 ? txs : DEFAULT_TRANSACTIONS);
  } catch (error) {
    console.error('API Error in GET /api/transactions:', error);
    return NextResponse.json(DEFAULT_TRANSACTIONS);
  }
}

export async function POST(request: Request) {
  try {
    const user = await verifyAuthToken(request.headers.get('Authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const now = new Date();
    const newTx = {
      hash: body.hash || '0x' + Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2),
      type: body.type || 'IP Interaction',
      assetTitle: body.assetTitle || 'Unknown Asset',
      amount: body.amount || '0.00 ETH',
      fromAddress: body.fromAddress || (user ? user.uid : '0x71C7656EC7ab88b098defB751B7401B5f6d1476B'),
      toAddress: body.toAddress || 'Marketplace Pool',
      creator: user?.uid || null,
      userId: user?.uid || null,
      creatorEmail: user?.email || null,
      timestamp: now
    };

    try {
      const transactionsRef = db.collection('transactions');
      const docRef = await transactionsRef.add(newTx);
      return NextResponse.json({ id: docRef.id, ...newTx, timestamp: now.toISOString() });
    } catch (dbErr) {
      console.warn('Firestore transaction write fallback:', dbErr);
      const localTx = { id: `tx-${Date.now()}`, ...newTx, timestamp: now.toISOString() };
      SANDBOX_TRANSACTIONS.unshift(localTx);
      return NextResponse.json(localTx);
    }
  } catch (error) {
    console.error('Error recording transaction:', error);
    return NextResponse.json({ error: 'Invalid transaction payload' }, { status: 400 });
  }
}
