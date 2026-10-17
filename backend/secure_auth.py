"""Invite-gated, email-verified accounts. No verification bypass or console OTP."""
import os, re, time, secrets, hashlib, hmac, smtplib, ssl, sqlite3
from email.message import EmailMessage
from datetime import datetime, timezone, timedelta
import httpx
from fastapi import Depends, HTTPException, Request
from pydantic import BaseModel, Field


class Login(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(min_length=1, max_length=128)
    captcha_token: str = Field(default='', max_length=2048)


class Signup(Login):
    username: str = Field(min_length=3,max_length=40,pattern=r'^[a-zA-Z0-9_.-]+$')
    display_name: str = Field(min_length=2,max_length=80)
    confirm_password: str = Field(max_length=128)
    invitation_code: str = Field(max_length=256)
    accept_policy: bool
    legacy_username: str = Field(default='',max_length=120)


class Verify(BaseModel):
    challenge_id: str = Field(min_length=20,max_length=100)
    code: str = Field(pattern=r'^\d{6}$')


def email_address(value):
    value=value.strip().lower()
    if not re.fullmatch(r'[a-z0-9.!#$%&\x27*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}',value) or len(value)>254:
        raise HTTPException(422,'Enter a valid email address')
    return value


def captcha(token,request):
    secret=os.getenv('TURNSTILE_SECRET_KEY','');expected=os.getenv('TURNSTILE_HOSTNAME','')
    if not secret or not expected:raise HTTPException(503,'Human verification is not configured. Contact the project administrator.')
    if not token:raise HTTPException(400,'Complete human verification first')
    try:
        result=httpx.post('https://challenges.cloudflare.com/turnstile/v0/siteverify',data={'secret':secret,'response':token},timeout=10).json()
    except Exception:raise HTTPException(503,'Human verification unavailable. Please retry.')
    if not result.get('success') or result.get('hostname')!=expected or result.get('action')!='auth':
        raise HTTPException(400,'Human verification failed or expired. Please retry.')


def send_code(email,code):
    host=os.getenv('SMTP_HOST','');sender=os.getenv('SMTP_FROM','');user=os.getenv('SMTP_USER','');password=os.getenv('SMTP_PASSWORD','')
    if not all([host,sender,user,password]):raise HTTPException(503,'Email delivery is not configured. Contact the project administrator.')
    message=EmailMessage();message['From']=sender;message['To']=email;message['Subject']='TraceVigil AI email verification'
    message.set_content(f'Your TraceVigil AI verification code is {code}. It expires in 10 minutes and can be used once. Never share this code. If you did not request registration, ignore this email.')
    try:
        port=int(os.getenv('SMTP_PORT','587'));context=ssl.create_default_context()
        if port==465:
            with smtplib.SMTP_SSL(host,port,timeout=15,context=context) as server:server.login(user,password);server.send_message(message)
        else:
            with smtplib.SMTP(host,port,timeout=15) as server:
                server.ehlo();server.starttls(context=context);server.ehlo();server.login(user,password);server.send_message(message)
    except Exception:raise HTTPException(503,'Verification email could not be sent. Check sender configuration and retry.')


def install(m):
    original=m.init
    def init():
        original()
        with m.connection() as c:
            cols={r['name'] for r in c.execute('PRAGMA table_info(users)')}
            for name,definition in [('email','TEXT'),('display_name','TEXT'),('email_verified','INTEGER NOT NULL DEFAULT 0'),('auth_version','INTEGER NOT NULL DEFAULT 0')]:
                if name not in cols:c.execute(f'ALTER TABLE users ADD COLUMN {name} {definition}')
            c.execute('CREATE UNIQUE INDEX IF NOT EXISTS user_email ON users(email) WHERE email IS NOT NULL')
            c.execute('''CREATE TABLE IF NOT EXISTS enrollment(id TEXT PRIMARY KEY,email TEXT,username TEXT,display_name TEXT,password TEXT,legacy TEXT,code_hash TEXT,expires REAL,attempts INTEGER DEFAULT 0,legacy_hash TEXT)''')
            pending_cols={r['name'] for r in c.execute('PRAGMA table_info(enrollment)')}
            if 'legacy_hash' not in pending_cols:c.execute('ALTER TABLE enrollment ADD COLUMN legacy_hash TEXT')
            c.execute('CREATE TABLE IF NOT EXISTS auth_limits(key TEXT PRIMARY KEY,count INTEGER,expires REAL)')
    m.init=init
    def digest(value):return hmac.new(m.SECRET.encode(),value.encode(),hashlib.sha256).hexdigest()
    def limit(request,kind,account='',maximum=15):
        now=time.time();peer=request.client.host if request.client else 'unknown'
        # Do not trust attacker-controlled forwarding headers.
        keys=[digest(kind+':ip:'+peer)]
        if account:keys.append(digest(kind+':account:'+account))
        denied=False
        with m.connection() as c:
            c.execute('DELETE FROM auth_limits WHERE expires<?',(now,))
            for key in keys:
                c.execute('INSERT INTO auth_limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1',(key,now+900))
                if c.execute('SELECT count FROM auth_limits WHERE key=?',(key,)).fetchone()['count']>maximum:denied=True
        if denied:raise HTTPException(429,'Too many attempts. Wait 15 minutes before trying again.')
    m.app.router.routes[:]=[r for r in m.app.router.routes if getattr(r,'path','') not in ['/api/login','/api/signup']]

    @m.app.middleware('http')
    async def security_headers(request,call_next):
        response=await call_next(request)
        response.headers['X-Content-Type-Options']='nosniff'
        response.headers['X-Frame-Options']='DENY'
        response.headers['Referrer-Policy']='no-referrer'
        if request.url.path.startswith('/api/'):
            response.headers['Cache-Control']='no-store'
        return response

    @m.app.get('/api/auth/config')
    def config():
        return {'project_name':'TraceVigil AI','site_key':os.getenv('TURNSTILE_SITE_KEY',''),
                'ready':all(os.getenv(k) for k in ['TURNSTILE_SITE_KEY','TURNSTILE_SECRET_KEY','TURNSTILE_HOSTNAME','REGISTRATION_CODE','SMTP_HOST','SMTP_FROM','SMTP_USER','SMTP_PASSWORD']),
                'message':'Signup requires an administrator invitation and ownership verification of your email. Existing accounts must link their email once; scan ownership is preserved.'}

    @m.app.post('/api/signup')
    def signup(body:Signup,request:Request):
        email=email_address(body.email);limit(request,'signup',email,5)
        allowed={x.strip().lower() for x in os.getenv('AUTHORIZED_EMAILS','').split(',') if x.strip()}
        if allowed and email not in allowed:raise HTTPException(403,'This email is not authorised for the workspace')
        if not body.accept_policy:raise HTTPException(422,'Confirm authorised use and the verification privacy notice')
        if len(body.password)<12 or body.password!=body.confirm_password:raise HTTPException(422,'Use at least 12 characters and matching passwords')
        invitation=os.getenv('REGISTRATION_CODE','')
        if not invitation:raise HTTPException(503,'Invitation-based signup is not configured')
        if not hmac.compare_digest(invitation,body.invitation_code):raise HTTPException(403,'Invalid invitation code')
        if not all(os.getenv(k) for k in ['SMTP_HOST','SMTP_FROM','SMTP_USER','SMTP_PASSWORD']):raise HTTPException(503,'Email delivery is not configured')
        captcha(body.captcha_token,request)
        with m.connection() as c:
            existing=c.execute('SELECT * FROM users WHERE username=?',(body.legacy_username or body.username,)).fetchone()
            duplicate=c.execute('SELECT username FROM users WHERE email=?',(email,)).fetchone()
        if duplicate or (existing and not body.legacy_username):raise HTTPException(409,'Account unavailable. Use your existing verified account or choose another username.')
        if body.legacy_username and (not existing or existing['email_verified'] or not m.password_ok(body.password,existing['password'])):
            raise HTTPException(403,'Cannot link that existing account. Check its current username and password.')
        username=body.legacy_username or body.username
        challenge=secrets.token_urlsafe(32);code=f'{secrets.randbelow(1000000):06d}'
        with m.connection() as c:
            c.execute('DELETE FROM enrollment WHERE expires<? OR email=?',(time.time(),email))
            c.execute('INSERT INTO enrollment(id,email,username,display_name,password,legacy,code_hash,expires,legacy_hash) VALUES(?,?,?,?,?,?,?,?,?)',
                      (challenge,email,username,body.display_name.strip(),m.password_hash(body.password),body.legacy_username,digest(challenge+code),time.time()+600,existing['password'] if body.legacy_username else None))
        try:send_code(email,code)
        except HTTPException:
            with m.connection() as c:c.execute('DELETE FROM enrollment WHERE id=?',(challenge,))
            raise
        return {'challenge_id':challenge,'message':'Code sent. Check your email, including spam. Valid for 10 minutes. At most five attempts.'}

    @m.app.post('/api/auth/verify')
    def verify(body:Verify,request:Request):
        limit(request,'verify','',30);error=None;username=None
        with m.connection() as c:
            c.execute('BEGIN IMMEDIATE')
            row=c.execute('SELECT * FROM enrollment WHERE id=?',(body.challenge_id,)).fetchone()
            if not row or row['expires']<time.time() or row['attempts']>=5:error='Code expired or unavailable. Request a new code.'
            elif not hmac.compare_digest(row['code_hash'],digest(body.challenge_id+body.code)):
                c.execute('UPDATE enrollment SET attempts=attempts+1 WHERE id=?',(body.challenge_id,));error='Incorrect code. At most five attempts are permitted.'
            else:
                try:
                    if row['legacy']:
                        legacy=c.execute('SELECT * FROM users WHERE username=?',(row['legacy'],)).fetchone()
                        if not legacy or legacy['email_verified'] or not hmac.compare_digest(legacy['password'],row['legacy_hash'] or ''):error='Account already linked or unavailable'
                        else:c.execute('UPDATE users SET email=?,display_name=?,email_verified=1,auth_version=auth_version+1 WHERE username=?',(row['email'],row['display_name'],row['legacy']))
                    else:c.execute('INSERT INTO users(username,password,role,created,email,display_name,email_verified,auth_version) VALUES(?,?,?,?,?,?,1,1)',(row['username'],row['password'],'Analyst',m.now(),row['email'],row['display_name']))
                    c.execute('DELETE FROM enrollment WHERE id=?',(body.challenge_id,));username=row['username']
                except sqlite3.IntegrityError:error='Account already registered. Log in or request a new enrollment.'
        if error:raise HTTPException(400,error)
        m.audit(username,'email_verified')
        return {'message':'Email verified. Log in with your email and password.','display_name':row['display_name']}

    @m.app.post('/api/login')
    def login(body:Login,request:Request):
        email=email_address(body.email);limit(request,'login',email,15);captcha(body.captcha_token,request)
        with m.connection() as c:row=c.execute('SELECT * FROM users WHERE email=?',(email,)).fetchone()
        # Fixed dummy PBKDF2 work limits straightforward account-timing differences.
        stored=row['password'] if row else '0'*32+':'+'0'*64
        valid=m.password_ok(body.password,stored)
        if not row or not valid or not row['email_verified']:raise HTTPException(401,'Incorrect credentials or unverified account')
        m.audit(row['username'],'login')
        return {'access_token':m.jwt.encode({'sub':row['username'],'v':row['auth_version'],'exp':datetime.now(timezone.utc)+timedelta(hours=2)},m.SECRET,algorithm='HS256'),'token_type':'bearer','role':row['role'],'display_name':row['display_name'] or row['username']}
