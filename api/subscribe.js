// api/subscribe.js — Vercel Serverless Function (Node)
// Corre no servidor: não expões o token ao browser.

const MAILERLITE_TOKEN = process.env.MAILERLITE_TOKEN;
const GROUP_NAME       = process.env.MAILERLITE_GROUP_NAME || 'Webinar #2';

// (Opcional) Se precisares de chamar este endpoint a partir de outro domínio,
// define ALLOWED_ORIGIN (ex: https://teusite.com). Se não definires, fica "*".
const ALLOWED_ORIGIN   = process.env.ALLOWED_ORIGIN || '*';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req, res) {
  setCors(res);

  // Preflight (para casos cross-domain)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Só aceita POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  if (!MAILERLITE_TOKEN) {
    return res.status(500).json({ error: 'MAILERLITE_TOKEN não configurado no servidor.' });
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
    // ── 1) Buscar ou criar o grupo ──
    // MailerLite permite limit até 1000 na listagem de grupos.
    const groupsRes = await fetch('https://connect.mailerlite.com/api/groups?limit=1000', { headers });
    if (!groupsRes.ok) throw new Error('Erro ao ligar ao MailerLite (groups).');

    const groupsData = await groupsRes.json();
    let group = (groupsData.data || []).find(g => g.name === GROUP_NAME);

    if (!group) {
      const createRes = await fetch('https://connect.mailerlite.com/api/groups', {
        method:  'POST',
        headers,
        body: JSON.stringify({ name: GROUP_NAME }),
      });
      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        throw new Error(err?.message || 'Erro ao criar grupo.');
      }
      const created = await createRes.json();
      group = created.data;
    }

    // ── 2) Criar/actualizar subscriber (upsert) ──
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

    const subData = await subRes.json();
    const subscriberId = subData?.data?.id;

    if (!subscriberId) {
      throw new Error('Resposta inválida do MailerLite (subscriber id em falta).');
    }

    // ── 3) Atribuir ao grupo ──
    const assignRes = await fetch(
      `https://connect.mailerlite.com/api/subscribers/${subscriberId}/groups/${group.id}`,
      { method: 'POST', headers }
    );

    if (!assignRes.ok) {
      const err = await assignRes.json().catch(() => ({}));
      throw new Error(err?.message || 'Erro ao adicionar ao grupo.');
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('MailerLite error:', err);
    return res.status(500).json({ error: err?.message || 'Erro interno. Tenta novamente.' });
  }
}
