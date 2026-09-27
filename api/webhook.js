import admin from 'firebase-admin';
import crypto from 'crypto';

if (!admin.apps.length && process.env.FIREBASE_SERVICE_ACCOUNT) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const body = req.body || {};
    const eventData = body.data || body.result || body;

    const orderId = eventData.client_txn_id || eventData.orderId || eventData.order_id || body.client_txn_id || body.order_id;
    const utr = eventData.utr || eventData.bank_ref_num || eventData.upi_txn_id || body.utr || orderId;
    const rawStatus = String(eventData.status || eventData.txnStatus || body.status || body.event || '').toUpperCase();
    const paidAmount = Number(eventData.amount || body.amount || 0);

    // 1. Agar VyaparGateway se "Test Webhook" button dabaya gaya hai
    if (!orderId || rawStatus.includes('TEST') || (!rawStatus.includes('SUCCESS') && !rawStatus.includes('COMPLETED') && !rawStatus.includes('PAID'))) {
      return res.status(200).json({ message: 'Webhook received / Test OK' });
    }

    if (!admin.apps.length) {
      return res.status(500).json({ message: 'FIREBASE_SERVICE_ACCOUNT is missing in Vercel' });
    }

    const db = admin.firestore();
    const paymentRef = db.collection('payments').doc(String(orderId));
    const paymentSnap = await paymentRef.get();

    if (!paymentSnap.exists) {
      return res.status(200).json({ message: 'Order not found in payments collection' });
    }

    const paymentData = paymentSnap.data();

    // 2. Duplicate check: Agar pehle hi approve ho chuka hai to dobara credit na jude
    if (paymentData.status === 'Auto-Approved' || paymentData.status === 'Approved') {
      return res.status(200).json({ message: 'Transaction already processed' });
    }

    const userId = paymentData.userId;
    const creditsToAdd = Number(paymentData.creditsRequested) || 0;
    const wantsVip = Boolean(paymentData.wantsVip);
    const vipDays = Number(paymentData.vipDaysRequested) || 0;

    // 3. User ke Credits aur VIP Validity update karein
    const userRef = db.collection('users').doc(String(userId));
    const userSnap = await userRef.get();

    if (userSnap.exists) {
      const uData = userSnap.data();
      const currentCredits = Number(uData.credits) || 0;
      const now = Date.now();
      const currentExpiry = (uData.isVip && uData.vipExpiry && uData.vipExpiry > now) ? Number(uData.vipExpiry) : now;

      const updateFields = {
        credits: currentCredits + creditsToAdd
      };

      if (wantsVip && vipDays > 0) {
        updateFields.isVip = true;
        updateFields.vipExpiry = currentExpiry + (vipDays * MS_PER_DAY);
      }

      await userRef.update(updateFields);
    }

    // 4. Payment status ko 'Auto-Approved' karein aur UTR save karein
    await paymentRef.update({
      status: 'Auto-Approved',
      utrNumber: String(utr),
      approvedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 5. Duplicate UTR lock karein
    if (utr) {
      await db.collection('usedUtrs').doc(String(utr)).set({
        userId: userId,
        orderId: orderId,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // 6. Admin ko Telegram par Auto-Approved Alert bhejein
    const botToken = "8586078140:AAG-ydpakzFDAwHFtJC8AUanxZAODpGZDOk";
    const chatId = "8942287807";
    const vipLine = wantsVip ? `\n👑 *VIP Activated:* +${vipDays} Days` : '';
    const tgMessage = `✅ *Auto-Payment Verified!*\n*User:* ${paymentData.email}\n*Amount Paid:* ₹${paymentData.amountPaid || paidAmount}\n*Credits Added:* +${creditsToAdd} Cr${vipLine}\n*UTR:* \`${utr}\`\n*Order ID:* \`${orderId}\`\n\n*Status:* Auto-Approved via Webhook ⚡`;

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: tgMessage, parse_mode: 'Markdown' })
    }).catch(() => {});

    return res.status(200).json({ message: 'Credits & VIP updated automatically!' });

  } catch (error) {
    console.error('Webhook Error:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}
