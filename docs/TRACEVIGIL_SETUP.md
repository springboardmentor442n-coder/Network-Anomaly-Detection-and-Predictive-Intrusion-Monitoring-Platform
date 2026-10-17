# TraceVigil AI secure accounts and interactive monitoring

Read this before replacing your current working application. The new email-only login deliberately replaces username-only login. Old sessions are invalidated; existing accounts must link an email once. Their internal username and scan ownership remain intact. There is no fake email verification, developer OTP, or CAPTCHA bypass.

## What is included
- TraceVigil AI runtime branding. Folder names, existing SQLite path, environment names and model artifacts remain unchanged.
- Interactive capture-hour chart with hover/focus/select counts and toggleable series. New scans collect predicted BENIGN, predicted attacks and total scored. Old saved scans can show only the existing attack series. Time is dataset capture time, not current wall clock or a fabricated last-24-hours feed. Missing hours are unobserved. Maximum 512 buckets; the complete row export remains authoritative.
- Visible rotating refresh indicator and updated/failed timestamp for overview, incident queue and history.
- Active display name and username with a green header indicator. This means the current authenticated session, not continuous security monitoring or a list of globally online users.
- TreeSHAP loading, result and error immediately beneath its button. Values explain XGBoost raw margins, not risk.
- Soft local-device welcome speech after verified signup and login. Mute/replay controls are provided. No microphone or paid voice API is used. A compatible local English voice and browser permission/user gesture are needed; system volume still affects loudness. No guarantee of identical or custom AI voice on every machine.
- Invitation-based signup with display name, username, email, matching password (12+ characters), policy acknowledgement, free Turnstile validation, email verification code, and optional linking of an old account. Login uses email/password and a human-verification widget, without repeated email OTP.

## Before installing
1. Stop Uvicorn and wait for the process to exit. Back up your original project and data/netshield.db outside the repository. Do not delete your data directory or models.
2. Obtain the free service settings below. If you cannot configure them yet, retain your working version until ready; copying this patch without configuration will prevent verified login/signup. Nothing silently falls back to the old login.
3. Merge the complete patch files into your original Git-connected folder. Keep style.css and the mentor README unchanged. The added visuals.css rules reuse the hacker colours.
4. Install requirements from your original environment:

       .\venv\Scripts\python.exe -m pip install -r requirements.txt

## Free human verification setup
Create a Cloudflare account and a Turnstile widget on the free plan. Add the hostname you will actually use to the widget's allowed hostnames. Use real widget keys, not the published testing keys. Copy .env.example to .env in the project root, and fill TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY. Keep the secret private.

For local browsing at http://127.0.0.1:8000 set TURNSTILE_HOSTNAME=127.0.0.1 and allow that hostname in the widget. If using localhost instead, set the exact expected hostname to localhost and browse that hostname consistently. Change the keys/hostname as appropriate for deployment. Expected hostname contains no scheme, port or path. Backend verification checks success, hostname and action=auth; tokens are validated by Cloudflare, not trusted from browser input.

Official guides:
https://developers.cloudflare.com/turnstile/plans/
https://developers.cloudflare.com/turnstile/get-started/
https://developers.cloudflare.com/turnstile/get-started/server-side-validation/

## Free email sender setup
The application uses standard SMTP over TLS. For an eligible personal Gmail account, enable Google 2-Step Verification and generate an app password. Some managed accounts do not permit app passwords. Use that app password, not your normal Google password. Fill .env:

    SMTP_HOST=smtp.gmail.com
    SMTP_PORT=587
    SMTP_FROM=YOUR_ACTUAL_SENDER_EMAIL
    SMTP_USER=YOUR_ACTUAL_SENDER_EMAIL
    SMTP_PASSWORD=YOUR_APP_PASSWORD_WITHOUT_GROUPING_SPACES

An existing free SMTP account is subject to its provider's sending limits; delivery and spam placement are not guaranteed. Another provider supporting authenticated TLS SMTP can be used. Some free hosts block SMTP ports, so verify this before deployment; a free-tier transactional email API adapter is an alternative but is not implemented in this patch. No email is sent until signup is requested with valid invitation and CAPTCHA.

Official Gmail instructions:
https://support.google.com/accounts/answer/185833

## Authorisation settings
Generate your own private invitation:

    .\venv\Scripts\python.exe -c "import secrets; print(secrets.token_urlsafe(24))"

Paste it into REGISTRATION_CODE in .env. Distribute only to authorised users. For your private internship demo, also set AUTHORIZED_EMAILS to your actual email, or a comma-separated approved list. This separates permission to join from ownership of an email address. Rotate the invitation if exposed. Never paste secrets into chat or commit .env. Verify git check-ignore -v .env returns an exclusion rule.

## Start and link your existing account
Start the server:

    .\venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --workers 1

Open http://127.0.0.1:8000 and press Ctrl+F5.
- Choose Create or link account.
- Enter your name, a valid username field, your real email, current password twice, and invitation code. A new password must be 12–128 characters. For linking, use the existing password; the linking process does not change it.
- Expand Link my old username account and enter the exact old username, for example 1234. That internal name is preserved so your scans stay yours. The new username field is ignored when linking; the display name is shown prominently.
- Complete human verification, accept authorised-use notice and request a code.
- Enter the six-digit code received by email within 10 minutes. The code can be used once, with at most five guesses. Requesting a new code invalidates the previous enrollment for that email.
- Login using the verified email and existing password. Later logins do not require email OTP, but do require valid credentials and a human-verification challenge.

If your old password has fewer than 12 characters, reset it locally first:

    .\venv\Scripts\python.exe account_admin.py 1234 --reset-password

This is a local administrator recovery command, not an unauthenticated web endpoint. It never marks an email as verified. To revoke current sessions:

    .\venv\Scripts\python.exe account_admin.py 1234 --revoke-sessions

## Security boundaries
Email verification proves access to that mailbox, not a person's real-world identity. Invitation/allowlist gates access; CAPTCHA reduces automated abuse and is not perfect bot-proof identity. As requested, login does not use recurring MFA, so stolen valid credentials remain a risk. Passwords use salted PBKDF2; verification codes use keyed hashes, expiry, attempt limits and single-use transactions. Fixed-window SQLite rate limits apply by direct peer IP and account. Behind a proxy, peers may share a limit; the app intentionally does not trust arbitrary forwarding headers. Tokens expire in two hours and session versions allow revocation. Existing browser session storage remains vulnerable if malicious script executes; production needs HTTPS, restricted deployment, patching and further review. There is no automatic email password-reset feature; local admin recovery is provided. This is not a claim of complete production security.

## What to test locally
1. New signup and legacy linking; real email delivery; wrong/expired code; successful login.
2. Reload and logout; confirm existing owned history/roles remain; verify other users cannot read your scans.
3. New demo scan: compare all three time series with the accessible table; old scans should not invent missing BENIGN totals.
4. Refresh each section and observe spinner plus completion timestamp.
5. Open a case and calculate TreeSHAP: loading/result/error appears directly below the button.
6. Test voice on/off and replay. If no local voice exists, text login still works. Browsers may block automatic speech; use replay.
7. Check PDF/XLSX exports, chart cards and model laboratory.

19 backend tests passed using mocked email and CAPTCHA providers. 21 UI assertions passed with mocked transport. Actual email delivery, live Turnstile keys, browser layout and speech were not verified here. Tests do not use real accounts or send emails. No change was made to ML artifacts or the existing severity policy.

## Git
Review git status. Stage the patch source and docs explicitly after local verification. Never stage .env, credentials, database or environments. Run git --no-pager diff --cached --check, commit, then push origin mansi-gaikwad. Reimport the updated Postman collection: login now needs verified email and a fresh real Turnstile token. An already issued Bearer token can be used for protected API testing until expiry/revocation.
