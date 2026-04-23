'use strict';
const express   = require('express');
const path      = require('path');
const fs        = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode    = require('qrcode');

const app        = express();
const PORT       = process.env.PORT       || 3000;
const ADMIN_PASS = process.env.ADMIN_PASS || 'namahev2025';
const WA_OWNER   = (process.env.WA_OWNER  || '').replace(/\D/g, '');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const LEADS_FILE = path.join(__dirname, 'leads.json');
function readLeads()   { try { return JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8')); } catch { return []; } }
function writeLeads(l) { try { fs.writeFileSync(LEADS_FILE, JSON.stringify(l, null, 2)); } catch {} }

let waReady   = false;
let currentQR = null;
let waClient  = null;

/* Find system Chromium installed by Nix (Railway) or fall back to env var */
function getChromiumPath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  const { execSync } = require('child_process');
  const candidates = ['chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable'];
  for (const bin of candidates) {
    try { return execSync(`which ${bin}`, { stdio: ['pipe','pipe','ignore'] }).toString().trim(); }
    catch {}
  }
  return null; // let Puppeteer use its own bundled Chrome as last resort
}

function initWhatsApp() {
  const chromiumPath = getChromiumPath();
  if (chromiumPath) console.log(`[WA] Using Chromium: ${chromiumPath}`);
  else console.warn('[WA] No system Chromium found — using Puppeteer bundled Chrome');

  waClient = new Client({
    authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '.wwebjs_auth') }),
    puppeteer: {
      headless        : true,
      executablePath  : chromiumPath || undefined,
      args: [
        '--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas','--disable-gpu',
        '--no-first-run','--no-zygote','--single-process','--disable-extensions'
      ]
    }
  });

  waClient.on('qr', async (qr) => {
    waReady   = false;
    currentQR = await qrcode.toDataURL(qr);
    console.log('\n══════════════════════════════════════════');
    console.log('  SCAN QR TO CONNECT WHATSAPP');
    console.log(`  Open: /api/qr?pass=${ADMIN_PASS}`);
    console.log('══════════════════════════════════════════\n');
    qrcode.toString(qr, { type: 'terminal', small: true }, (e, s) => { if (!e) console.log(s); });
  });

  waClient.on('ready', () => {
    waReady = true; currentQR = null;
    console.log('✅ WhatsApp ready!');
  });

  waClient.on('authenticated', () => console.log('🔐 WhatsApp authenticated'));

  waClient.on('auth_failure', () => {
    waReady = false;
    console.error('❌ WhatsApp auth failed — restarting in 10s');
    setTimeout(initWhatsApp, 10000);
  });

  waClient.on('disconnected', (r) => {
    waReady = false;
    console.warn('⚠️  Disconnected:', r, '— restarting in 10s');
    setTimeout(initWhatsApp, 10000);
  });

  waClient.initialize().catch(e => {
    console.error('❌ Init error:', e.message, '— retry in 15s');
    setTimeout(initWhatsApp, 15000);
  });
}

initWhatsApp();

async function sendWA(toNumber, message) {
  const num = String(toNumber).replace(/\D/g, '');
  if (!waReady || !waClient) {
    console.warn(`[WA] Not ready — will retry ${num} in 30s`);
    setTimeout(() => sendWA(num, message), 30000);
    return;
  }
  const chatId = num + '@c.us';
  try {
    await waClient.sendMessage(chatId, message);
    console.log(`[WA] ✅ → ${chatId}`);
  } catch (e) {
    console.error(`[WA] ❌ → ${chatId}:`, e.message);
  }
}

function ownerMsg(lead) {
  const lines = [
    '🔔 *NEW LEAD — NAMAH EV*',
    '━━━━━━━━━━━━━━━━━━━━━━━━',
    `👤 *Name    :* ${lead.name}`,
    `📞 *Phone   :* +${lead.phone}`,
  ];
  if (lead.email)   lines.push(`📧 *Email   :* ${lead.email}`);
  if (lead.product && lead.product !== 'General Enquiry') lines.push(`🛵 *Vehicle :* ${lead.product}`);
  if (lead.message) lines.push(`💬 *Query   :* ${lead.message}`);
  lines.push('', `🕐 *Received:* ${lead.date}`, '', '━━━━━━━━━━━━━━━━━━━━━━━━', '_Action: Call within 24 hrs_');
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
    '', '📋 *Your Details:*',
    `• Name  : ${lead.name}`, `• Phone : +${lead.phone}`,
    ...(lead.email ? [`• Email : ${lead.email}`] : []),
    ...(lead.product && lead.product !== 'General Enquiry' ? [`• Vehicle: ${lead.product}`] : []),
    '', '⚡ *What Happens Next:*',
    '1️⃣ Our EV expert calls within *24 hours*',
    '2️⃣ Best price & current offers shared',
    '3️⃣ Easy EMI options available',
    '', 'Need help? Just reply here!', '',
    '_— Team NAMAH EV_', '_Drive Electric. Drive India. ⚡_'
  ].join('\n');
}

app.get('/api/qr', (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.status(401).send('Unauthorized');
  if (waReady) return res.send(`<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:60px;background:#111;color:#fff"><h2 style="color:#10b981">✅ WhatsApp Connected!</h2><p>Messages will send automatically.</p></body></html>`);
  if (!currentQR) return res.send(`<!DOCTYPE html><html><head><meta http-equiv="refresh" content="3"></head><body style="font-family:sans-serif;text-align:center;padding:60px;background:#111;color:#fff"><h2>⏳ Generating QR...</h2><p>Auto-refreshes every 3s. Please wait.</p></body></html>`);
  res.send(`<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<title>NAMAH EV — Scan QR</title><meta http-equiv="refresh" content="30">
<style>body{font-family:sans-serif;background:#0d1117;color:#e8f0f8;text-align:center;padding:40px 20px}
h1{color:#10b981}p{color:#8fa5bf;margin-bottom:20px}
img{border:4px solid #10b981;border-radius:16px;max-width:280px;width:100%}
.note{margin-top:20px;font-size:.85rem;color:#546a7e;line-height:1.9}
.badge{background:#10b981;color:#000;padding:4px 16px;border-radius:20px;font-weight:700;font-size:.8rem;display:inline-block;margin-bottom:16px}
</style></head>
<body>
<div class="badge">NAMAH EV — WhatsApp Setup</div>
<h1>Scan this QR code</h1>
<p>Open WhatsApp on the <strong>owner's phone</strong><br>Linked Devices → Link a Device → Scan</p>
<img src="${currentQR}" alt="WhatsApp QR Code"/>
<div class="note">QR auto-refreshes every 30 seconds<br>After scanning → this page shows "Connected"<br><strong>You only need to do this once ever</strong></div>
</body></html>`);
});

app.get('/api/wa-status', (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.status(401).json({ error: 'Unauthorized' });
  res.json({ connected: waReady, qr_available: !!currentQR, owner: WA_OWNER || 'not set' });
});

app.get('/api/test-whatsapp', async (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.status(401).json({ error: 'Unauthorized' });
  if (!waReady) return res.json({ ok: false, error: 'Not connected. Scan QR first.', qr_url: `/api/qr?pass=${ADMIN_PASS}` });
  const to = (req.query.to || WA_OWNER).replace(/\D/g, '');
  if (!to) return res.json({ ok: false, error: 'Provide ?to=91XXXXXXXXXX' });
  try {
    await sendWA(to, '✅ NAMAH EV — WhatsApp test successful!');
    res.json({ ok: true, sent_to: to });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

app.post('/api/leads', (req, res) => {
  const { name, phone, email, product, message } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Name and phone required' });
  const lead = {
    id: Date.now(), name: name.trim(),
    phone: String(phone).trim().replace(/\D/g, ''),
    email: (email || '').trim(),
    product: (product || 'General Enquiry').trim(),
    message: (message || '').trim(),
    date: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    status: 'New'
  };
  const leads = readLeads(); leads.push(lead); writeLeads(leads);
  if (WA_OWNER) { sendWA(WA_OWNER, ownerMsg(lead)); sendWA(lead.phone, userMsg(lead)); }
  res.json({ success: true, lead, wa_ready: waReady });
});

app.get('/api/leads', (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.status(401).json({ error: 'Unauthorized' });
  res.json(readLeads());
});

app.get('/api/leads/export.csv', (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.status(401).json({ error: 'Unauthorized' });
  const leads = readLeads();
  const rows = leads.map((l, i) => `${i+1},"${l.name}","${l.phone}","${l.email}","${l.product}","${l.message}","${l.date}","${l.status}"`).join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="NAMAH_EV_Leads_${new Date().toISOString().slice(0,10)}.csv"`);
  res.send('\uFEFF#,Name,Phone,Email,Product,Message,Date,Status\r\n' + rows);
});

app.get('/api/leads/export.json', (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.status(401).json({ error: 'Unauthorized' });
  res.setHeader('Content-Disposition', `attachment; filename="NAMAH_EV_Leads_${new Date().toISOString().slice(0,10)}.json"`);
  res.json(readLeads());
});

app.patch('/api/leads/:id', (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.status(401).json({ error: 'Unauthorized' });
  const leads = readLeads(), idx = leads.findIndex(l => l.id == req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  leads[idx] = { ...leads[idx], ...req.body }; writeLeads(leads); res.json(leads[idx]);
});

app.delete('/api/leads/:id', (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.status(401).json({ error: 'Unauthorized' });
  let leads = readLeads().filter(l => l.id != req.params.id); writeLeads(leads); res.json({ success: true });
});

app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, ...req.body })
    });
    res.json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`⚡ NAMAH EV on port ${PORT}`);
  console.log(`   WA_OWNER : ${WA_OWNER || '❌ not set'}`);
  console.log(`   QR page  : /api/qr?pass=${ADMIN_PASS}`);
});
