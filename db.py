"""MySQL/MariaDB connection for XAMPP. Defaults match a fresh XAMPP: 127.0.0.1:3306, user root, no password."""
import os, pymysql

CFG = dict(host=os.getenv("NETSHIELD_DB_HOST", "127.0.0.1"), port=int(os.getenv("NETSHIELD_DB_PORT", "3306")),
           user=os.getenv("NETSHIELD_DB_USER", "root"), password=os.getenv("NETSHIELD_DB_PASSWORD", ""),
           charset="utf8mb4", cursorclass=pymysql.cursors.DictCursor, autocommit=True)
NAME = os.getenv("NETSHIELD_DB_NAME", "netshield")

def sql(query, args=None, many=False):
    """Run one query; returns a list of dict rows. Use %s placeholders (and %% for a literal % when args are given)."""
    c = pymysql.connect(database=NAME, **CFG)
    try:
        with c.cursor() as cur:
            cur.executemany(query, args) if many else cur.execute(query, args)
            return list(cur.fetchall())
    finally:
        c.close()

def insert_id(query, args=None):
    """Run an INSERT and return the new row id."""
    c = pymysql.connect(database=NAME, **CFG)
    try:
        with c.cursor() as cur:
            cur.execute(query, args)
            return cur.lastrowid
    finally:
        c.close()

def init():
    """Create the database and tables from database/schema.sql if they don't exist."""
    try:
        c = pymysql.connect(**CFG)
    except pymysql.err.OperationalError as e:
        raise SystemExit(f"Cannot connect to MySQL at {CFG['host']}:{CFG['port']} ({e}).\n"
                         "Open the XAMPP Control Panel and click Start next to MySQL.")
    with c.cursor() as cur:
        cur.execute(f"CREATE DATABASE IF NOT EXISTS `{NAME}` CHARACTER SET utf8mb4")
    c.close()
    text = open(os.path.join(os.path.dirname(__file__), "schema.sql")).read()
    text = "\n".join(l for l in text.splitlines() if not l.strip().startswith("--"))
    for stmt in filter(None, (s.strip() for s in text.split(";"))):
        if not stmt.upper().startswith(("CREATE DATABASE", "USE")):
            sql(stmt)
    for col in ("ack TINYINT NOT NULL DEFAULT 0", "source VARCHAR(10) NOT NULL DEFAULT 'live'", "source_name VARCHAR(100) NULL",
                "proto VARCHAR(16) NULL", "service VARCHAR(16) NULL", "state VARCHAR(16) NULL",
                "dur FLOAT NULL", "sbytes BIGINT NULL", "dbytes BIGINT NULL", "model VARCHAR(20) NULL", "anomaly_score SMALLINT NULL", "src_ip VARCHAR(45) NULL", "dst_ip VARCHAR(45) NULL"):
        try:  # older installs: add any column that is missing
            sql("ALTER TABLE detections ADD COLUMN " + col)
        except pymysql.err.MySQLError:
            pass  # already exists
    if not sql("SELECT 1 FROM alerts LIMIT 1"):  # first start with the alerts table: copy existing High/Critical rows
        sql("""INSERT INTO alerts(ts,prediction,confidence,risk_score,risk_label,source,source_name,status,ack_at)
               SELECT ts,prediction,confidence,risk_score,risk_label,source,source_name,
                      IF(ack=1,'acknowledged','open'), IF(ack=1,ts,NULL)
               FROM detections WHERE risk_label IN ('High','Critical')""")
    sql("UPDATE live_history SET status='interrupted', stopped_at=UTC_TIMESTAMP() WHERE status='running'")
    promoted = False
    for col in ("role VARCHAR(10) NOT NULL DEFAULT 'viewer'", "team_id INT NULL"):
        try:  # older installs: add the role and team columns
            sql("ALTER TABLE users ADD COLUMN " + col)
            promoted = promoted or col.startswith("role")
        except pymysql.err.MySQLError:
            pass
    if promoted:  # accounts that existed before roles were added become admins, once
        sql("UPDATE users SET role='admin'")
    try:  # older installs: source address on alerts
        sql("ALTER TABLE alerts ADD COLUMN src_ip VARCHAR(45) NULL")
    except pymysql.err.MySQLError:
        pass
    for col in ("source VARCHAR(10) NOT NULL DEFAULT 'demo'", "iface VARCHAR(100) NULL"):
        try:  # older installs: where a live session got its traffic
            sql("ALTER TABLE live_history ADD COLUMN " + col)
        except pymysql.err.MySQLError:
            pass
