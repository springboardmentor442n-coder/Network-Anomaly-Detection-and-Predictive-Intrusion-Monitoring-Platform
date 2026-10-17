"""Local administrator recovery only; never marks an email as verified."""
import argparse,getpass
from backend import main
p=argparse.ArgumentParser(description='Local account recovery and session revocation')
p.add_argument('username');p.add_argument('--reset-password',action='store_true');p.add_argument('--revoke-sessions',action='store_true');a=p.parse_args()
if not (a.reset_password or a.revoke_sessions):p.error('Choose --reset-password or --revoke-sessions')
main.init()
with main.connection() as c:
    if not c.execute('SELECT username FROM users WHERE username=?',(a.username,)).fetchone():raise SystemExit('Account not found')
    if a.reset_password:
        password=getpass.getpass('New password (12+ characters): ')
        if len(password)<12 or len(password)>128:raise SystemExit('Use 12–128 characters')
        if password!=getpass.getpass('Confirm password: '):raise SystemExit('Passwords differ')
        c.execute('UPDATE users SET password=?,auth_version=auth_version+1 WHERE username=?',(main.password_hash(password),a.username))
    else:c.execute('UPDATE users SET auth_version=auth_version+1 WHERE username=?',(a.username,))
main.audit(a.username,'local_admin_recovery','Password reset' if a.reset_password else 'Sessions revoked')
print('Done. Old sessions are invalid. Email verification is still required for unlinked accounts.')
