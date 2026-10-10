import admin from 'firebase-admin';

if (!admin.apps.length && process.env.FIREBASE_SERVICE_ACCOUNT) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: false, message: 'Method Not Allowed' });
  }

  try {
    const {
      userId,
      email,
      username,
      totalPayable,
      creditsRequested,
      wantsVip,
      vipDaysRequested,
      vipPlanFee
    } = req.body;

    if (!userId || !totalPayable || Number(totalPayable) < 100) {
      return res.status(400).json({ status: false, message: 'Invalid payment amount or user' });
    }

    const orderId = `OJAS_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const productInfo = wantsVip ? `Ojas VIP ${vipDaysRequested}d + ${creditsRequested} Cr` : `Ojas ${creditsRequested} Credits`;

    // 1. Firebase 'payments' collection mein Pending order save karein
    if (admin.apps.length) {
      const db = admin.firestore();
      await db.collection('payments').doc(orderId).set({
        orderId: orderId,
        userId: userId,
        email: email || '',
        amountPaid: Number(totalPayable),
        creditsRequested: Number(creditsRequested) || 0,
        wantsVip: Boolean(wantsVip),
        vipDaysRequested: Number(vipDaysRequested) || 0,
        vipPlanFee: Number(vipPlanFee) || 0,
        utrNumber: 'AUTO_WAITING',
        status: 'Pending',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // 2. VyaparGateway API call karke payment link / QR mangwayein
    let gatewayData = {};
    if (process.env.VYAPARGATEWAY_API_KEY) {
      try {
        const vgRes = await fetch('https://vyapargateway.com/api/v1/create_order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': process.env.VYAPARGATEWAY_API_KEY
          },
          body: JSON.stringify({
            key: process.env.VYAPARGATEWAY_API_KEY,
            client_txn_id: orderId,
            amount: Number(totalPayable),
            p_info: productInfo,
            customer_name: username || 'Ojas User',
            customer_email: email || 'user@ovportal.com',
            customer_mobile: '9999999999',
            callback_url: 'https://ojasprints.vercel.app/api/webhook',
            redirect_url: 'https://ojasprints.vercel.app/portal.html'
          })
        });
        gatewayData = await vgRes.json();
      } catch (e) {
        console.error('Gateway API Error:', e);
      }
    }

    const resObj = gatewayData.data || gatewayData.result || gatewayData || {};
    return res.status(200).json({
      status: true,
      orderId: orderId,
      payment_url: resObj.payment_url || '',
      upi_string: resObj.upi_string || resObj.upi_intent || '',
      qr_code: resObj.qr_code || ''
    });

  } catch (error) {
    console.error('Create Order Error:', error);
    return res.status(500).json({ status: false, message: error.message });
  }
}
