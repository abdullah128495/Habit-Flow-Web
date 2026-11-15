import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Sadece POST istekleri kabul edilir' });
  }

  try {
    let encodedData, hash;

    // Gelen veriyi form-urlencoded veya JSON formatından güvenli bir şekilde oku
    if (req.body) {
      if (typeof req.body === 'string') {
        const params = new URLSearchParams(req.body);
        encodedData = params.get('res');
        hash = params.get('hash');
      } else {
        encodedData = req.body.res;
        hash = req.body.hash;
      }
    }

    // Eğer gövde henüz parse edilmediyse ham akıştan oku
    if (!encodedData || !hash) {
      const buffers = [];
      for await (const chunk of req) {
        buffers.push(chunk);
      }
      const rawBody = Buffer.concat(buffers).toString('utf-8');
      const params = new URLSearchParams(rawBody);
      encodedData = params.get('res') || encodedData;
      hash = params.get('hash') || hash;
    }

    if (!encodedData || !hash) {
      return res.status(400).json({ message: 'Eksik Shopier verisi' });
    }

    const osbPassword = process.env.SHOPIER_OSB_KEY || '2ae604163dc3512234e715b1f8d92700';
    const expectedHash = crypto
      .createHmac('sha256', osbPassword)
      .update(encodedData)
      .digest('hex');

    if (hash !== expectedHash) {
      return res.status(401).json({ message: 'Geçersiz güvenlik imzası' });
    }

    const decodedString = Buffer.from(encodedData, 'base64').toString('utf-8');
    const orderData = JSON.parse(decodedString);
    const customerEmail = orderData.email;

    if (customerEmail) {
      const supabaseUrl = process.env.SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      const response = await fetch(
        `${supabaseUrl}/rest/v1/profiles?email=eq.${encodeURIComponent(customerEmail)}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            is_pro: true,
            updated_at: new Date().toISOString()
          })
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Supabase hatası: ${errText}`);
      }
    }

    return res.status(200).send('success');
  } catch (error) {
    console.error('Shopier Webhook Hatası:', error);
    return res.status(500).json({ error: error.message });
  }
}
