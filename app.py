from flask import Flask, render_template, request, redirect, session
import mysql.connector

app = Flask(__name__)
app.secret_key = "network_intrusion_secret_key"


# =====================================================
# DATABASE CONNECTION
# =====================================================

def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="",
        database="network_intrusion_db"
    )


# =====================================================
# LOGIN PAGE
# =====================================================

@app.route("/")
def login():

    message = session.pop("message", None)

    return render_template(
        "login.html",
        message=message
    )


# =====================================================
# LOGIN
# =====================================================

@app.route("/login", methods=["POST"])
def login_user():

    username = request.form["username"]
    password = request.form["password"]

    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    query = """
        SELECT *
        FROM users
        WHERE username = %s AND password = %s
    """

    cursor.execute(query, (username, password))

    user = cursor.fetchone()

    cursor.close()
    db.close()

    if user:

        session["user_id"] = user["id"]
        session["username"] = user["username"]
        session["email"] = user["email"]
        session["role"] = user["role"]

        session["login_success"] = True

        return redirect("/dashboard")

    return render_template(
        "login.html",
        error="Invalid username or password"
    )


# =====================================================
# REGISTER
# =====================================================

@app.route("/register", methods=["GET", "POST"])
def register():

    if request.method == "POST":

        username = request.form["username"]
        email = request.form["email"]
        password = request.form["password"]

        db = get_db_connection()
        cursor = db.cursor()

        try:

            query = """
                INSERT INTO users
                (username, email, password, role)
                VALUES (%s, %s, %s, 'user')
            """

            cursor.execute(
                query,
                (username, email, password)
            )

            db.commit()

            cursor.close()
            db.close()

            session["message"] = "Registration Successful!"

            return redirect("/")

        except mysql.connector.Error:

            cursor.close()
            db.close()

            return render_template(
                "register.html",
                error="Username or email already exists"
            )


    return render_template("register.html")


# =====================================================
# DASHBOARD / HOME
# =====================================================

@app.route("/dashboard")
def dashboard():

    if "user_id" not in session:
        return redirect("/")

    db = get_db_connection()
    cursor = db.cursor(dictionary=True)


    # ---------------------------------------------
    # USER DETAILS
    # ---------------------------------------------

    cursor.execute("""
        SELECT id, username, email, role, created_at
        FROM users
        WHERE id = %s
    """, (session["user_id"],))

    user = cursor.fetchone()


    # ---------------------------------------------
    # TOTAL TRAFFIC
    # ---------------------------------------------

    cursor.execute("""
        SELECT COUNT(*) AS total
        FROM network_traffic
    """)

    total = cursor.fetchone()["total"]


    # ---------------------------------------------
    # NORMAL TRAFFIC
    # ---------------------------------------------

    cursor.execute("""
        SELECT COUNT(*) AS total
        FROM network_traffic
        WHERE prediction = 'Normal'
    """)

    normal = cursor.fetchone()["total"]


    # ---------------------------------------------
    # ANOMALIES
    # ---------------------------------------------

    cursor.execute("""
        SELECT COUNT(*) AS total
        FROM network_traffic
        WHERE prediction NOT IN ('Normal', 'Pending')
    """)

    anomalies = cursor.fetchone()["total"]


    # ---------------------------------------------
    # ALERTS
    # ---------------------------------------------

    cursor.execute("""
        SELECT COUNT(*) AS total
        FROM alerts
    """)

    alerts = cursor.fetchone()["total"]


    cursor.close()
    db.close()


    login_success = session.pop(
        "login_success",
        False
    )


    return render_template(
        "dashboard.html",

        user=user,

        total=total,

        normal=normal,

        anomalies=anomalies,

        alerts=alerts,

        login_success=login_success
    )


# =====================================================
# NETWORK DETECTION
# =====================================================

@app.route("/add-traffic", methods=["GET", "POST"])
def add_traffic():

    if "user_id" not in session:
        return redirect("/")

    if request.method == "POST":

        duration = request.form["duration"]
        protocol = request.form["protocol"]
        service = request.form["service"]
        flag = request.form["flag"]
        src_bytes = request.form["src_bytes"]
        dst_bytes = request.form["dst_bytes"]
        land = request.form["land"]
        wrong_fragment = request.form["wrong_fragment"]
        urgent = request.form["urgent"]

        db = get_db_connection()
        cursor = db.cursor()

        query = """
            INSERT INTO network_traffic
            (
                duration,
                protocol_type,
                service,
                flag,
                src_bytes,
                dst_bytes,
                land,
                wrong_fragment,
                urgent,
                prediction,
                confidence,
                risk_level
            )
            VALUES
            (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s,
                'Pending', 0, 'Unknown'
            )
        """

        cursor.execute(
            query,
            (
                duration,
                protocol,
                service,
                flag,
                src_bytes,
                dst_bytes,
                land,
                wrong_fragment,
                urgent
            )
        )

        db.commit()

        cursor.close()
        db.close()

        return redirect("/traffic")

    return render_template("detection.html")


# =====================================================
# TRAFFIC RECORDS
# =====================================================

@app.route("/traffic")
def traffic():

    if "user_id" not in session:
        return redirect("/")

    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    cursor.execute("""
        SELECT *
        FROM network_traffic
        ORDER BY id DESC
    """)

    records = cursor.fetchall()

    cursor.close()
    db.close()

    return render_template(
        "traffic.html",
        records=records
    )


# =====================================================
# SECURITY ALERTS
# =====================================================

@app.route("/alerts")
def alerts():

    if "user_id" not in session:
        return redirect("/")

    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    cursor.execute("""
        SELECT *
        FROM alerts
        ORDER BY id DESC
    """)

    alerts_data = cursor.fetchall()

    cursor.close()
    db.close()

    return render_template(
        "alerts.html",
        alerts=alerts_data
    )


# =====================================================
# LOGOUT
# =====================================================

@app.route("/logout")
def logout():

    session.clear()

    return redirect("/")


# =====================================================
# RUN
# =====================================================

if __name__ == "__main__":
    app.run(debug=True)