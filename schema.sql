-- NetShield AI schema for XAMPP MySQL/MariaDB.
-- The app creates all of this automatically on first start; importing in phpMyAdmin is optional.
CREATE DATABASE IF NOT EXISTS netshield CHARACTER SET utf8mb4;
USE netshield;

CREATE TABLE IF NOT EXISTS users (
  username VARCHAR(32) NOT NULL PRIMARY KEY,
  salt     CHAR(32)    NOT NULL,
  pw       CHAR(64)    NOT NULL,
  role     VARCHAR(10) NOT NULL DEFAULT 'viewer',   -- viewer, analyst or admin
  team_id  INT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS detections (
  id          BIGINT      NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ts          DATETIME    NOT NULL,            -- UTC
  prediction  VARCHAR(32) NOT NULL,
  confidence  FLOAT,
  risk_score  SMALLINT,
  risk_label  VARCHAR(10),
  ack         TINYINT NOT NULL DEFAULT 0,   -- alert acknowledged
  source      VARCHAR(10) NOT NULL DEFAULT 'live',   -- live | upload | scan
  source_name VARCHAR(100),                 -- uploaded file / dataset name
  proto       VARCHAR(16),                  -- flow details kept with every prediction
  service     VARCHAR(16),
  state       VARCHAR(16),
  dur         FLOAT,
  sbytes      BIGINT,
  dbytes      BIGINT,
  model       VARCHAR(20),                  -- which model made the prediction
  anomaly_score SMALLINT,
  src_ip VARCHAR(45),
  dst_ip VARCHAR(45),
  KEY ix_ts (ts)
) ENGINE=InnoDB;

-- Every High / Critical prediction becomes an alert that an analyst can acknowledge.
CREATE TABLE IF NOT EXISTS alerts (
  id           BIGINT      NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ts           DATETIME    NOT NULL,                    -- UTC, when the alert was raised
  prediction   VARCHAR(32) NOT NULL,
  confidence   FLOAT,
  risk_score   SMALLINT,
  risk_label   VARCHAR(10) NOT NULL,                    -- High or Critical
  source       VARCHAR(10) NOT NULL DEFAULT 'live',     -- live, upload or scan
  source_name  VARCHAR(100),
  src_ip       VARCHAR(45),
  status       VARCHAR(12) NOT NULL DEFAULT 'open',     -- open or acknowledged
  ack_by       VARCHAR(32),
  ack_at       DATETIME,
  KEY ix_status (status, risk_label),
  KEY ix_ts (ts)
) ENGINE=InnoDB;

-- One row per Start live ... Stop live session.
CREATE TABLE IF NOT EXISTS live_history (
  id          BIGINT      NOT NULL AUTO_INCREMENT PRIMARY KEY,
  started_at  DATETIME    NOT NULL,                     -- UTC
  stopped_at  DATETIME,
  started_by  VARCHAR(32),
  status      VARCHAR(12) NOT NULL DEFAULT 'running',   -- running, stopped, finished, error or interrupted
  flows       INT         NOT NULL DEFAULT 0,
  attacks     INT         NOT NULL DEFAULT 0,
  alerts      INT         NOT NULL DEFAULT 0,
  max_risk    SMALLINT    NOT NULL DEFAULT 0,
  source      VARCHAR(10) NOT NULL DEFAULT 'demo',      -- demo (dataset replay) or network (real capture)
  iface       VARCHAR(100)
) ENGINE=InnoDB;

-- Small key/value store (for example the model currently used for scoring).
CREATE TABLE IF NOT EXISTS settings (
  k  VARCHAR(40)  NOT NULL PRIMARY KEY,
  v  VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS teams (
  id    INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name  VARCHAR(40) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- Who did what, and when (logins, role changes, live tracking, uploads, alert and incident actions).
CREATE TABLE IF NOT EXISTS audit_log (
  id        BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ts        DATETIME NOT NULL,
  username  VARCHAR(32),
  action    VARCHAR(40) NOT NULL,
  detail    VARCHAR(200),
  ip        VARCHAR(45),
  KEY ix_ts (ts)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS incidents (
  id          BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  alert_id    BIGINT NULL,
  title       VARCHAR(120) NOT NULL,
  severity    VARCHAR(10) NOT NULL DEFAULT 'High',
  status      VARCHAR(14) NOT NULL DEFAULT 'open',    -- open, investigating, resolved or closed
  assignee    VARCHAR(32),
  created_by  VARCHAR(32),
  created_at  DATETIME NOT NULL,
  updated_at  DATETIME NOT NULL,
  KEY ix_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS incident_notes (
  id           BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  incident_id  BIGINT NOT NULL,
  username     VARCHAR(32),
  ts           DATETIME NOT NULL,
  note         VARCHAR(500) NOT NULL,
  KEY ix_incident (incident_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notification_log (
  id       BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ts       DATETIME NOT NULL,
  channel  VARCHAR(10) NOT NULL,                      -- webhook or email
  target   VARCHAR(100),
  subject  VARCHAR(150),
  status   VARCHAR(10) NOT NULL,                      -- sent or failed
  error    VARCHAR(200)
) ENGINE=InnoDB;
