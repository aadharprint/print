import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { utr, amount, status, customerId } = req.body;

  if (status !== 'SUCCESS') {
    return res.status(200).json({ message: 'Payment not successful' });
  }

  try {
    const paymentRef = db.collection('payments').doc(utr);
    const paymentDoc = await paymentRef.get();

    if (paymentDoc.exists) {
      return res.status(200).json({ message: 'Transaction already processed' });
    }

    await paymentRef.set({
      utr,
      amount,
      customerId,
      status: 'SUCCESS',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    const userRef = db.collection('users').doc(customerId);
    await userRef.update({
      credits: admin.firestore.FieldValue.increment(amount)
    });

    return res.status(200).json({ message: 'Credits updated successfully' });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
