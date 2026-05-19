'use strict';
const express = require('express');
const path    = require('path');
const fs      = require('fs');

const app        = express();
const PORT       = process.env.PORT       || 3000;
const ADMIN_PASS = process.env.ADMIN_PASS || 'namahev2025';

/* ═══════════════════════════════════════════════════════════════════
   ULTRAMSG WHATSAPP CONFIG
   ─────────────────────────────────────────────────────────────────
   Set these 3 variables in Railway → Variables:

   ULTRAMSG_INSTANCE  →  your instance ID  e.g. instance12345
   ULTRAMSG_TOKEN     →  your token from UltraMsg dashboard
   WA_OWNER           →  91XXXXXXXXXX  (owner's number, no + sign)

   HOW TO GET (5 minutes, free, 500 msgs/month):
   1. Go to ultramsg.com → Register free account
   2. Create Instance → scan QR with owner's WhatsApp phone
   3. Dashboard → copy "Instance ID" and "Token"
   4. Paste into Railway Variables above
   5. Done — messages send instantly, no approval needed
═══════════════════════════════════════════════════════════════════ */
const ULTRAMSG_INSTANCE = (process.env.ULTRAMSG_INSTANCE || '').trim();
const ULTRAMSG_TOKEN    = (process.env.ULTRAMSG_TOKEN    || '').trim();
const WA_OWNER          = (process.env.WA_OWNER          || '').trim().replace(/\D/g, '');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ── Leads file storage ─────────────────────────────────────────── */
const LEADS_FILE = path.join(__dirname, 'leads.json');
function readLeads()   { try { return JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8')); } catch { return []; } }
function writeLeads(l) { try { fs.writeFileSync(LEADS_FILE, JSON.stringify(l, null, 2)); } catch {} }

/* ── UltraMsg: send one WhatsApp message ────────────────────────── */
async function sendWA(toNumber, message) {
  const num = String(toNumber).replace(/\D/g, '');
  if (!ULTRAMSG_INSTANCE || !ULTRAMSG_TOKEN) {
    console.warn('[WA] Skipped — set ULTRAMSG_INSTANCE + ULTRAMSG_TOKEN in Railway Variables');
    return;
  }
  try {
    const body = new URLSearchParams({
      token   : ULTRAMSG_TOKEN,
      to      : num,
      body    : message
    });
    const res  = await fetch(
      `https://api.ultramsg.com/${ULTRAMSG_INSTANCE}/messages/chat`,
      {
        method  : 'POST',
        headers : { 'Content-Type': 'application/x-www-form-urlencoded' },
        body    : body.toString()
      }
    );
    const data = await res.json();
    if (data.error || data.sent === false) {
      console.error(`[WA] ❌ → ${num}:`, JSON.stringify(data));
    } else {
      console.log(`[WA] ✅ → ${num}`);
    }
    return data;
  } catch (e) {
    console.error(`[WA] ❌ network error:`, e.message);
  }
}

/* ── Message to owner: full enquiry details ─────────────────────── */
function ownerMsg(lead) {
  return [
    '🔔 *NEW LEAD — NAMAH EV*',
    '━━━━━━━━━━━━━━━━━━━━━━━━',
    `👤 *Name    :* ${lead.name}`,
    `📞 *Phone   :* +${lead.phone}`,
    ...(lead.email   ? [`📧 *Email   :* ${lead.email}`]   : []),
    ...(lead.product && lead.product !== 'General Enquiry'
        ? [`🛵 *Vehicle :* ${lead.product}`] : []),
    ...(lead.message ? [`💬 *Query   :* ${lead.message}`] : []),
    '',
    `🕐 *Time    :* ${lead.date}`,
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━',
    '_Call customer within 24 hours_'
  ].join('\n');
}

/* ── Thank-you message to customer ──────────────────────────────── */
function customerMsg(lead) {
  const fn = lead.name.split(' ')[0];
  return [
    '✅ *Enquiry Confirmed — NAMAH EV*',
    '',
    `Hello *${fn}*! Thank you for visiting us 🙏`,
    '',
    lead.product && lead.product !== 'General Enquiry'
      ? `Your enquiry for *${lead.product}* has been received successfully.`
      : 'Your enquiry has been received successfully.',
    '',
    '📋 *Your Details:*',
    `• Name  : ${lead.name}`,
    `• Phone : +${lead.phone}`,
    ...(lead.email   ? [`• Email : ${lead.email}`] : []),
    ...(lead.product && lead.product !== 'General Enquiry'
        ? [`• Vehicle: ${lead.product}`] : []),
    '',
    '⚡ *What Happens Next:*',
    '1️⃣  Our EV expert will call you within *24 hours*',
    '2️⃣  We will share the best price & current offers',
    '3️⃣  Easy EMI options available if needed',
    '',
    'Need help sooner? Just reply to this message!',
    '',
    '_— Team NAMAH EV_',
    '_Drive Electric. Drive India. ⚡_'
  ].join('\n');
}

/* ═══════════════════════════════════════════════════════════════════
   ROUTES
═══════════════════════════════════════════════════════════════════ */

/* POST /api/leads — save lead + fire both WA messages */
app.post('/api/leads', async (req, res) => {
  const { name, phone, email, product, message } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Name and phone required' });

  const lead = {
    id      : Date.now(),
    name    : name.trim(),
    phone   : String(phone).trim().replace(/\D/g, ''),
    email   : (email   || '').trim(),
    product : (product || 'General Enquiry').trim(),
    message : (message || '').trim(),
    date    : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    status  : 'New'
  };

  const leads = readLeads();
  leads.push(lead);
  writeLeads(leads);

  /* Send both messages — fire and forget, don't block response */
  if (WA_OWNER) {
    Promise.all([
      sendWA(WA_OWNER,   ownerMsg(lead)),
      sendWA(lead.phone, customerMsg(lead))
    ]).catch(e => console.error('[WA]', e.message));
  } else {
    console.warn('[WA] WA_OWNER not set in Railway Variables');
  }

  res.json({ success: true, lead });
});

/* GET /api/test-whatsapp?pass=ADMIN_PASS&to=91XXXXXXXXXX */
app.get('/api/test-whatsapp', async (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.status(401).json({ error: 'Unauthorized' });
  const to = (req.query.to || WA_OWNER).replace(/\D/g, '');
  const diag = {
    ULTRAMSG_INSTANCE_set : !!ULTRAMSG_INSTANCE,
    ULTRAMSG_TOKEN_set    : !!ULTRAMSG_TOKEN,
    ULTRAMSG_INSTANCE     : ULTRAMSG_INSTANCE || 'NOT SET',
    WA_OWNER              : WA_OWNER          || 'NOT SET',
    sending_to            : to
  };
  if (!ULTRAMSG_INSTANCE || !ULTRAMSG_TOKEN || !to)
    return res.json({ ok: false, diag, error: 'Set ULTRAMSG_INSTANCE + ULTRAMSG_TOKEN + WA_OWNER' });
  try {
    const result = await sendWA(to, '✅ NAMAH EV — WhatsApp test via UltraMsg is working!');
    res.json({ ok: !result?.error, diag, ultramsg: result });
  } catch (e) {
    res.json({ ok: false, diag, error: e.message });
  }
});

/* GET /api/leads */
app.get('/api/leads', (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.status(401).json({ error: 'Unauthorized' });
  res.json(readLeads());
});

/* GET /api/leads/export.csv */
app.get('/api/leads/export.csv', (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.status(401).json({ error: 'Unauthorized' });
  const rows = readLeads().map((l, i) =>
    `${i+1},"${l.name}","${l.phone}","${l.email}","${l.product}","${l.message}","${l.date}","${l.status}"`
  ).join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition',
    `attachment; filename="NAMAH_EV_Leads_${new Date().toISOString().slice(0,10)}.csv"`);
  res.send('\uFEFF#,Name,Phone,Email,Product,Message,Date,Status\r\n' + rows);
});

/* GET /api/leads/export.json */
app.get('/api/leads/export.json', (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.status(401).json({ error: 'Unauthorized' });
  res.setHeader('Content-Disposition',
    `attachment; filename="NAMAH_EV_Leads_${new Date().toISOString().slice(0,10)}.json"`);
  res.json(readLeads());
});

/* PATCH /api/leads/:id */
app.patch('/api/leads/:id', (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.status(401).json({ error: 'Unauthorized' });
  const leads = readLeads();
  const idx   = leads.findIndex(l => l.id == req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  leads[idx] = { ...leads[idx], ...req.body };
  writeLeads(leads);
  res.json(leads[idx]);
});

/* DELETE /api/leads/:id */
app.delete('/api/leads/:id', (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.status(401).json({ error: 'Unauthorized' });
  writeLeads(readLeads().filter(l => l.id != req.params.id));
  res.json({ success: true });
});

/* POST /api/chat — Anthropic proxy */
app.post('/api/chat', async (req, res) => {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method  : 'POST',
      headers : { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body    : JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, ...req.body })
    });
    res.json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* Serve SPA */
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`⚡ NAMAH EV on port ${PORT}`);
  console.log(`   WhatsApp : ${ULTRAMSG_INSTANCE && ULTRAMSG_TOKEN && WA_OWNER
    ? `✅ UltraMsg → instance: ${ULTRAMSG_INSTANCE}`
    : '❌ Set ULTRAMSG_INSTANCE + ULTRAMSG_TOKEN + WA_OWNER in Railway Variables'}`);
  console.log(`   Test WA  : /api/test-whatsapp?pass=${ADMIN_PASS}`);
});


const app        = express();
const PORT       = process.env.PORT       || 3000;
const ADMIN_PASS = process.env.ADMIN_PASS || 'namahev2025';

/* ═══════════════════════════════════════════════════════════════════
   META WHATSAPP CLOUD API
   ─────────────────────────────────────────────────────────────────
   Set these 3 variables in Railway → Variables:

   WA_TOKEN     →  your permanent token from Meta for Developers
   WA_PHONE_ID  →  Phone Number ID from Meta dashboard
   WA_OWNER     →  91XXXXXXXXXX  (owner's number, no + sign)

   HOW TO GET (30 min, free, 1000 msgs/month):
   1. developers.facebook.com → My Apps → Create App → Business
   2. Add product: WhatsApp
   3. WhatsApp → Getting Started → copy:
        "Access token"   → WA_TOKEN
        "Phone number ID"→ WA_PHONE_ID
   4. Add owner number as test recipient
   5. Done. No browser. No Puppeteer. No crashes. Ever.
═══════════════════════════════════════════════════════════════════ */
const WA_TOKEN    = (process.env.WA_TOKEN    || '').trim();
const WA_PHONE_ID = (process.env.WA_PHONE_ID || '').trim();
const WA_OWNER    = (process.env.WA_OWNER    || '').trim().replace(/\D/g, '');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ── Leads file storage ────────────────────────────────────────── */
const LEADS_FILE = path.join(__dirname, 'leads.json');
function readLeads()   { try { return JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8')); } catch { return []; } }
function writeLeads(l) { try { fs.writeFileSync(LEADS_FILE, JSON.stringify(l, null, 2)); } catch {} }

/* ── Meta Cloud API: send one WhatsApp message ─────────────────── */
async function sendWA(toNumber, message) {
  const num = String(toNumber).replace(/\D/g, '');
  if (!WA_TOKEN || !WA_PHONE_ID) {
    console.warn('[WA] Skipped — set WA_TOKEN + WA_PHONE_ID in Railway Variables');
    return;
  }
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`,
      {
        method  : 'POST',
        headers : {
          'Authorization' : `Bearer ${WA_TOKEN}`,
          'Content-Type'  : 'application/json'
        },
        body: JSON.stringify({
          messaging_product : 'whatsapp',
          to                : num,
          type              : 'text',
          text              : { body: message }
        })
      }
    );
    const data = await res.json();
    if (data.error) console.error(`[WA] ❌ → ${num}:`, data.error.message);
    else            console.log(`[WA] ✅ → ${num}`);
    return data;
  } catch (e) {
    console.error(`[WA] ❌ network error:`, e.message);
  }
}

/* ── Message to owner: full enquiry details ────────────────────── */
function ownerMsg(lead) {
  return [
    '🔔 *NEW LEAD — NAMAH EV*',
    '━━━━━━━━━━━━━━━━━━━━━━━━',
    `👤 *Name    :* ${lead.name}`,
    `📞 *Phone   :* +${lead.phone}`,
    ...(lead.email   ? [`📧 *Email   :* ${lead.email}`]   : []),
    ...(lead.product && lead.product !== 'General Enquiry'
        ? [`🛵 *Vehicle :* ${lead.product}`] : []),
    ...(lead.message ? [`💬 *Query   :* ${lead.message}`] : []),
    '',
    `🕐 *Time    :* ${lead.date}`,
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━',
    '_Call customer within 24 hours_'
  ].join('\n');
}

/* ── Thank-you message to customer ─────────────────────────────── */
function customerMsg(lead) {
  const fn = lead.name.split(' ')[0];
  return [
    '✅ *Enquiry Confirmed — NAMAH EV*',
    '',
    `Hello *${fn}*! Thank you for visiting us 🙏`,
    '',
    lead.product && lead.product !== 'General Enquiry'
      ? `Your enquiry for *${lead.product}* has been received successfully.`
      : 'Your enquiry has been received successfully.',
    '',
    '📋 *Your Details:*',
    `• Name  : ${lead.name}`,
    `• Phone : +${lead.phone}`,
    ...(lead.email   ? [`• Email : ${lead.email}`]   : []),
    ...(lead.product && lead.product !== 'General Enquiry'
        ? [`• Vehicle: ${lead.product}`] : []),
    '',
    '⚡ *What Happens Next:*',
    '1️⃣  Our EV expert will call you within *24 hours*',
    '2️⃣  We will share the best price & current offers',
    '3️⃣  Easy EMI options available if needed',
    '',
    'Need help sooner? Just reply to this message!',
    '',
    '_— Team NAMAH EV_',
    '_Drive Electric. Drive India. ⚡_'
  ].join('\n');
}

/* ═══════════════════════════════════════════════════════════════════
   ROUTES
═══════════════════════════════════════════════════════════════════ */

/* POST /api/leads — save lead + fire both WA messages */
app.post('/api/leads', async (req, res) => {
  const { name, phone, email, product, message } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Name and phone required' });

  const lead = {
    id      : Date.now(),
    name    : name.trim(),
    phone   : String(phone).trim().replace(/\D/g, ''),
    email   : (email   || '').trim(),
    product : (product || 'General Enquiry').trim(),
    message : (message || '').trim(),
    date    : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    status  : 'New'
  };

  /* Save lead first */
  const leads = readLeads();
  leads.push(lead);
  writeLeads(leads);

  /* Send both messages in parallel — don't block HTTP response */
  if (WA_OWNER) {
    Promise.all([
      sendWA(WA_OWNER,   ownerMsg(lead)),     /* → owner */
      sendWA(lead.phone, customerMsg(lead))   /* → customer */
    ]).catch(e => console.error('[WA parallel error]', e.message));
  }

  res.json({ success: true, lead });
});

/* GET /api/test-whatsapp?pass=ADMIN_PASS&to=91XXXXXXXXXX */
app.get('/api/test-whatsapp', async (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.status(401).json({ error: 'Unauthorized' });
  const to = (req.query.to || WA_OWNER).replace(/\D/g, '');
  const diag = {
    WA_TOKEN_set    : !!WA_TOKEN,
    WA_PHONE_ID     : WA_PHONE_ID || 'NOT SET',
    WA_OWNER        : WA_OWNER    || 'NOT SET',
    sending_to      : to
  };
  if (!WA_TOKEN || !WA_PHONE_ID || !to)
    return res.json({ ok: false, diag, error: 'WA_TOKEN, WA_PHONE_ID, WA_OWNER must all be set' });
  try {
    const result = await sendWA(to, '✅ NAMAH EV — WhatsApp test successful!');
    res.json({ ok: !result?.error, diag, meta: result });
  } catch (e) {
    res.json({ ok: false, diag, error: e.message });
  }
});

/* GET /api/leads */
app.get('/api/leads', (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.status(401).json({ error: 'Unauthorized' });
  res.json(readLeads());
});

/* GET /api/leads/export.csv */
app.get('/api/leads/export.csv', (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.status(401).json({ error: 'Unauthorized' });
  const leads = readLeads();
  const rows  = leads.map((l, i) =>
    `${i+1},"${l.name}","${l.phone}","${l.email}","${l.product}","${l.message}","${l.date}","${l.status}"`
  ).join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition',
    `attachment; filename="NAMAH_EV_Leads_${new Date().toISOString().slice(0,10)}.csv"`);
  res.send('\uFEFF#,Name,Phone,Email,Product,Message,Date,Status\r\n' + rows);
});

/* GET /api/leads/export.json */
app.get('/api/leads/export.json', (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.status(401).json({ error: 'Unauthorized' });
  res.setHeader('Content-Disposition',
    `attachment; filename="NAMAH_EV_Leads_${new Date().toISOString().slice(0,10)}.json"`);
  res.json(readLeads());
});

/* PATCH /api/leads/:id */
app.patch('/api/leads/:id', (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.status(401).json({ error: 'Unauthorized' });
  const leads = readLeads();
  const idx   = leads.findIndex(l => l.id == req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  leads[idx] = { ...leads[idx], ...req.body };
  writeLeads(leads);
  res.json(leads[idx]);
});

/* DELETE /api/leads/:id */
app.delete('/api/leads/:id', (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.status(401).json({ error: 'Unauthorized' });
  writeLeads(readLeads().filter(l => l.id != req.params.id));
  res.json({ success: true });
});

/* POST /api/chat — Anthropic proxy */
app.post('/api/chat', async (req, res) => {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method  : 'POST',
      headers : { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body    : JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, ...req.body })
    });
    res.json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* Serve SPA */
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`⚡ NAMAH EV on port ${PORT}`);
  console.log(`   WhatsApp : ${WA_TOKEN && WA_PHONE_ID && WA_OWNER
    ? `✅ Meta Cloud API → owner ${WA_OWNER}`
    : '❌ Set WA_TOKEN + WA_PHONE_ID + WA_OWNER in Railway Variables'}`);
  console.log(`   Test WA  : /api/test-whatsapp?pass=${ADMIN_PASS}`);
});
