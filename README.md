# Moonlight Elixirs

A relaxing, ad-free, timer-free magical apothecary water sort puzzle designed iPad-first as an offline Progressive Web App (PWA).

## Running Locally on Windows

From this folder, start a local static server:

```powershell
python tools/serve.py
```

Then open `http://127.0.0.1:8080` in your browser.

## Installing on Your Wife's iPad (Free & Offline Forever)

iPad Safari installs full-screen offline PWAs from any HTTPS URL — no Apple Developer account required.

### Option A: Free Hosting with GitHub Pages (Recommended)
1. Create a new GitHub repository (e.g. `moonlight-elixirs`) and push the files in this folder to the `main` branch.
2. In your GitHub repo, open **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to `Deploy from a branch`, select `main` and `/ (root)`, and click **Save**.
4. Wait ~1 minute for GitHub to show your live HTTPS link (e.g. `https://<your-username>.github.io/moonlight-elixirs/`).

### Add to iPad Home Screen
1. Open that HTTPS link in **Safari** on her iPad.
2. Tap the **Share** button (square with an upward arrow in the top bar).
3. Tap **Add to Home Screen** → confirm the name **Moonlight Elixirs** → tap **Add**.
4. Open **Moonlight Elixirs** from the Home Screen icon! It launches full-screen like a native iPad app and works **100% offline** after the first load.
