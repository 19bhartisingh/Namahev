╔══════════════════════════════════════════════════════════════════════╗
║                  NAMAH EV WEBSITE — SETUP GUIDE                     ║
╠══════════════════════════════════════════════════════════════════════╣

FOLDER STRUCTURE
────────────────
namah-ev/
├── index.html          ← Main website file (open this in browser)
├── robots.txt          ← For Google search indexing
├── sitemap.xml         ← Update your domain URL inside this
├── README.txt          ← This file
└── images/
    ├── og-cover.jpg    ← Add a 1200×630px banner for WhatsApp/Facebook previews
    ├── scooters/
    │   ├── sc1/        ← M8 Single Light
    │   │   ├── main.jpg         (card thumbnail — 800×600px recommended)
    │   │   ├── photo_2026-01-03_14-21-40.jpg
    │   │   ├── photo_2026-01-03_14-21-45.jpg
    │   │   ├── photo_2026-01-03_14-23-51.jpg
    │   │   ├── photo_2026-01-03_14-23-56.jpg
    │   │   └── photo_2026-01-03_14-24-05.jpg
    │   ├── sc2/        ← STAR
    │   ├── sc3/        ← Nine
    │   └── sc4/        ← Cardo
    ├── bikes/
    │   ├── bk1/        ← Storm 150
    │   └── bk2/        ← Raptor X
    ├── rickshaws/
    │   ├── rk1/        ← Carry 3W
    │   └── rk2/        ← Vista E-Rick
    ├── loaders/
    │   ├── ld1/        ← Atlas L1
    │   └── ld2/        ← Titan L2
    └── spareparts/
        ├── sp1/        ← LFP Battery Pack
        ├── sp2/        ← BLDC Motor
        ├── sp3/        ← BMS 60V
        └── sp4/        ← Fast Charger

IMAGE INSTRUCTIONS
──────────────────
• Replace the placeholder .jpg files with your real vehicle photos
• Recommended size: 800×600px for main.jpg, same for photos
• Keep each image under 200KB for fast mobile loading
• Use JPEG format (.jpg) — the site automatically tries .webp first
  so if you also save a .webp version it will load even faster
• Image tips: good lighting, white/plain background, full vehicle visible

HOW TO OPEN LOCALLY
────────────────────
Simply double-click index.html — it opens in any browser.
Works offline! No server needed.

HOW TO PUT ON THE INTERNET (FREE)
───────────────────────────────────
Option A — Netlify (Easiest, Free):
  1. Go to netlify.com and sign up free
  2. Drag and drop the entire namah-ev folder onto the dashboard
  3. Your site is live instantly at a free URL like namahev.netlify.app
  4. Add your own domain (namahev.com) from Netlify settings

Option B — GitHub Pages (Free):
  1. Create account at github.com
  2. New repository → upload all files → enable GitHub Pages in Settings

WHATSAPP AUTO-SEND SETUP (Send without opening WhatsApp)
─────────────────────────────────────────────────────────
Currently: clicking "Submit Enquiry" opens WhatsApp with pre-filled messages.

To make it FULLY AUTOMATIC (messages send in background, no tab opens):
  1. Go to ultramsg.com — sign up FREE (300 msgs/month free)
  2. Click "Add Instance" → scan QR code with the OWNER'S phone
  3. Copy your Instance ID and Token from the dashboard
  4. Open index.html in a text editor (Notepad, VS Code, etc.)
  5. Find these two lines (around line 1290):
       var WA_INSTANCE = 'YOUR_INSTANCE';
       var WA_TOKEN    = 'YOUR_TOKEN';
  6. Replace with your real values:
       var WA_INSTANCE = 'instance12345';
       var WA_TOKEN    = 'abc123xyz';
  7. Save the file — done!

What happens after setup:
  • Owner's WhatsApp: Gets full enquiry details automatically
  • Customer's WhatsApp: Gets personalised thank-you message on their number
  • Page: Shows success screen with enquiry summary

OWNER WHATSAPP NUMBER
──────────────────────
Currently set to: 917318286019 (91 + 7318286019)
To change: search "WA_OWNER" in index.html and update the number.

ADDING / CHANGING PRODUCTS
────────────────────────────
Open index.html, find the PRODUCTS array (around line 780).
Each product looks like:
  {
    id: 'sc5',
    category: 'scooters',    // scooters / bikes / rickshaws / loaders / spareparts
    name: 'New Model',
    emoji: '🛵',
    badge: 'NEW',            // NEW / BESTSELLER / FLAGSHIP / POPULAR / ''
    badgeClass: 'badge-new',
    specs: { 'Range':'80km', 'Speed':'60 km/h', 'Motor':'1500W', 'Charging':'5hrs' },
    batteries: [
      { label:'Standard', range:'80 km', price:59999, battery:'Lead Acid', warranty:'1 Year Battery' },
      { label:'Lithium',  range:'100 km', price:69999, battery:'Lithium',  warranty:'3 Year Battery' },
    ],
    colors: ['#111827', '#10b981'],
    image: 'images/scooters/sc5/main.jpg',
    gallery: ['images/scooters/sc5/photo1.jpg', 'images/scooters/sc5/photo2.jpg']
  },

NEED HELP?
──────────
For any questions about the website, contact your web developer.

╚══════════════════════════════════════════════════════════════════════╝
