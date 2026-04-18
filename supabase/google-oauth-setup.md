# Google OAuth setup for Golem OS

Scoped to Supabase project `wllsrdfflaudwhfpxzfe` and Google Workspace domain `bedextrous.com`.

## 1. Google Cloud Console — create OAuth client

1. Open <https://console.cloud.google.com/>. Use the **bedextrous.com** Workspace account.
2. Top bar → project picker → **New project** → name it `Golem OS` → Create.
3. Left nav → **APIs & Services → OAuth consent screen**
   - User Type: **Internal** (this alone restricts sign-in to the bedextrous.com Workspace — no extra domain allow-list needed).
   - App name: `Golem OS`
   - User support email + developer email: your bedextrous.com address
   - Save and continue through scopes (no extra scopes needed for auth; we'll add Calendar later if we want the calendar widget back).
4. Left nav → **APIs & Services → Credentials → + Create credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `Golem OS Web`
   - **Authorized JavaScript origins** (add both):
     - `http://localhost:5173`
     - `https://app.bedextrous.com`
   - **Authorized redirect URIs** (this is Supabase's callback, not yours):
     - `https://wllsrdfflaudwhfpxzfe.supabase.co/auth/v1/callback`
   - Create → copy the **Client ID** and **Client secret**.

## 2. Supabase — enable Google provider

1. Open <https://supabase.com/dashboard/project/wllsrdfflaudwhfpxzfe/auth/providers>.
2. Find **Google** in the list → toggle **Enabled**.
3. Paste the **Client ID** and **Client secret** from step 1.
4. Save.

## 3. Supabase — configure redirect URLs

1. Open <https://supabase.com/dashboard/project/wllsrdfflaudwhfpxzfe/auth/url-configuration>.
2. **Site URL**: `https://app.bedextrous.com`
3. **Redirect URLs** (allow-list; add both):
   - `http://localhost:5173`
   - `https://app.bedextrous.com`
4. Save.

## 4. Smoke test (skip for now)

> ⚠️ This is **JavaScript**, not SQL. Do NOT paste it into the Supabase SQL editor.
> We'll run it in your **browser console** once Phase 4 (frontend port) is done. Skip this section for now — the OAuth flow will be tested by the ported app itself.

<details>
<summary>Future browser-console smoke test</summary>

```js
// Paste in the browser DevTools console, NOT the Supabase SQL editor.
const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
const sb = createClient(
  'https://wllsrdfflaudwhfpxzfe.supabase.co',
  'PASTE_ANON_KEY_FROM_SUPABASE_DASHBOARD'
);
await sb.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: window.location.href }
});
```

Grab the anon key from <https://supabase.com/dashboard/project/wllsrdfflaudwhfpxzfe/settings/api>.
The anon key is safe to ship to the browser — RLS protects the data.

Expected: Google sign-in page → pick your bedextrous.com account → redirected back, logged in. A non-Workspace account should be refused at Google's end because the consent screen is **Internal**.

</details>

## Notes

- **Why "Internal" user type?** Anyone not on the bedextrous.com Workspace literally cannot complete OAuth. No extra code needed.
- **If you want to add personal gmail accounts later:** switch user type to **External** + Publish, then manage allowed users yourself.
- **Calendar widget (later):** we'll add the `https://www.googleapis.com/auth/calendar.readonly` scope when we port it. For now, auth-only.
