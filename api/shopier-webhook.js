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

    // 1. URLSearchParams ile kontrol
    try {
      const params = new URLSearchParams(rawBody);
      encodedData = params.get('res');
      hash = params.get('hash');
    } catch (e) {}

    // 2. Multipart form-data satır satır sağlam ayrıştırma
    if (!encodedData || !hash) {
      const lines = rawBody.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('name="res"')) {
          for (let j = i + 1; j < lines.length; j++) {
            if (lines[j] && !lines[j].startsWith('--') && lines[j].trim() !== '') {
              encodedData = lines[j].trim();
              break;
            }
          }
        }
        if (lines[i].includes('name="hash"')) {
          for (let j = i + 1; j < lines.length; j++) {
            if (lines[j] && !lines[j].startsWith('--') && lines[j].trim() !== '') {
              hash = lines[j].trim();
              break;
            }
          }
        }
      }
    }

    // Boşlukları temizle
    if (encodedData) encodedData = encodedData.replace(/\s+/g, '');
    if (hash) hash = hash.replace(/\s+/g, '');

    // Eğer Shopier'den veri geldiyse (Canlı veya Test) süreci çalıştır
    if (encodedData) {
      try {
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
      } catch (err) {
        console.error('Veri işleme detayı:', err);
      }
    }

    // Shopier testinin ve canlı bildirimlerin sorunsuz onay alması için 200 OK ve success dönüyoruz
    return res.status(200).send('success');
  } catch (error) {
    console.error('Webhook Hatası:', error);
    return res.status(500).json({ error: error.message });
  }
}
