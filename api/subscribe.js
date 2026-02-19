// api/subscribe.js — Vercel Serverless Function
// Corre no servidor: sem CORS, sem expor o token ao browser.

const MAILERLITE_TOKEN = process.env.MAILERLITE_TOKEN;
const GROUP_NAME       = 'Webinar #2';

export default async function handler(req, res) {
  // Só aceita POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const { name, email } = req.body || {};

  // Validação básica
  if (!name || typeof name !== 'string' || name.trim().length < 1) {
    return res.status(400).json({ error: 'Nome inválido.' });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'E-mail inválido.' });
  }

  const headers = {
    'Authorization': `Bearer ${MAILERLITE_TOKEN}`,
    'Content-Type':  'application/json',
    'Accept':        'application/json',
  };

  try {
    // ── 1. Buscar ou criar o grupo "Webinar #2" ──
    const groupsRes = await fetch('https://connect.mailerlite.com/api/groups?limit=100', { headers });
    if (!groupsRes.ok) throw new Error('Erro ao ligar ao MailerLite.');

    const groupsData = await groupsRes.json();
    let group = (groupsData.data || []).find(g => g.name === GROUP_NAME);

    if (!group) {
      const createRes = await fetch('https://connect.mailerlite.com/api/groups', {
        method:  'POST',
        headers,
        body: JSON.stringify({ name: GROUP_NAME }),
      });
      if (!createRes.ok) throw new Error('Erro ao criar grupo.');
      const created = await createRes.json();
      group = created.data;
    }

    // ── 2. Criar/actualizar subscriber ──
    const subRes = await fetch('https://connect.mailerlite.com/api/subscribers', {
      method:  'POST',
      headers,
      body: JSON.stringify({
        email:  email.trim().toLowerCase(),
        fields: { name: name.trim() },
        status: 'active',
      }),
    });

    if (!subRes.ok) {
      const err = await subRes.json().catch(() => ({}));
      throw new Error(err?.message || 'Erro ao registar subscriber.');
    }

    const subData    = await subRes.json();
    const subscriberId = subData.data.id;

    // ── 3. Adicionar ao grupo ──
    const assignRes = await fetch(
      `https://connect.mailerlite.com/api/subscribers/${subscriberId}/groups/${group.id}`,
      { method: 'POST', headers }
    );

    if (!assignRes.ok) throw new Error('Erro ao adicionar ao grupo.');

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('MailerLite error:', err.message);
    return res.status(500).json({ error: err.message || 'Erro interno. Tenta novamente.' });
  }
}
