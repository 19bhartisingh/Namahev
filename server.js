const express = require('express');
const path    = require('path');
const fs      = require('fs');

const app        = express();
const PORT       = process.env.PORT       || 3000;
const ADMIN_PASS = process.env.ADMIN_PASS || 'namahev2025';

const FONNTE_TOKEN = (process.env.FONNTE_TOKEN || 'cPsSa4FeaD896y9eNYtz').trim();
const WA_OWNER     = (process.env.WA_OWNER     || '918000152351').trim();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ── Leads storage ─────────────────────────────────────────────── */
const LEADS_FILE = path.join(__dirname, 'leads.json');
function readLeads()  { try { return JSON.parse(fs.readFileSync(LEADS_FILE,'utf8')); } catch { return []; } }
function writeLeads(l){ try { fs.writeFileSync(LEADS_FILE, JSON.stringify(l,null,2)); } catch {} }

/* ── Fonnte send ───────────────────────────────────────────────── */
async function sendWA(toNumber, message) {
  const num = String(toNumber).replace(/\D/g,'');
  const body = new URLSearchParams();
  body.append('target',  num);
  body.append('message', message);
  body.append('delay',   '1');

  console.log(`[WA] → ${num} | token len: ${FONNTE_TOKEN.length}`);

  const res  = await fetch('https://api.fonnte.com/send', {
    method  : 'POST',
    headers : { 'Authorization': FONNTE_TOKEN },
    body    : body.toString()
  });
  const raw  = await res.text();
  console.log(`[WA] ← ${res.status} ${raw}`);

  try { return JSON.parse(raw); }
  catch { return { status: false, reason: raw }; }
}

/* ── Message templates ─────────────────────────────────────────── */
function ownerMsg(lead) {
  const lines = [
    '🔔 *NEW LEAD — NAMAH EV*',
    '━━━━━━━━━━━━━━━━━━━━━━━━',
    `👤 *Name    :* ${lead.name}`,
    `📞 *Phone   :* +${lead.phone}`,
  ];
  if (lead.email)   lines.push(`📧 *Email   :* ${lead.email}`);
  if (lead.product && lead.product !== 'General Enquiry') lines.push(`🛵 *Vehicle :* ${lead.product}`);
  if (lead.message) lines.push(`💬 *Message :* ${lead.message}`);
  lines.push('', `🕐 *Received:* ${lead.date}`, '',
    '━━━━━━━━━━━━━━━━━━━━━━━━',
    '_Action: Call within 24 hrs_');
  return lines.join('\n');
}

function userMsg(lead) {
  const fn = lead.name.split(' ')[0];
  return [
    '✅ *Enquiry Confirmed — NAMAH EV*', '',
    `Hello *${fn}*! Thank you for reaching out 🙏`, '',
    lead.product && lead.product !== 'General Enquiry'
      ? `Your enquiry for *${lead.product}* has been received.`
      : 'Your enquiry has been received successfully.',
    '',
    '📋 *Your Details:*',
    `• Name  : ${lead.name}`,
    `• Phone : +${lead.phone}`,
    ...(lead.email   ? [`• Email : ${lead.email}`]   : []),
    ...(lead.product && lead.product !== 'General Enquiry' ? [`• Vehicle: ${lead.product}`] : []),
    '',
    '⚡ *What Happens Next:*',
    '1️⃣ Our EV expert calls within *24 hours*',
    '2️⃣ Best price & current offers shared',
    '3️⃣ Easy EMI options available',
    '', 'Need help sooner? Just reply here!', '',
    '_— Team NAMAH EV_',
    '_Drive Electric. Drive India. ⚡_'
  ].join('\n');
}

/* ═══════════════════════════════════════════════════════════════════
   API ROUTES
═══════════════════════════════════════════════════════════════════ */

/* POST /api/leads — save lead + auto-send WhatsApp */
app.post('/api/leads', async (req, res) => {
  const { name, phone, email, product, message } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Name and phone required' });

  const lead = {
    id      : Date.now(),
    name    : name.trim(),
    phone   : String(phone).trim().replace(/\D/g,''),
    email   : (email   || '').trim(),
    product : (product || 'General Enquiry').trim(),
    message : (message || '').trim(),
    date    : new Date().toLocaleString('en-IN',{ timeZone:'Asia/Kolkata' }),
    status  : 'New'
  };

  const leads = readLeads();
  leads.push(lead);
  writeLeads(leads);

  if (FONNTE_TOKEN && WA_OWNER) {
    sendWA(WA_OWNER,    ownerMsg(lead)).catch(e => console.error('[WA owner]', e.message));
    sendWA(lead.phone,  userMsg(lead)).catch(e => console.error('[WA user]',  e.message));
  } else {
    console.warn('[WA] Skipped — FONNTE_TOKEN or WA_OWNER not set');
  }

  res.json({ success: true, lead });
});

/* GET /api/test-whatsapp?pass=ADMIN_PASS&to=91XXXXXXXXXX
   Sends a test WA message and returns full diagnostics */
app.get('/api/test-whatsapp', async (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.status(401).json({ error: 'Unauthorized' });
  const to = (req.query.to || WA_OWNER).replace(/\D/g,'');
  const diag = {
    node_version        : process.version,
    FONNTE_TOKEN_set    : !!FONNTE_TOKEN,
    FONNTE_TOKEN_length : FONNTE_TOKEN.length,
    WA_OWNER_set        : !!WA_OWNER,
    WA_OWNER_value      : WA_OWNER,
    sending_to          : to
  };
  if (!FONNTE_TOKEN || !to) return res.json({ ok:false, diag, error:'FONNTE_TOKEN or target missing' });
  try {
    const result = await sendWA(to, '✅ NAMAH EV — WhatsApp test successful!');
    res.json({ ok: result.status === true, diag, fonnte: result });
  } catch(e) {
    res.json({ ok:false, diag, error: e.message });
  }
});

/* GET /api/leads — admin list */
app.get('/api/leads', (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.status(401).json({ error:'Unauthorized' });
  res.json(readLeads());
});

/* GET /api/leads/export.csv */
app.get('/api/leads/export.csv', (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.status(401).json({ error:'Unauthorized' });
  const leads = readLeads();
  const bom = '\uFEFF';
  const hdr = '#,Name,Phone,Email,Product,Message,Date,Status\r\n';
  const rows = leads.map((l,i) =>
    `${i+1},"${l.name}","${l.phone}","${l.email}","${l.product}","${l.message}","${l.date}","${l.status}"`
  ).join('\r\n');
  res.setHeader('Content-Type','text/csv; charset=utf-8');
  res.setHeader('Content-Disposition',`attachment; filename="NAMAH_EV_Leads_${new Date().toISOString().slice(0,10)}.csv"`);
  res.send(bom + hdr + rows);
});

/* GET /api/leads/export.json */
app.get('/api/leads/export.json', (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.status(401).json({ error:'Unauthorized' });
  res.setHeader('Content-Disposition',`attachment; filename="NAMAH_EV_Leads_${new Date().toISOString().slice(0,10)}.json"`);
  res.json(readLeads());
});

/* PATCH /api/leads/:id — update status */
app.patch('/api/leads/:id', (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.status(401).json({ error:'Unauthorized' });
  const leads = readLeads();
  const idx   = leads.findIndex(l => l.id == req.params.id);
  if (idx === -1) return res.status(404).json({ error:'Not found' });
  leads[idx] = { ...leads[idx], ...req.body };
  writeLeads(leads);
  res.json(leads[idx]);
});

/* DELETE /api/leads/:id */
app.delete('/api/leads/:id', (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.status(401).json({ error:'Unauthorized' });
  let leads = readLeads();
  leads = leads.filter(l => l.id != req.params.id);
  writeLeads(leads);
  res.json({ success:true });
});

/* POST /api/chat — Anthropic proxy */
app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error:'ANTHROPIC_API_KEY not set' });
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method  : 'POST',
      headers : { 'Content-Type':'application/json', 'x-api-key':apiKey, 'anthropic-version':'2023-06-01' },
      body    : JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:1000, ...req.body })
    });
    res.json(await r.json());
  } catch(e) { res.status(500).json({ error:e.message }); }
});

/* Catch-all → SPA */
app.get('*', (req, res) => res.sendFile(path.join(__dirname,'public','index.html')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`⚡ NAMAH EV running on port ${PORT}`);
  console.log(`   WhatsApp : ${FONNTE_TOKEN && WA_OWNER ? '✅ configured' : '❌ NOT configured — set FONNTE_TOKEN + WA_OWNER'}`);
  console.log(`   Admin    : pass=${ADMIN_PASS}`);
});
