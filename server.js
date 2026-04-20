const express = require('express');
const path    = require('path');
const fs      = require('fs');

const app        = express();
const PORT       = process.env.PORT       || 3000;
const ADMIN_PASS = process.env.ADMIN_PASS || 'namahev2025';


// ── Fonnte WhatsApp config ─────────────────────────────────────────
// Set these in Railway → Variables (never hard-code them here)
const FONNTE_TOKEN = process.env.FONNTE_TOKEN || 'cPsSa4FeaD896y9eNYtz';   // from fonnte.com
const WA_OWNER     = process.env.WA_OWNER     || '918000152351';   // e.g. 918000152351


app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Leads storage (file-based for Railway persistence) ─────────────
const LEADS_FILE = path.join(__dirname, 'leads.json');
function readLeads() {
  try { return JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8')); }
  catch { return []; }
}
function writeLeads(leads) {
  try { fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2)); } catch {}
}

// ══════════════════════════════════════════════════════════════════
//  POST /api/leads  — save lead + trigger WhatsApp messages
// ══════════════════════════════════════════════════════════════════
app.post('/api/leads', async (req, res) => {
  const { name, phone, email, product, message } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Name and phone required' });

  const lead = {
    id      : Date.now(),
    name    : name.trim(),
    phone   : phone.trim(),        // stored as "91XXXXXXXXXX"
    email   : (email   || '').trim(),
    product : (product || 'General Enquiry').trim(),
    message : (message || '').trim(),
    date    : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    status  : 'New'
  };

  const leads = readLeads();
  leads.push(lead);
  writeLeads(leads);

  // ── Send WhatsApp messages via Fonnte ────────────────────────────
  // Fire-and-forget — don't block the HTTP response
  if (FONNTE_TOKEN && WA_OWNER) {
    sendWA(WA_OWNER, ownerMsg(lead)).catch(e => console.error('[WA owner]', e.message));
    sendWA(lead.phone, userMsg(lead)).catch(e => console.error('[WA user]',  e.message));
  } else {
    console.warn('[WA] FONNTE_TOKEN or WA_OWNER not set — WhatsApp skipped');
  }

  res.json({ success: true, lead });
});

// ── Fonnte send helper ─────────────────────────────────────────────
async function sendWA(toNumber, message) {
  const num = String(toNumber).replace(/\D/g, '');
  const body = new URLSearchParams({ target: num, message, delay: '1' });
  const res = await fetch('https://api.fonnte.com/send', {
    method  : 'POST',
    headers : { 'Authorization': FONNTE_TOKEN },   // NO Content-Type — URLSearchParams sets it automatically
    body    : body
  });
  const data = await res.json();
  if (!data.status) console.warn('[Fonnte] failed:', JSON.stringify(data));
  return data;
}

// ── WhatsApp message templates ─────────────────────────────────────
function ownerMsg(lead) {
  const lines = [
    '🔔 *NEW LEAD — NAMAH EV*',
    '━━━━━━━━━━━━━━━━━━━━━━━━',
    `👤 *Name    :* ${lead.name}`,
    `📞 *Phone   :* +${lead.phone}`,
  ];
  if (lead.email)   lines.push(`📧 *Email   :* ${lead.email}`);
  if (lead.product) lines.push(`🛵 *Vehicle :* ${lead.product}`);
  if (lead.message) lines.push(`💬 *Message :* ${lead.message}`);
  lines.push('');
  lines.push(`🕐 *Received:* ${lead.date}`);
  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('_Action: Call customer within 24 hrs_');
  return lines.join('\n');
}

function userMsg(lead) {
  const fn = lead.name.split(' ')[0];
  const lines = [
    '✅ *Enquiry Confirmed — NAMAH EV*',
    '',
    `Hello *${fn}*! Thank you for reaching out to us 🙏`,
    '',
    lead.product
      ? `Your enquiry for *${lead.product}* has been received.`
      : 'Your enquiry has been received successfully.',
    '',
    '📋 *Your Details:*',
    `• Name    : ${lead.name}`,
    `• Phone   : +${lead.phone}`,
  ];
  if (lead.email)   lines.push(`• Email   : ${lead.email}`);
  if (lead.product) lines.push(`• Vehicle : ${lead.product}`);
  lines.push('');
  lines.push('⚡ *What Happens Next:*');
  lines.push('1️⃣  Our EV expert will call you within *24 hours*');
  lines.push('2️⃣  We will share the best price & current offers');
  lines.push('3️⃣  Easy EMI options available if needed');
  lines.push('');
  lines.push('Need help sooner? Just reply to this message!');
  lines.push('');
  lines.push('_— Team NAMAH EV_');
  lines.push('_Drive Electric. Drive India. ⚡_');
  return lines.join('\n');
}

// ══════════════════════════════════════════════════════════════════
//  POST /api/send-whatsapp  — manual WA trigger from frontend
//  (Used if the client wants to re-send or send independently)
// ══════════════════════════════════════════════════════════════════
app.post('/api/send-whatsapp', async (req, res) => {
  if (!FONNTE_TOKEN || !WA_OWNER) {
    return res.status(503).json({
      error: 'WhatsApp not configured. Set FONNTE_TOKEN and WA_OWNER in Railway Variables.'
    });
  }
  const lead = req.body;
  if (!lead || !lead.name || !lead.phone) {
    return res.status(400).json({ error: 'Lead data required' });
  }
  try {
    const [ownerResult, userResult] = await Promise.all([
      sendWA(WA_OWNER,    ownerMsg(lead)),
      sendWA(lead.phone,  userMsg(lead))
    ]);
    res.json({ success: true, ownerResult, userResult });
  } catch (e) {
    console.error('[/api/send-whatsapp]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ══════════════════════════════════════════════════════════════════
//  GET /api/leads  — admin fetch all leads
// ══════════════════════════════════════════════════════════════════
app.get('/api/leads', (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.status(401).json({ error: 'Unauthorized' });
  res.json(readLeads());
});

// GET /api/leads/export.csv
app.get('/api/leads/export.csv', (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.status(401).json({ error: 'Unauthorized' });
  const leads = readLeads();
  const bom = '\uFEFF';
  const hdr = '#,Name,Phone,Email,Product Interest,Message,Date,Status\r\n';
  const rows = leads.map((l, i) =>
    `${i+1},"${l.name}","${l.phone}","${l.email}","${l.product}","${l.message}","${l.date}","${l.status}"`
  ).join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="NAMAH_EV_Leads_${new Date().toISOString().slice(0,10)}.csv"`);
  res.send(bom + hdr + rows);
});

// GET /api/leads/export.json
app.get('/api/leads/export.json', (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.status(401).json({ error: 'Unauthorized' });
  res.setHeader('Content-Disposition', `attachment; filename="NAMAH_EV_Leads_${new Date().toISOString().slice(0,10)}.json"`);
  res.json(readLeads());
});

// PATCH /api/leads/:id — update status
app.patch('/api/leads/:id', (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.status(401).json({ error: 'Unauthorized' });
  const leads = readLeads();
  const idx   = leads.findIndex(l => l.id == req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  leads[idx] = { ...leads[idx], ...req.body };
  writeLeads(leads);
  res.json(leads[idx]);
});

// DELETE /api/leads/:id
app.delete('/api/leads/:id', (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.status(401).json({ error: 'Unauthorized' });
  let leads = readLeads();
  leads = leads.filter(l => l.id != req.params.id);
  writeLeads(leads);
  res.json({ success: true });
});

// ── Anthropic proxy (hides API key) ───────────────────────────────
app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method  : 'POST',
      headers : {
        'Content-Type'       : 'application/json',
        'x-api-key'          : apiKey,
        'anthropic-version'  : '2023-06-01'
      },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, ...req.body })
    });
    res.json(await response.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Catch-all → serve index.html ──────────────────────────────────
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, '0.0.0.0', () =>
  console.log(`⚡ NAMAH EV on :${PORT} | WA configured: ${!!(FONNTE_TOKEN && WA_OWNER)}`)
);