import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Sadece POST istekleri kabul edilir' });
  }

  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks).toString('utf-8');

    let encodedData = null;
    let hash = null;

    // 1. Multipart form-data ayrıştırma
    if (rawBody.includes('name="res"') || rawBody.includes('name="hash"')) {
      const resMatch = rawBody.match(/name="res"[^]*?\r?\n\r?\n([^\r\n]+)/);
      const hashMatch = rawBody.match(/name="hash"[^]*?\r?\n\r?\n([^\r\n]+)/);
      if (resMatch) encodedData = resMatch[1];
      if (hashMatch) hash = hashMatch[1];
    }

    // 2. URLSearchParams yedek kontrolü
    if (!encodedData || !hash) {
      try {
        const params = new URLSearchParams(rawBody);
        encodedData = params.get('res');
        hash = params.get('hash');
      } catch (e) {}
    }

    // 3. req.body yedek kontrolü
    if ((!encodedData || !hash) && req.body) {
      if (typeof req.body === 'object') {
        encodedData = req.body.res;
        hash = req.body.hash;
      }
    }

    if (!encodedData || !hash) {
      console.error('Eksik Shopier verisi, rawBody:', rawBody);
      return res.status(400).json({ message: 'Eksik Shopier verisi' });
    }

    // Base64 ve Hash metinlerindeki tüm görünmez boşluk ve satır sonlarını temizle
    encodedData = encodedData.replace(/\s+/g, '');
    hash = hash.replace(/\s+/g, '');

    const osbPassword = process.env.SHOPIER_OSB_KEY || '2ae604163dc3512234e715b1f8d92700';
    const expectedHash = crypto
      .createHmac('sha256', osbPassword)
      .update(encodedData)
      .digest('hex');

    if (hash !== expectedHash) {
      console.error(`İmza uyuşmazlığı! Gelen: [${hash}], Beklenen: [${expectedHash}]`);
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
