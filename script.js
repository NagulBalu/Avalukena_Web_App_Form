/* ===========================================================
   Avalukena – Offer form (front-end only)
   Sections: config • helpers • storage • counter • form rules
             • submit/result • offer card (canvas)
   =========================================================== */
"use strict";

/* ---------- 1. CONFIG ---------- */
const CONFIG = {
  shop: {
    name: "Avalukena",
    tagline: "WOVEN FOR HER SOUL",
    footLine: "Stay Beautiful • Stay Stylish • Stay You",
    address: "Manaparaipatty Road, Near Uthayam Theatre, Manaparai - 621306",
    contact: "Contact: 8344160691  |  9344960691",
    instagram: "https://www.instagram.com/_avalukena____?mdxt=ZDRxdDUyZW9wMm1u",
  },
  offer: {
    text: "20% OFF",
    codePrefix: "AVA20",
    validLabel: "OFFER VALID",
    validDates: "01 – 08 NOVEMBER 2026",
  },
  keys: {
    count: "avalukena_scan_count",
    visit: "avalukena_visit_counted",
    claims: "avalukena_used_phones",
  },
};

const COLORS = {
  maroon: "#4a0f14",
  maroon2: "#6b1a22",
  cream: "#fbe9d6",
  gold: "#a9801f",
  gold2: "#c9a24a",
  muted: "#6b4a4c",
};

/* ---------- 2. HELPERS ---------- */
const $ = (id) => document.getElementById(id);

const el = {
  form: $("offerForm"),
  name: $("name"),
  phone: $("phone"),
  work: $("work"),
  submit: $("submitBtn"),
  formSection: $("formSection"),
  resultSection: $("resultSection"),
  canvas: $("offerCanvas"),
  download: $("downloadBtn"),
  share: $("shareBtn"),
  again: $("againBtn"),
  hint: $("dlHint"),
  logoImg: $("logoImg"),
  logoRound: $("logoRound"),
  scanCount: $("scanCount"),
};
const ctx = el.canvas.getContext("2d");

const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((resolve) => setTimeout(resolve, ms))]);

/** Safe storage: uses localStorage, falls back to memory if the browser blocks it. */
const store = {
  mem: {},
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) return JSON.parse(raw);
    } catch (_) { /* blocked or corrupt */ }
    return key in this.mem ? this.mem[key] : fallback;
  },
  set(key, value) {
    this.mem[key] = value;
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* ignore */ }
  },
};

/** Random coupon code like AVA20-K7P2 (no confusing 0/O/1/I characters). */
function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint32Array(4);
  (window.crypto || window.msCrypto).getRandomValues(bytes);
  const part = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `${CONFIG.offer.codePrefix}-${part}`;
}

/* ---------- 3. LOGO ---------- */
el.logoImg.addEventListener("error", () => el.logoRound.classList.add("no-img"));

const cardLogo = new Image();
let cardLogoOK = false;
const logoReady = new Promise((resolve) => {
  cardLogo.onload = () => { cardLogoOK = true; resolve(); };
  cardLogo.onerror = resolve;
});
cardLogo.src = (typeof LOGO_DATA === "string" && LOGO_DATA) || "logo.png";

/* ---------- 4. SCAN COUNTER ----------
   Front-end only → counted in this browser (localStorage).
   A visit is counted once per session, so refreshing does not add again. */
function initCounter() {
  let count = Number(store.get(CONFIG.keys.count, 0)) || 0;
  let counted = false;
  try { counted = !!sessionStorage.getItem(CONFIG.keys.visit); } catch (_) { /* ignore */ }

  if (!counted) {
    count += 1;
    store.set(CONFIG.keys.count, count);
    try { sessionStorage.setItem(CONFIG.keys.visit, "1"); } catch (_) { /* ignore */ }
  }
  animateNumber(el.scanCount, count);
}

function animateNumber(node, target) {
  const duration = 1200;
  const start = performance.now();
  const tick = (now) => {
    const p = Math.min((now - start) / duration, 1);
    node.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString("en-IN");
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ---------- 5. ONE PHONE NUMBER = ONE OFFER ----------
   Saved in this browser only (a real server is needed to block other devices). */
const claims = {
  all: () => store.get(CONFIG.keys.claims, {}),
  has: (phone) => Object.prototype.hasOwnProperty.call(claims.all(), phone),
  add(phone, name, code) {
    const all = claims.all();
    all[phone] = { name, code, at: new Date().toISOString() };
    store.set(CONFIG.keys.claims, all);
  },
};

/* ---------- 6. FORM RULES ---------- */
/** NAME: CAPITAL letters A–Z and single spaces only. */
function sanitizeName(raw) {
  const upper = raw.toUpperCase();
  const value = upper.replace(/[^A-Z ]/g, "").replace(/^ +/, "").replace(/ {2,}/g, " ");
  const removedInvalid = upper.replace(/ /g, "").length !== value.replace(/ /g, "").length;
  return { value, removedInvalid };
}

/** PHONE: digits only, max 10. A pasted "+91 98765 43210" is cleaned up too. */
function sanitizePhone(raw) {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  return digits.slice(0, 10);
}

const rules = {
  name(v) {
    if (!v) return "Please enter your name.";
    if (!/^[A-Z]+( [A-Z]+)*$/.test(v)) return "Only capital letters (A–Z) are allowed.";
    if (v.length < 2) return "Name is too short.";
    return "";
  },
  phone(v) {
    if (!/^\d{10}$/.test(v)) return "Phone number must be exactly 10 digits.";
    if (claims.has(v)) return "This phone number has already used the offer.";
    return "";
  },
  work(v) {
    return v.length < 2 ? "Please enter your working place." : "";
  },
};

const fields = [
  { input: el.name, errId: "nameErr", rule: rules.name },
  { input: el.phone, errId: "phoneErr", rule: rules.phone },
  { input: el.work, errId: "workErr", rule: rules.work },
];

function setError(input, errId, message) {
  $(errId).textContent = message;
  input.classList.toggle("invalid", !!message);
  input.setAttribute("aria-invalid", message ? "true" : "false");
  return !message;
}

/** Validates every field; focuses the first wrong one. */
function validateAll() {
  let firstBad = null;
  fields.forEach(({ input, errId, rule }) => {
    const ok = setError(input, errId, rule(input.value.trim()));
    if (!ok && !firstBad) firstBad = input;
  });
  if (firstBad) firstBad.focus();
  return !firstBad;
}

function clearErrors() {
  fields.forEach(({ input, errId }) => setError(input, errId, ""));
}

el.name.addEventListener("input", () => {
  const { value, removedInvalid } = sanitizeName(el.name.value);
  if (el.name.value !== value) el.name.value = value;
  setError(el.name, "nameErr", removedInvalid ? "Only capital letters (A–Z) are allowed." : "");
});

el.phone.addEventListener("input", () => {
  el.phone.value = sanitizePhone(el.phone.value);
  setError(el.phone, "phoneErr", "");
  // tell the person immediately when a full number was already used
  if (el.phone.value.length === 10 && claims.has(el.phone.value)) {
    setError(el.phone, "phoneErr", "This phone number has already used the offer.");
  }
});

el.work.addEventListener("input", () => setError(el.work, "workErr", ""));

/* ---------- 7. SUBMIT → RESULT ---------- */
el.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validateAll()) return;

  const name = el.name.value.trim();
  const phone = el.phone.value.trim();
  const code = makeCode();

  setBusy(true);
  try {
    await withTimeout(
      Promise.all([
        document.fonts.load('700 60px "Playfair Display"'),
        document.fonts.load('80px "Great Vibes"'),
        document.fonts.load('500 30px "Poppins"'),
        logoReady,
      ]).catch(() => {}),
      3000
    );

    drawOfferCard(name, code);
    claims.add(phone, name, code);
    showResult(name);
  } finally {
    setBusy(false);
  }
});

function setBusy(busy) {
  el.submit.disabled = busy;
  el.submit.textContent = busy ? "Creating your card…" : "Get My 20% Offer ✨";
}

function showResult(name) {
  el.download.dataset.name = name;
  el.hint.textContent = "To get this offer, follow our Instagram page 📸 (opens after download)";
  el.formSection.classList.add("hidden");
  el.resultSection.classList.remove("hidden");
  el.download.focus({ preventScroll: true });
}

function showForm() {
  el.form.reset();
  clearErrors();
  el.hint.textContent = "";
  el.resultSection.classList.add("hidden");
  el.formSection.classList.remove("hidden");
  el.name.focus({ preventScroll: true });
}

el.again.addEventListener("click", showForm);

/* ---------- 8. DOWNLOAD + SHARE ---------- */
const cardFileName = () =>
  `Avalukena-offer-${(el.download.dataset.name || "card").replace(/\s+/g, "-")}.png`;

function cardBlob() {
  return new Promise((resolve, reject) => {
    try {
      el.canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("empty"))), "image/png");
    } catch (err) { reject(err); }
  });
}

const LOCAL_FILE_HINT =
  "Please take a screenshot of the card (download and share work once the page is hosted online).";

el.download.addEventListener("click", async () => {
  try {
    const url = URL.createObjectURL(await cardBlob());
    const a = document.createElement("a");
    a.href = url;
    a.download = cardFileName();
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch (_) {
    el.hint.textContent = LOCAL_FILE_HINT;
  }
  goToInstagramSoon();               // download started → open our Instagram page
});

/** Opens Instagram a moment after the download starts.
 *  Uses a normal page navigation (phones block delayed pop-up tabs, but never block this).
 *  The image is already saved by then, and a tappable link is shown as a backup. */
let igTimer = null;
function goToInstagramSoon() {
  showInstagramLink();
  clearTimeout(igTimer);
  igTimer = setTimeout(() => { window.location.href = CONFIG.shop.instagram; }, 2000);
}

function showInstagramLink() {
  el.hint.textContent = "";
  const link = document.createElement("a");
  link.href = CONFIG.shop.instagram;
  link.rel = "noopener";
  link.textContent = "📸 Opening Instagram… tap here if it doesn't open";
  link.style.cssText = "color:inherit;font-weight:600;text-decoration:underline";
  el.hint.append("Card saved! ", link);
}

/* The Share button appears only on browsers that can share image files (most phones). */
const canShareFiles = () => {
  try {
    return !!navigator.canShare && navigator.canShare({ files: [new File([""], "a.png", { type: "image/png" })] });
  } catch (_) { return false; }
};
if (canShareFiles()) el.share.hidden = false;

el.share.addEventListener("click", async () => {
  try {
    const file = new File([await cardBlob()], cardFileName(), { type: "image/png" });
    await navigator.share({
      files: [file],
      title: "Avalukena – 20% Offer",
      text: `I got a 20% offer at ${CONFIG.shop.name}!`,
    });
  } catch (err) {
    if (err && err.name !== "AbortError") el.hint.textContent = LOCAL_FILE_HINT;
  }
});

/* ---------- 9. OFFER CARD (canvas 900 × 1440) ---------- */
function drawOfferCard(name, code) {
  const { width: W, height: H } = el.canvas;
  const cx = W / 2;

  ctx.clearRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  drawBackground(W, H);
  drawLogo(cx, 215, 125);
  drawShopHeading(cx);
  drawGreeting(cx, name);
  drawOfferPill(cx, 835);
  drawValidity(cx);
  drawCode(cx, code);
  drawShopDetails(cx);
}

function drawBackground(W, H) {
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#fff3e2");
  bg.addColorStop(1, "#f6dcc0");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = COLORS.gold2;
  ctx.lineWidth = 6;
  roundRect(24, 24, W - 48, H - 48, 36); ctx.stroke();
  ctx.lineWidth = 2;
  roundRect(44, 44, W - 88, H - 88, 26); ctx.stroke();
}

function drawLogo(cx, cy, r) {
  ctx.save();
  ctx.shadowColor = "rgba(74,15,20,.35)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  ctx.beginPath(); ctx.arc(cx, cy, r + 8, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.gold2; ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = COLORS.cream;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  if (cardLogoOK) {
    ctx.drawImage(cardLogo, cx - r, cy - r, r * 2, r * 2); // logo.png is already tightly cropped
  } else {
    ctx.fillStyle = COLORS.maroon;
    ctx.font = '700 150px "Playfair Display", serif';
    ctx.fillText("A", cx, cy + 52);
  }
  ctx.restore();
}

function drawShopHeading(cx) {
  ctx.fillStyle = COLORS.maroon;
  ctx.font = '700 84px "Playfair Display", serif';
  ctx.fillText(CONFIG.shop.name, cx, 440);

  ctx.fillStyle = COLORS.gold;
  ctx.font = '500 24px "Poppins", sans-serif';
  spacedText(CONFIG.shop.tagline, cx, 485, 7);

  drawDivider(cx, 525);
}

function drawGreeting(cx, name) {
  ctx.fillStyle = COLORS.gold;
  ctx.font = '90px "Great Vibes", cursive';
  ctx.fillText("Congratulations", cx, 640);

  fitText(name, cx, 745, 720, 84, '700 {s}px "Playfair Display", serif', COLORS.maroon);

  ctx.fillStyle = COLORS.muted;
  ctx.font = '500 30px "Poppins", sans-serif';
  ctx.fillText("You got", cx, 810);
}

function drawOfferPill(cx, y) {
  const w = 520, h = 150;
  const g = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
  g.addColorStop(0, COLORS.maroon);
  g.addColorStop(1, COLORS.maroon2);

  ctx.save();
  ctx.shadowColor = "rgba(74,15,20,.35)";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = g;
  roundRect(cx - w / 2, y, w, h, 75); ctx.fill();
  ctx.restore();

  ctx.strokeStyle = COLORS.gold2;
  ctx.lineWidth = 3;
  roundRect(cx - w / 2 + 8, y + 8, w - 16, h - 16, 67); ctx.stroke();

  ctx.fillStyle = COLORS.cream;
  ctx.font = '700 84px "Playfair Display", serif';
  ctx.fillText(CONFIG.offer.text, cx, y + 100);
}

function drawValidity(cx) {
  ctx.fillStyle = COLORS.gold;
  ctx.font = '500 22px "Poppins", sans-serif';
  spacedText(CONFIG.offer.validLabel, cx, 1045, 6);

  ctx.fillStyle = COLORS.maroon;
  ctx.font = '700 46px "Playfair Display", serif';
  ctx.fillText(CONFIG.offer.validDates, cx, 1100);
}

function drawCode(cx, code) {
  ctx.fillStyle = COLORS.maroon;
  ctx.font = '600 30px "Poppins", sans-serif';
  ctx.fillText("Code: " + code, cx, 1160);

  ctx.fillStyle = COLORS.muted;
  ctx.font = '400 24px "Poppins", sans-serif';
  ctx.fillText("Follow our Instagram page & show this card at the shop", cx, 1198);
}

function drawShopDetails(cx) {
  ctx.strokeStyle = COLORS.gold2;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx - 300, 1232); ctx.lineTo(cx + 300, 1232); ctx.stroke();

  fitText(CONFIG.shop.address, cx, 1278, 780, 25, '500 {s}px "Poppins", sans-serif', COLORS.maroon);
  fitText(CONFIG.shop.contact, cx, 1320, 780, 28, '600 {s}px "Poppins", sans-serif', COLORS.maroon);

  ctx.fillStyle = COLORS.gold;
  ctx.font = '500 25px "Poppins", sans-serif';
  ctx.fillText(CONFIG.shop.footLine, cx, 1368);
}

/* ---------- canvas helpers ---------- */
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function spacedText(text, cx, y, spacing) {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width + spacing);
  const total = widths.reduce((a, b) => a + b, 0) - spacing;
  let x = cx - total / 2;
  ctx.textAlign = "left";
  chars.forEach((c, i) => { ctx.fillText(c, x, y); x += widths[i]; });
  ctx.textAlign = "center";
}

/** Draws text and shrinks the font until it fits maxW. fontTpl uses {s} for the size. */
function fitText(text, x, y, maxW, startSize, fontTpl, color) {
  let size = startSize;
  do {
    ctx.font = fontTpl.replace("{s}", size);
    size -= 2;
  } while (ctx.measureText(text).width > maxW && size > 14);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function drawDivider(cx, y) {
  ctx.strokeStyle = COLORS.gold2;
  ctx.lineWidth = 3;
  [[-300, -50], [50, 300]].forEach(([a, b]) => {
    ctx.beginPath(); ctx.moveTo(cx + a, y); ctx.lineTo(cx + b, y); ctx.stroke();
  });
  ctx.fillStyle = COLORS.gold;
  ctx.font = '40px "Poppins", sans-serif';
  ctx.fillText("✿", cx, y + 14);
}

/* ---------- START ---------- */
initCounter();
