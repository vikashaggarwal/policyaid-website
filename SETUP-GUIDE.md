# Policy Aid Website — Complete Setup Guide

## What You Have
| File | Purpose |
|------|---------|
| `index.html` | Your website — ready to deploy |
| `policyaid-backend.gs` | Google Apps Script — handles leads → Sheets + Email + WhatsApp |
| `logo.jpeg` | Your logo (copy your logo image here and rename it `logo.jpeg`) |

---

## PART 1 — Set Up Lead Collection (Do This First)

### Step 1: Create the Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) → **Create new spreadsheet**
2. Name it: `Policy Aid Leads`
3. Copy the Sheet ID from the URL bar:
   - URL looks like: `https://docs.google.com/spreadsheets/d/**1ABC...xyz**/edit`
   - The bold part is your Sheet ID

### Step 2: Set Up the Google Apps Script

1. Go to [script.google.com](https://script.google.com) → **New Project**
2. Name the project: `PolicyAid Backend`
3. Delete the default code and paste the entire contents of `policyaid-backend.gs`
4. Edit the **CONFIG section** at the top:
   ```
   SHEET_ID:  paste your Sheet ID from Step 1
   NOTIFY_EMAIL: policyaid@gmail.com  ✅ already set
   WA_PHONE: 919930140305  ✅ already set
   ```

### Step 3: Deploy the Script as a Web App

1. Click **Deploy** → **New Deployment**
2. Click the gear icon → Select **Web App**
3. Fill in:
   - Description: `PolicyAid Lead Handler`
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy** → **Authorize access** (allow Gmail + Sheets)
5. **Copy the Web App URL** — it looks like:
   `https://script.google.com/macros/s/AKfycb.../exec`

### Step 4: Paste the URL into Your Website

1. Open `index.html` in any text editor (Notepad, VS Code, etc.)
2. Find and replace **both** occurrences of:
   ```
   PASTE_YOUR_APPS_SCRIPT_URL_HERE
   ```
   with your actual Web App URL from Step 3

---

## PART 2 — Set Up WhatsApp Notifications (Free)

You'll receive a WhatsApp message every time someone fills the form.

1. **Add CallMeBot as a WhatsApp contact:**
   - Name: `CallMeBot`
   - Number: `+34 644 98 83 56`

2. **Send this exact message** to that number on WhatsApp:
   ```
   I allow callmebot to send me messages
   ```

3. **You'll receive an API key** (like `123456`) within seconds

4. **Add it to the Apps Script:**
   - In `policyaid-backend.gs`, find `CALLMEBOT_API_KEY`
   - Replace `PASTE_API_KEY_HERE` with your key
   - Click **Deploy → Manage Deployments → Edit → New Version → Deploy**

---

## PART 3 — Host on GitHub Pages (Free)

### Step 1: Create a GitHub Account
Go to [github.com](https://github.com) → Sign Up (if you don't have one)

### Step 2: Create a Repository

1. Click **+** (top-right) → **New repository**
2. Repository name: `policyaid-website`
   - *(Or use your domain name, e.g. `policyaid.in`)*
3. Set to **Public**
4. Click **Create repository**

### Step 3: Upload Your Files

1. On the repository page, click **Add file → Upload files**
2. Upload these files:
   - `index.html`
   - `logo.jpeg` *(your logo image, renamed to exactly this)*
3. Click **Commit changes**

### Step 4: Enable GitHub Pages

1. Go to your repository → **Settings** tab
2. Scroll to **Pages** (left sidebar)
3. Under **Source**, select:
   - Branch: `main`
   - Folder: `/ (root)`
4. Click **Save**

### Step 5: Your website is live! 🎉

GitHub will show a URL like:
`https://yourusername.github.io/policyaid-website`

**It takes 2–5 minutes to go live after first publish.**

---

## PART 4 — Connect a Custom Domain (Optional)

If you have a domain like `policyaid.in`:

### From your domain registrar (GoDaddy, BigRock, etc.):

Add these DNS records:
| Type | Name | Value |
|------|------|-------|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | yourusername.github.io |

### In GitHub Pages Settings:

1. Go to **Settings → Pages**
2. Under **Custom domain**, type your domain (e.g. `policyaid.in`)
3. Check **Enforce HTTPS**
4. DNS propagation takes 10–60 minutes

---

## PART 5 — Test Everything

Once live, test your setup:

1. Go to your website URL
2. Fill in the **Get Free Quote** form with a test name and your own phone number
3. Check that:
   - ✅ Website shows the success message
   - ✅ A row appears in your Google Sheet (`Quotes` tab)
   - ✅ You receive an email at policyaid@gmail.com
   - ✅ You receive a WhatsApp message on +91 99301 40305

---

## Quick Reference

| What | Where |
|------|-------|
| View leads | Google Sheets → Policy Aid Leads |
| Edit website | GitHub → upload new `index.html` |
| Update script | script.google.com → Edit → Deploy → New Version |
| WhatsApp button | Links to wa.me/919930140305 |
| Contact number | +91 99301 40305 |
| Contact email | policyaid@gmail.com |

---

## Need Help?

If anything doesn't work, the most common fixes are:
- **No leads in Sheet?** → Make sure you deployed with "Anyone" access in the script
- **No email?** → Re-authorise Gmail in the Apps Script permissions
- **Website not updating?** → GitHub Pages caches for a few minutes; hard-refresh (Ctrl+Shift+R)
- **Logo not showing?** → Make sure your logo file is named exactly `logo.jpeg` and uploaded alongside `index.html`
