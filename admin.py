import argparse, getpass
from backend.main import init, connection, password_hash, now, audit

p = argparse.ArgumentParser()
p.add_argument("username")
a = p.parse_args()
password = getpass.getpass("New admin password (10+ characters): ")
if len(password) < 10:
    raise SystemExit("Password must be at least 10 characters")
init()
with connection() as c:
    c.execute(
        "INSERT INTO users(username,password,role,created) VALUES(?,?,?,?)",
        (a.username, password_hash(password), "Admin", now()),
    )
audit(a.username, "admin_created_cli")
print("Admin created")
