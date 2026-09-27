import admin from 'firebase-admin';

export default async function handler(req, res) {
  // 1. Browser mein link kholne (GET request) par ab crash nahi hoga, ye message dikhega:
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      status: 'Active',
      message: 'Webhook bilkul sahi kaam kar raha hai! (Only POST requests allowed)' 
    });
  }

  try {
    // 2. Firebase Admin ko safely connect karna
    if (!admin.apps.length) {
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      } else {
        // Agar Vercel mein abhi Firebase key nahi daali hai to bhi Test Webhook fail nahi hoga
        return res.status(200).json({ 
          message: 'Webhook chal raha hai, par Vercel mein FIREBASE_SERVICE_ACCOUNT env variable add karna baaki hai.' 
        });
      }
    }

    const db = admin.firestore();

    // Gateway se aane wala data nikalna
    const body = req.body || {};
    const utr = body.utr || body.order_id || body.transactionId;
    const amount = Number(body.amount) || 0;
    const status = body.status || body.payment_status;
    const customerId = body.customerId || body.customer_id || body.udf1;

    // 3. Agar gateway se sirf Dummy/Test webhook aaya hai (jisme customerId na ho)
    if (!utr || !customerId) {
      return res.status(200).json({ 
        message: 'Test Webhook Received Successfully!',
        receivedData: body 
      });
    }

    if (status !== 'SUCCESS' && status !== 'COMPLETED' && status !== 'success') {
      return res.status(200).json({ message: 'Payment not successful' });
    }

    const paymentRef = db.collection('payments').doc(String(utr));
    const paymentDoc = await paymentRef.get();

    if (paymentDoc.exists) {
      return res.status(200).json({ message: 'Transaction already processed' });
    }

    // Payments collection mein entry save karna
    await paymentRef.set({
      utr: String(utr),
      amount: amount,
      customerId: String(customerId),
      status: 'SUCCESS',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // User ke credits badhana
    const userRef = db.collection('users').doc(String(customerId));
    await userRef.update({
      credits: admin.firestore.FieldValue.increment(amount)
    });

    return res.status(200).json({ message: 'Credits updated successfully' });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}
