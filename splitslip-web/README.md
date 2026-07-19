# SplitSlip (web)

A static, no-build version of SplitSlip — itemized bill splitting with GST handling,
who-paid tracking, and a settle-up ledger. Pure HTML/CSS/JS, works straight from
GitHub Pages with no install step.

Data is saved in the browser's local storage, so it stays on whichever device opens
the page (not synced between devices).

## Put this on GitHub Pages

1. Create a new GitHub repo (or use an existing one) and upload these 3 files
   (`index.html`, `style.css`, `app.js`) to the root — drag them in via the
   "Add file → Upload files" button on github.com, or however you normally push.
2. Go to the repo's **Settings → Pages**.
3. Under **Source**, choose **Deploy from a branch**, pick your default branch
   (usually `main`) and folder `/ (root)`, then **Save**.
4. GitHub gives you a link like `https://<your-username>.github.io/<repo-name>/`.
   It can take a minute to go live the first time.

Anyone who opens that link gets the working app directly in their browser —
no download, no build, no server needed.

## Files

- `index.html` — page structure
- `style.css` — styling
- `app.js` — all app logic (state, calculations, rendering, localStorage)
