import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Sadece POST istekleri kabul edilir' });
  }

  try {
    let encodedData = null;
    let hash = null;

    // 1. Vercel gövde ayrıştırıcı kontrolü
    if (req.body) {
      if (typeof req.body === 'object') {
        encodedData = req.body.res;
        hash = req.body.hash;
      } else if (typeof req.body === 'string') {
        const params = new URLSearchParams(req.body);
        encodedData = params.get('res');
        hash = params.get('hash');
      }
    }

    // 2. Ham veri akışı (Raw Stream) yedek kontrolü
    if (!encodedData || !hash) {
      try {
        const chunks = [];
        for await (const chunk of req) {
          chunks.push(chunk);
        }
        const rawBody = Buffer.concat(chunks).toString('utf-8');
        if (rawBody) {
          const params = new URLSearchParams(rawBody);
          encodedData = params.get('res');
          hash = params.get('hash');
          
          if (!encodedData || !hash) {
            const parsed = JSON.parse(rawBody);
            encodedData = parsed.res;
            hash = parsed.hash;
          }
        }
      } catch (err) {
        // Akış okunamazsa yoksay
      }
    }

    if (!encodedData || !hash) {
      console.error('Eksik Shopier verisi. req.body:', req.body);
      return res.status(400).json({ message: 'Eksik Shopier verisi' });
    }

    const osbPassword = process.env.SHOPIER_OSB_KEY || '2ae604163dc3512234e715b1f8d92700';
    const expectedHash = crypto
      .createHmac('sha256', osbPassword)
      .update(encodedData)
      .digest('hex');

    if (hash !== expectedHash) {
      console.error('İmza uyuşmazlığı!');
      return res.status(401).json({ message: 'Geçersiz güvenlik imzası' });
    }

    const decodedString = Buffer.from(encodedData, 'base64').toString('utf-8');
    const orderData = JSON.parse(decodedString);
    const customerEmail = orderData.email;

    if (customerEmail) {
      const supabaseUrl = process.env.SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseUrl && serviceRoleKey) {
        await fetch(
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
      }
    }

    return res.status(200).send('success');
  } catch (error) {
    console.error('Webhook Hatası:', error);
    return res.status(500).json({ error: error.message });
  }
}
