# resume.kdrcoding.com

Password-protected static résumé site for **Kadir Ravshanov** — IT Support Specialist / Systems Administrator.

## Files

| File | Purpose |
| --- | --- |
| `resume-plain.html` | Editable résumé (local only — gitignored) |
| `index.html` | Locked public page (encrypted résumé + login screen) |
| `unlock.js` | Client-side decrypt + login UX |
| `lock.mjs` | Build script — encrypts `resume-plain.html` → `index.html` |
| `lock-resume.bat` | Run this after editing the résumé |
| `main.js` | Toolbar controls for local `resume-plain.html` preview |
| `photo.jpg` | Profile photo |
| `CNAME` | Custom domain for GitHub Pages |

## Edit workflow

1. Edit `resume-plain.html` (content, styles, sections).
2. Preview locally: `python -m http.server 8080` → open http://localhost:8080/resume-plain.html
3. Lock: double-click `lock-resume.bat` and enter your résumé password.
   - Optional: save the password in a local `.resume-pw` file (gitignored) to skip the prompt.
4. Publish: run `push.bat`.

**Do not add:** home street address, date of birth, immigration documents, or green card status.

## Login screen features

- Show/hide password toggle
- Dark mode on lock screen and résumé
- Loading state while decrypting
- Session unlock (stays open until tab closes)
- Lock button in toolbar to return to password screen

## Deploy

**Live site:** https://resume.kdrcoding.com  
**GitHub Pages:** branch `main`, root folder

After `push.bat`, changes are live in about a minute.

## PDF download

Use **Download PDF** in the toolbar → browser print dialog → **Save as PDF**.
