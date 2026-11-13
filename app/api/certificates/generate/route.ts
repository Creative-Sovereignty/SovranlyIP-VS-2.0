import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import { db } from '@/lib/firebase-admin';
import { verifyAuthToken } from '@/lib/auth-server';
import QRCode from 'qrcode';

const DEFAULT_CERTIFICATE_ASSETS: Record<string, { title: string; ownerAddress: string; type: string }> = {
  'svip-market-001': {
    title: 'Sovereign Modular Synth Loop Pack Vol. 1',
    ownerAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    type: 'Music / Audio',
  },
  'svip-market-002': {
    title: 'Cybernetic Aegis UI Component Suite',
    ownerAddress: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
    type: 'Software / Utility',
  },
  'svip-market-003': {
    title: 'Ethereal Cyber Cityscape 3D Concept Model',
    ownerAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    type: 'Artwork / Visual Art',
  },
  'svip-market-004': {
    title: 'Zero-Trust Chainlink Oracle Telemetry Feed',
    ownerAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    type: 'Software / Utility',
  },
};

export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuthToken(req.headers.get('Authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { assetId, theme, title, ownerAddress, type } = body;
    if (!assetId) return NextResponse.json({ error: 'Asset ID required' }, { status: 400 });

    let assetData: Record<string, any> | null = null;

    try {
      const assetRef = db.collection('assets').doc(assetId);
      const assetSnap = await assetRef.get();
      if (assetSnap.exists) {
        assetData = assetSnap.data() || {};
      }
    } catch (dbErr) {
      console.warn('Firestore asset lookup fallback in certificate generator:', dbErr);
    }

    if (!assetData) {
      const fallbackAsset = DEFAULT_CERTIFICATE_ASSETS[assetId];
      if (fallbackAsset) {
        assetData = fallbackAsset;
      } else if (title) {
        assetData = {
          title,
          ownerAddress: ownerAddress || user.uid,
          type: type || 'Creative Intellectual Property',
        };
      }
    }

    if (!assetData) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    const docPdf = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    docPdf.on('data', (chunk) => chunks.push(chunk));

    // Theme setup
    const isClassic = theme === 'Classic Editorial';
    docPdf.font(isClassic ? 'Times-Roman' : 'Helvetica');

    // Watermark
    docPdf.save();
    docPdf.rotate(45, { origin: [300, 400] });
    docPdf.fontSize(100).fillColor('#f0f0f0').text('SOVRANLY', 50, 400, { align: 'center' });
    docPdf.restore();
    docPdf.fillColor('black');

    docPdf.fontSize(25).text('Sovereign IP Proof Certificate', { align: 'center' });
    docPdf.moveDown();
    docPdf.fontSize(12).text(`Asset ID: ${assetId}`, { align: 'center' });
    docPdf.text(`Title: ${assetData.title || 'Sovereign IP Asset'}`, { align: 'center' });
    docPdf.text(`Owner: ${assetData.ownerAddress || 'Unknown'}`, { align: 'center' });
    docPdf.text(`Type: ${assetData.type || 'Digital Intellectual Property'}`, { align: 'center' });
    docPdf.moveDown();

    // QR Code linking to Sovereign Command Center
    const verifyBaseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.sovranlyip.com').replace(/\/$/, '');
    const qrCodeUrl = await QRCode.toDataURL(`${verifyBaseUrl}/dashboard?asset=${encodeURIComponent(assetId)}`);
    docPdf.image(Buffer.from(qrCodeUrl.split(',')[1], 'base64'), { fit: [100, 100], align: 'center' });
    docPdf.moveDown();

    // Legal Disclaimer
    docPdf.fontSize(8).fillColor('gray');
    const disclaimer = 'Legal Disclaimer: This certificate is provided for informational purposes as a record of IP registration on the Sovranly IP ledger. It does not constitute legal proof of ownership or intellectual property rights. Sovranly IP assumes no liability for the accuracy or completeness of the registered data. Users should seek independent legal counsel regarding IP protection.';
    docPdf.text(disclaimer, 50, 750, { align: 'center', width: 500 });

    docPdf.end();

    return new Promise<NextResponse>((resolve) => {
      docPdf.on('end', () => {
        const result = Buffer.concat(chunks);
        resolve(new NextResponse(result, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="certificate_${assetId}.pdf"`,
          },
        }));
      });
    });
  } catch (error) {
    console.error('PDF Generation Error:', error);
    return NextResponse.json({ error: 'Unable to generate certificate PDF' }, { status: 400 });
  }
}
