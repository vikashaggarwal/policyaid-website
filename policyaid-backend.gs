/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  POLICY AID — Google Apps Script Backend
 *  Handles leads from website → Sheets + Email + WhatsApp
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 *  SETUP STEPS (one time):
 *  1. Go to https://script.google.com → New Project
 *  2. Paste this entire file
 *  3. Edit the CONFIG section below with your details
 *  4. Click Deploy → New Deployment → Web App
 *     → Execute as: Me
 *     → Who has access: Anyone
 *  5. Copy the web app URL
 *  6. Paste it into index.html (replace PASTE_YOUR_APPS_SCRIPT_URL_HERE)
 *
 *  WHATSAPP SETUP (CallMeBot — free):
 *  1. Add +34 644 98 83 56 as a WhatsApp contact
 *  2. Send this message to that number:
 *     "I allow callmebot to send me messages"
 *  3. You'll receive an API key (e.g. "123456")
 *  4. Paste it in CALLMEBOT_API_KEY below
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

// ── CONFIG (edit these) ────────────────────────
const CONFIG = {
  // Your email for lead notifications
  NOTIFY_EMAIL: 'policyaid@gmail.com',

  // Google Sheet ID (from sheet URL: .../spreadsheets/d/SHEET_ID/edit)
  SHEET_ID: '1_wHOpHYkoBzhhot0pjuwL2AFnKijrZJcRxn_eeGjhmY',

  // Sheet tab names
  QUOTE_SHEET:   'Quotes',
  CONTACT_SHEET: 'ContactMessages',

  // ── Admin WhatsApp via CallMeBot (free) ──
  WA_PHONE:          '919930140305',      // admin number, no +
  CALLMEBOT_API_KEY: 'PASTE_API_KEY_HERE',

  // ── Meta WhatsApp Cloud API (for sending to leads) ──
  META_WA_TOKEN:       'PASTE_META_TOKEN_HERE',    // from Meta Developer Console
  META_PHONE_NUMBER_ID:'PASTE_PHONE_NUMBER_ID_HERE',// from Meta Developer Console
  META_TEMPLATE_NAME:  'policy_aid_quote_ack',     // template name you create in Meta

  // Business name
  BIZ_NAME: 'Policy Aid'
};
// ──────────────────────────────────────────────

/**
 * Handles both GET and POST requests from the website form.
 */
function doGet(e)  { return handleRequest(e.parameter); }
function doPost(e) {
  const params = e.postData
    ? Object.assign({}, e.parameter, parseFormBody(e.postData.contents))
    : e.parameter;
  return handleRequest(params);
}

function parseFormBody(body) {
  const out = {};
  if (!body) return out;
  body.split('&').forEach(pair => {
    const [k, v] = pair.split('=').map(decodeURIComponent);
    if (k) out[k] = v || '';
  });
  return out;
}

function handleRequest(p) {
  try {
    // ── DEDUPLICATION: ignore same submission within 15 seconds ──
    const cache = CacheService.getScriptCache();
    const key   = (p.form_type || '') + '_' + (p.mobile || '') + '_' + (p.name || '').substring(0,5);
    if (cache.get(key)) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'duplicate' })).setMimeType(ContentService.MimeType.JSON);
    }
    cache.put(key, '1', 15); // block duplicates for 15 seconds

    if (p.form_type === 'quote') {
      saveQuoteLead(p);
    } else if (p.form_type === 'contact') {
      saveContactMessage(p);
    }
  } catch(err) {
    Logger.log('Error: ' + err.toString());
  }

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── QUOTE LEAD ─────────────────────────────────
function saveQuoteLead(p) {
  const sheet = getOrCreateSheet(CONFIG.QUOTE_SHEET, [
    'Timestamp', 'Name', 'Mobile', 'Insurance Type',
    // Health
    'Sum Insured', 'Family Members', 'Eldest Age',
    // Motor
    'Reg. Number', 'Claim Made', 'Renewal Date',
    // Travel
    'Destination', 'Travel Days', 'Travellers',
    // Common
    'City', 'Source'
  ]);

  sheet.appendRow([
    p.timestamp      || new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'}),
    p.name           || '',
    p.mobile         || '',
    p.insurance_type || '',
    // Health
    p.sum_insured    || '',
    p.family_members || '',
    p.eldest_age     || '',
    // Motor
    p.reg_number     || '',
    p.claim_made     || '',
    p.renewal_date   || '',
    // Travel
    p.destination    || '',
    p.travel_days    || '',
    p.travel_members || '',
    // Common
    p.city           || '',
    'Quick Quote Form'
  ]);

  // ── Build product-specific detail lines ──
  const type = (p.insurance_type || '').toLowerCase();
  let extraEmail = '';
  let extraWA    = '';

  if(type.includes('health') && p.sum_insured) {
    extraEmail = `\nSum Insured:    ${p.sum_insured}\nFamily Members: ${p.family_members || 'N/A'}\nEldest Age:     ${p.eldest_age || 'N/A'}`;
    extraWA    = `\n💰 ${p.sum_insured} · 👨‍👩‍👧 ${p.family_members || '?'} members · 🎂 Age ${p.eldest_age || '?'}`;
  } else if(type.includes('motor') && p.reg_number) {
    extraEmail = `\nReg. Number:    ${p.reg_number}\nClaim Made:     ${p.claim_made || 'N/A'}\nRenewal Date:   ${p.renewal_date || 'N/A'}`;
    extraWA    = `\n🚗 ${p.reg_number} · Claim: ${p.claim_made || 'N/A'} · Renewal: ${p.renewal_date || 'N/A'}`;
  } else if(type.includes('travel') && p.destination) {
    extraEmail = `\nDestination:    ${p.destination}\nTravel Days:    ${p.travel_days || 'N/A'}\nTravellers:     ${p.travel_members || 'N/A'}`;
    extraWA    = `\n🌍 ${p.destination} · 📅 ${p.travel_days || '?'} days · 👥 ${p.travel_members || '?'} travellers`;
  }

  // ── Email ──
  const subject = `🛡️ New Quote – ${p.insurance_type || 'Insurance'} – ${CONFIG.BIZ_NAME}`;
  const body =
    `New insurance quote request!\n\n` +
    `Name:           ${p.name || 'N/A'}\n` +
    `Mobile:         ${p.mobile || 'N/A'}\n` +
    `Insurance Type: ${p.insurance_type || 'N/A'}` +
    extraEmail + `\n` +
    `City:           ${p.city || 'N/A'}\n` +
    `Time:           ${p.timestamp || 'now'}\n\n` +
    `View all leads: https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}`;
  sendEmail(subject, body);

  // ── WhatsApp ──
  const waMsg =
    `🛡️ *New Lead – ${CONFIG.BIZ_NAME}*\n` +
    `👤 ${p.name || 'N/A'}\n` +
    `📱 ${p.mobile || 'N/A'}\n` +
    `📋 ${p.insurance_type || 'N/A'}` +
    extraWA + `\n` +
    `📍 ${p.city || 'N/A'}`;
  sendWhatsApp(waMsg);

  // ── WhatsApp to lead (Meta Cloud API) ──
  sendWhatsAppToLead(p.mobile, p.name, p.insurance_type);
}

// ── CONTACT MESSAGE ─────────────────────────────
function saveContactMessage(p) {
  const sheet = getOrCreateSheet(CONFIG.CONTACT_SHEET,
    ['Timestamp', 'Name', 'Mobile', 'Email', 'Enquiry Type', 'Message']);

  sheet.appendRow([
    p.timestamp || new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'}),
    p.name || '',
    p.mobile || '',
    p.email || '',
    p.enquiry_type || '',
    p.message || ''
  ]);

  // Email notification
  const subject = `📩 New Contact Form – ${CONFIG.BIZ_NAME}`;
  const body =
    `New contact form submission!\n\n` +
    `Name:    ${p.name || 'N/A'}\n` +
    `Mobile:  ${p.mobile || 'N/A'}\n` +
    `Email:   ${p.email || 'N/A'}\n` +
    `Topic:   ${p.enquiry_type || 'N/A'}\n` +
    `Message: ${p.message || 'N/A'}\n` +
    `Time:    ${p.timestamp || 'now'}\n\n` +
    `View all messages: https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}`;
  sendEmail(subject, body);

  // WhatsApp notification
  const waMsg =
    `📩 *Contact Form – ${CONFIG.BIZ_NAME}*\n` +
    `👤 ${p.name || 'N/A'}\n` +
    `📱 ${p.mobile || 'N/A'}\n` +
    `📋 ${p.enquiry_type || 'N/A'}\n` +
    `💬 ${(p.message || '').substring(0, 100)}`;
  sendWhatsApp(waMsg);
}

// ── HELPERS ────────────────────────────────────
function sendEmail(subject, body) {
  try {
    GmailApp.sendEmail(CONFIG.NOTIFY_EMAIL, subject, body, {
      name: CONFIG.BIZ_NAME + ' Website'
    });
  } catch(e) {
    Logger.log('Email error: ' + e);
  }
}

function sendWhatsApp(message) {
  if (!CONFIG.CALLMEBOT_API_KEY || CONFIG.CALLMEBOT_API_KEY === 'PASTE_API_KEY_HERE') return;
  try {
    const url = 'https://api.callmebot.com/whatsapp.php'
      + '?phone=' + CONFIG.WA_PHONE
      + '&text=' + encodeURIComponent(message)
      + '&apikey=' + CONFIG.CALLMEBOT_API_KEY;
    UrlFetchApp.fetch(url);
  } catch(e) {
    Logger.log('WhatsApp error: ' + e);
  }
}

// ── WHATSAPP TO LEAD via Meta Cloud API ────────
function sendWhatsAppToLead(phone, name, insuranceType) {
  if (!CONFIG.META_WA_TOKEN || CONFIG.META_WA_TOKEN === 'PASTE_META_TOKEN_HERE') return;
  try {
    // Normalise phone to E.164 (91XXXXXXXXXX)
    let p = phone.replace(/\D/g, '');
    if (p.length === 10) p = '91' + p;

    const url     = 'https://graph.facebook.com/v19.0/' + CONFIG.META_PHONE_NUMBER_ID + '/messages';
    const payload = {
      messaging_product: 'whatsapp',
      to: p,
      type: 'template',
      template: {
        name: CONFIG.META_TEMPLATE_NAME,
        language: { code: 'en_IN' },
        components: [{
          type: 'body',
          parameters: [
            { type: 'text', text: name          || 'there'    },
            { type: 'text', text: insuranceType || 'insurance'}
          ]
        }]
      }
    };

    UrlFetchApp.fetch(url, {
      method:      'post',
      contentType: 'application/json',
      headers:     { Authorization: 'Bearer ' + CONFIG.META_WA_TOKEN },
      payload:     JSON.stringify(payload),
      muteHttpExceptions: true
    });
    Logger.log('WhatsApp sent to lead: ' + p);
  } catch(e) {
    Logger.log('Meta WA error: ' + e);
  }
}

function getOrCreateSheet(name, headers) {
  const ss    = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  let sheet   = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#3AB5C8')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}
