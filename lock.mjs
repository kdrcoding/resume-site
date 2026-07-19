/*
 * lock.mjs — encrypt resume-plain.html into a password-protected index.html.
 *
 * Reads the plaintext résumé (resume-plain.html), AES-GCM encrypts the
 * résumé body with a key derived from your password (PBKDF2, 200k rounds),
 * and writes a locked index.html that shows only a password prompt until
 * the correct password is entered in the browser.
 *
 * The password comes from the RESUME_PW environment variable (set by
 * lock-resume.bat). Run `lock-resume.bat`, not this file directly.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { webcrypto, createHash } from "node:crypto";

const { subtle } = webcrypto;
const getRandomValues = (arr) => webcrypto.getRandomValues(arr);

const PW = process.env.RESUME_PW;
if (!PW) {
  console.error("ERROR: no password provided. Run lock-resume.bat instead.");
  process.exit(1);
}

const SRC = "resume-plain.html";
const OUT = "index.html";
const ITERATIONS = 200000;

const html = readFileSync(SRC, "utf8");

function between(str, start, end) {
  const i = str.indexOf(start);
  const j = str.indexOf(end);
  if (i < 0 || j < 0) {
    console.error(`ERROR: marker not found in ${SRC}: ${i < 0 ? start : end}`);
    console.error("Make sure the SPRITE and RESUME markers are intact.");
    process.exit(1);
  }
  return str.slice(i + start.length, j).trim();
}

const styleMatch = html.match(/<style[\s\S]*?<\/style>/i);
if (!styleMatch) {
  console.error("ERROR: no <style> block found in " + SRC);
  process.exit(1);
}
const styleBlock = styleMatch[0];
const sprite = between(html, "<!-- SPRITE:START -->", "<!-- SPRITE:END -->");
const resume = between(html, "<!-- RESUME:START -->", "<!-- RESUME:END -->");

const enc = new TextEncoder();
const salt = getRandomValues(new Uint8Array(16));
const iv = getRandomValues(new Uint8Array(12));

const keyMaterial = await subtle.importKey(
  "raw",
  enc.encode(PW),
  "PBKDF2",
  false,
  ["deriveKey"]
);
const key = await subtle.deriveKey(
  { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
  keyMaterial,
  { name: "AES-GCM", length: 256 },
  false,
  ["encrypt"]
);
const ctBuf = await subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(resume));

const b64 = (u8) => Buffer.from(u8).toString("base64");
const payload = JSON.stringify({
  v: 1,
  iter: ITERATIONS,
  salt: b64(salt),
  iv: b64(iv),
  ct: b64(new Uint8Array(ctBuf)),
});

const unlockVer = createHash("sha256")
  .update(readFileSync("unlock.js"))
  .digest("hex")
  .slice(0, 8);

const lockStyles = `
/* --- password lock screen --- */
#resumeMount[hidden]{display:none;}
.lock{position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1.5rem;background:radial-gradient(1100px 560px at 50% -12%,rgba(45,125,154,0.22),transparent 62%),radial-gradient(700px 400px at 100% 100%,rgba(232,168,56,0.08),transparent 55%),var(--bg-body);}
.lock svg{fill:currentColor;}
.lock-theme{position:absolute;top:1rem;right:1rem;display:inline-flex;align-items:center;gap:.45rem;padding:.45rem .75rem;border:1px solid var(--border);border-radius:999px;background:var(--bg-card);color:var(--text-secondary);font-size:.78rem;font-weight:500;font-family:inherit;cursor:pointer;transition:border-color var(--transition),background var(--transition),color var(--transition);}
.lock-theme:hover{border-color:var(--accent);color:var(--accent);}
.lock-theme .icon{width:16px;height:16px;}
.lock-card{position:relative;background:var(--bg-card);border:1px solid var(--border);border-radius:calc(var(--radius) + 4px);box-shadow:0 24px 60px rgba(11,26,42,0.18);padding:2.2rem 2rem 1.85rem;max-width:430px;width:100%;text-align:center;animation:lockIn .5s cubic-bezier(.2,.7,.2,1);}
.lock-card.is-shake{animation:lockShake .42s ease;}
@keyframes lockIn{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:none;}}
@keyframes lockShake{0%,100%{transform:translateX(0);}20%,60%{transform:translateX(-6px);}40%,80%{transform:translateX(6px);}}
.lock-brand{font-family:var(--font-sans);font-size:.95rem;font-weight:700;letter-spacing:.04em;color:var(--text-primary);margin-bottom:1rem;}
.lock-brand span{color:var(--accent);}
.lock-badge{width:64px;height:64px;margin:0 auto 1rem;border-radius:50%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--accent),var(--accent-dark));box-shadow:0 10px 24px rgba(45,125,154,0.40);}
.lock-badge svg{width:28px;height:28px;color:#fff;}
.lock-card h1{font-size:1.35rem;color:var(--text-primary);letter-spacing:-0.02em;margin-bottom:.35rem;}
.lock-sub{color:var(--text-muted);font-size:.88rem;line-height:1.55;margin-bottom:1.35rem;}
.lock-form{display:flex;flex-direction:column;gap:.65rem;text-align:left;}
.lock-label{font-size:.78rem;font-weight:600;color:var(--text-secondary);letter-spacing:.02em;}
.lock-field{position:relative;display:flex;align-items:center;}
.lock-field__icon{position:absolute;left:.85rem;width:18px;height:18px;color:var(--text-muted);pointer-events:none;}
.lock-form input{width:100%;padding:.82rem 4.2rem .82rem 2.55rem;border:1px solid var(--border);border-radius:var(--radius-btn);background:var(--bg-soft);color:var(--text-primary);font-size:1rem;font-family:inherit;transition:border-color var(--transition),box-shadow var(--transition);}
.lock-form input:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px rgba(45,125,154,0.20);}
.lock-form input:disabled{opacity:.65;}
.lock-toggle{position:absolute;right:.45rem;padding:.35rem .55rem;border:0;border-radius:6px;background:transparent;color:var(--accent);font-size:.74rem;font-weight:600;font-family:inherit;cursor:pointer;}
.lock-toggle:hover{background:rgba(45,125,154,0.10);}
.lock-submit{margin-top:.1rem;padding:.85rem;border:0;border-radius:var(--radius-btn);background:linear-gradient(135deg,var(--accent),var(--accent-dark));color:#fff;font-weight:600;font-size:.98rem;font-family:inherit;cursor:pointer;transition:filter var(--transition),transform var(--transition),opacity var(--transition);}
.lock-submit:hover:not(:disabled){filter:brightness(1.09);}
.lock-submit:active:not(:disabled){transform:translateY(1px);}
.lock-submit:disabled{opacity:.72;cursor:wait;}
.lock-submit.is-loading{position:relative;}
.lock-error{color:#e5484d;font-size:.84rem;min-height:1.15em;text-align:center;}
.lock-divider{display:flex;align-items:center;gap:.75rem;margin:1.5rem 0 1rem;color:var(--text-muted);font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.09em;}
.lock-divider::before,.lock-divider::after{content:"";flex:1;height:1px;background:var(--border);}
.lock-contact{display:flex;flex-direction:column;gap:.5rem;}
.lock-contact a{display:flex;align-items:center;gap:.7rem;padding:.62rem .85rem;border:1px solid var(--border);border-radius:var(--radius-btn);background:var(--bg-soft);color:var(--text-secondary);text-decoration:none;font-size:.86rem;transition:border-color var(--transition),background var(--transition),transform var(--transition);}
.lock-contact a:hover{border-color:var(--accent);background:var(--bg-card);transform:translateY(-1px);}
.lock-contact a svg{width:18px;height:18px;color:var(--accent);flex-shrink:0;}
.lock-contact a span{font-weight:500;}
.lock-foot{margin-top:1.15rem;font-size:.78rem;color:var(--text-muted);line-height:1.5;}
@media(max-width:480px){.lock{padding:1rem;}.lock-card{padding:1.75rem 1.35rem 1.5rem;}.lock-theme{top:.65rem;right:.65rem;}}
`;

const lockHtml = [
  '  <div class="lock" id="lockScreen">',
  '    <button type="button" class="lock-theme" id="lockThemeToggle" aria-label="Toggle color theme">',
  '      <svg class="icon" data-theme-icon aria-hidden="true"><use href="#i-moon"/></svg>',
  '      <span data-theme-label>Dark</span>',
  '    </button>',
  '    <div class="lock-card">',
  '      <div class="lock-brand">KDR <span>Coding</span></div>',
  '      <div class="lock-badge"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 1a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5zm-3 8V6a3 3 0 0 1 6 0v3H9z"/></svg></div>',
  "      <h1>Protected Résumé</h1>",
  '      <p class="lock-sub">Private résumé for recruiters and hiring managers. Enter the access password shared with you.</p>',
  '      <form class="lock-form" id="lockForm" autocomplete="off">',
  '        <label class="lock-label" for="pw">Access password</label>',
  '        <div class="lock-field">',
  '          <svg class="lock-field__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 1a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5zm-3 8V6a3 3 0 0 1 6 0v3H9z"/></svg>',
  '          <input type="password" id="pw" name="password" placeholder="Enter password" aria-label="Password" autocomplete="current-password" required />',
  '          <button type="button" class="lock-toggle" id="togglePw" aria-pressed="false" aria-label="Show password"><span data-label>Show</span></button>',
  "        </div>",
  '        <button type="submit" class="lock-submit" id="lockSubmit"><span data-label>Unlock résumé</span></button>',
  '        <div class="lock-error" id="lockError" role="alert" aria-live="polite"></div>',
  "      </form>",
  '      <div class="lock-divider">Need the password?</div>',
  '      <div class="lock-contact">',
  '        <a href="mailto:kadir@kdrcoding.com"><svg aria-hidden="true"><use href="#i-mail"/></svg><span>kadir@kdrcoding.com</span></a>',
  '        <a href="https://linkedin.com/in/kadir-ravshanov-961994187" target="_blank" rel="noopener noreferrer"><svg aria-hidden="true"><use href="#i-linkedin"/></svg><span>LinkedIn &mdash; Kadir Ravshanov</span></a>',
  '        <a href="https://github.com/kdrcoding" target="_blank" rel="noopener noreferrer"><svg aria-hidden="true"><use href="#i-github"/></svg><span>github.com/kdrcoding</span></a>',
  "      </div>",
  '      <p class="lock-foot">Reach out and I&rsquo;ll gladly share access.</p>',
  "    </div>",
  "  </div>",
].join("\n");

const out = [
  "<!DOCTYPE html>",
  '<html lang="en">',
  "<head>",
  '  <meta charset="UTF-8" />',
  '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
  '  <meta name="robots" content="noindex, nofollow" />',
  "  <title>Protected Résumé</title>",
  '  <meta name="theme-color" content="#e8eef4" />',
  '  <link rel="preconnect" href="https://fonts.googleapis.com" />',
  '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />',
  '  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap" rel="stylesheet" />',
  "  " + styleBlock.replace("</style>", lockStyles + "</style>"),
  "</head>",
  "<body>",
  "",
  "  " + sprite,
  "",
  lockHtml,
  "",
  '  <div id="resumeMount" hidden></div>',
  "",
  '  <script type="application/json" id="payload">' + payload + "</scr" + "ipt>",
  '  <script src="unlock.js?v=' + unlockVer + '" defer></scr' + "ipt>",
  "</body>",
  "</html>",
  "",
].join("\n");

writeFileSync(OUT, out, "utf8");

console.log("Locked " + OUT + " (" + out.length + " bytes).");
console.log("Résumé body encrypted: " + resume.length + " chars -> " + payload.length + " bytes of ciphertext payload.");
console.log("unlock.js version: " + unlockVer);
