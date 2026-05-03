# How to push this site to GitHub & Netlify

This is a one-time setup. After this, every commit auto-deploys.

---

## Step 1 — Create an empty GitHub repo

1. Go to https://github.com/new
2. **Repository name**: `allbriton-portfolio` (or whatever you'd like)
3. **Public** (recommended)
4. **Important**: do NOT check "Add a README", "Add .gitignore", or "Add a license" — leave the new repo completely empty.
5. Click **Create repository**.
6. On the next page, copy the SSH or HTTPS URL it shows you (looks like `git@github.com:allbriton/allbriton-portfolio.git` or `https://github.com/allbriton/allbriton-portfolio.git`).

---

## Step 2 — Push from your Mac Terminal

Open Terminal on your Mac, then paste these commands one at a time. Replace the URL on the last line with the one from your new repo.

```bash
cd "/Users/user/Documents/Claude/Projects/Allbriton.com Portfolio Website Design/site"

# Clean up any partial git state from the sandbox
rm -rf .git

# Fresh init
git init -b main
git add .
git commit -m "Initial commit: production-ready portfolio site"

# Wire up GitHub remote and push (replace the URL with yours)
git remote add origin git@github.com:YOUR_USERNAME/allbriton-portfolio.git
git push -u origin main
```

If git asks for authentication, your Mac should already be set up (GitHub Desktop, SSH key, or credential manager — whichever you use). If not, GitHub will prompt with instructions.

---

## Step 3 — Connect Netlify to the repo

1. Go to https://app.netlify.com/start
2. Choose **GitHub** as the source.
3. Authorize Netlify to read your repos (one-time per Netlify account).
4. Pick `allbriton-portfolio` from the list.
5. **Build settings:**
   - Build command: *leave blank*
   - Publish directory: `.`
   - (These are also set in `netlify.toml`, but it doesn't hurt to confirm.)
6. Click **Deploy site**. Within ~30 seconds you'll have a live URL like `random-name-abc123.netlify.app`.
7. Visit the URL and click through every project to verify everything works. This is the live-but-not-yet-at-allbriton.com state.

---

## Step 4 — Enable Netlify Identity (for the CMS login)

1. In your Netlify site dashboard → **Site configuration** → **Identity**.
2. Click **Enable Identity**.
3. Under **Registration preferences**, set to **Invite only**.
4. Under **Services**, enable **Git Gateway** (this is what lets the CMS write back to the GitHub repo).
5. Under **Identity → Users**, click **Invite users** and invite your own email.
6. Open the invitation email, click the link. It lands at `<site>.netlify.app/#invite_token=...`. The widget on the homepage picks it up and prompts you to set a password.
7. After signup, you'll be redirected to `/admin/` and can log in to the CMS.

---

## Step 5 — Point allbriton.com at Netlify

1. In Netlify → **Domain settings** → **Add custom domain** → enter `allbriton.com`.
2. Netlify will give you either name servers (recommended, simpler) or A/AAAA records.
3. In your Squarespace domain settings → DNS → either:
   - Switch the domain to use Netlify's name servers, or
   - Add the A/AAAA records Netlify shows you.
4. Wait 1–24 hours for DNS to propagate. SSL is auto-provisioned.

**Don't cancel Squarespace until the new site has been live and stable for at least a week.** Keep the old site as a fallback in case anything's wrong.

---

## How to add new content from then on

Either:
- **In the browser**: go to `allbriton.com/admin/`, log in, edit, save. Netlify rebuilds automatically.
- **From Terminal**: edit `data/projects.json`, drop assets in `assets/projects/<slug>/`, then `git commit && git push`.

Either way, the change is live in about 30 seconds.

---

## If something goes wrong

- **Push rejected (auth)**: GitHub doesn't recognize you. Set up SSH or use `gh auth login` if you have the GitHub CLI.
- **Netlify build fails**: there's no build, so this shouldn't happen. If it does, check the deploy log in Netlify and send it to me.
- **CMS login loops**: Identity is enabled but Git Gateway isn't. Re-check Step 4.
- **Old Squarespace URLs 404 on the new site**: confirm `netlify.toml` was committed. The `[[redirects]]` rules in it map `/work/<slug>` to `/project.html?p=<slug>`.
