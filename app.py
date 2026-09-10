from flask import Flask, render_template, request, redirect, session
import mysql.connector
import joblib
import os
import pandas as pd
import numpy as np


app = Flask(__name__)
app.secret_key = "network_intrusion_secret_key"


# =====================================================
# PATH CONFIGURATION
# =====================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_DIR = os.path.join(BASE_DIR, "model")

MODEL_PATH = os.path.join(
    MODEL_DIR,
    "unsw_nb15_xgboost_model.joblib"
)

ENCODER_PATH = os.path.join(
    MODEL_DIR,
    "unsw_nb15_feature_encoders.joblib"
)

FEATURE_PATH = os.path.join(
    MODEL_DIR,
    "unsw_nb15_features.joblib"
)


# =====================================================
# LOAD XGBOOST MODEL
# =====================================================

try:

    model = joblib.load(MODEL_PATH)

    encoders = joblib.load(ENCODER_PATH)

    feature_names = joblib.load(FEATURE_PATH)

    print("==========================================")
    print("UNSW-NB15 XGBoost Model Loaded Successfully")
    print("==========================================")
    print("Model:", type(model).__name__)
    print("Number of features:", len(feature_names))
    print("Features:")

    for feature in feature_names:
        print(" -", feature)

    print("==========================================")

except Exception as e:

    print("==========================================")
    print("ERROR LOADING MACHINE LEARNING MODEL")
    print("==========================================")
    print(e)

    model = None
    encoders = {}
    feature_names = []


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

    cursor.execute(
        query,
        (username, password)
    )

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
# DASHBOARD
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
    # ATTACKS / ANOMALIES
    # ---------------------------------------------

    cursor.execute("""
        SELECT COUNT(*) AS total
        FROM network_traffic
        WHERE prediction = 'Attack'
    """)

    anomalies = cursor.fetchone()["total"]


    # ---------------------------------------------
    # SECURITY ALERTS
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
# CONVERT FORM VALUE TO FLOAT
# =====================================================

def get_float(form, name):

    value = form.get(name, "0")

    if value == "":
        return 0.0

    try:

        return float(value)

    except ValueError:

        return 0.0


# =====================================================
# CONVERT FORM VALUE TO INTEGER
# =====================================================

def get_int(form, name):

    value = form.get(name, "0")

    if value == "":
        return 0

    try:

        return int(float(value))

    except ValueError:

        return 0


# =====================================================
# PREPARE UNSW-NB15 FEATURES
# =====================================================

def prepare_prediction_data(form):

    # ---------------------------------------------
    # Create dictionary
    # ---------------------------------------------

    data = {}


    # ---------------------------------------------
    # Numeric features
    # ---------------------------------------------

    numeric_features = [

        "dur",

        "spkts",

        "dpkts",

        "sbytes",

        "dbytes",

        "rate",

        "sload",

        "dload",

        "sloss",

        "dloss",

        "sinpkt",

        "dinpkt",

        "sjit",

        "djit",

        "swin",

        "stcpb",

        "dtcpb",

        "dwin",

        "tcprtt",

        "synack",

        "ackdat",

        "smean",

        "dmean",

        "trans_depth",

        "response_body_len",

        "ct_src_dport_ltm",

        "ct_dst_sport_ltm",

        "is_ftp_login",

        "ct_ftp_cmd",

        "ct_flw_http_mthd",

        "is_sm_ips_ports"

    ]


    for feature in numeric_features:

        data[feature] = get_float(
            form,
            feature
        )


    # ---------------------------------------------
    # Categorical features
    # ---------------------------------------------

    data["proto"] = form.get(
        "proto",
        ""
    )

    data["service"] = form.get(
        "service",
        ""
    )

    data["state"] = form.get(
        "state",
        ""
    )


    # ---------------------------------------------
    # Convert to DataFrame
    # ---------------------------------------------

    df = pd.DataFrame([data])


    # ---------------------------------------------
    # Encode categorical columns
    # ---------------------------------------------

    categorical_columns = [
        "proto",
        "service",
        "state"
    ]


    for column in categorical_columns:

        if column in encoders:

            encoder = encoders[column]

            value = str(df.loc[0, column])


            # -------------------------------------
            # Handle unknown categories
            # -------------------------------------

            if value in encoder.classes_:

                df[column] = encoder.transform(
                    [value]
                )

            else:

                # Use first known category
                # instead of crashing

                df[column] = encoder.transform(
                    [encoder.classes_[0]]
                )


        else:

            df[column] = 0


    # ---------------------------------------------
    # Make sure exact training order is used
    # ---------------------------------------------

    for feature in feature_names:

        if feature not in df.columns:

            df[feature] = 0


    df = df[feature_names]


    # ---------------------------------------------
    # Clean values
    # ---------------------------------------------

    df = df.replace(
        [np.inf, -np.inf],
        np.nan
    )

    df = df.fillna(0)


    return df


# =====================================================
# CALCULATE RISK LEVEL
# =====================================================

def calculate_risk(prediction, confidence):

    if prediction == "Normal":

        return "Low"


    if confidence >= 90:

        return "High"


    elif confidence >= 70:

        return "Medium"


    else:

        return "Low"


# =====================================================
# NETWORK DETECTION
# =====================================================

@app.route(
    "/add-traffic",
    methods=["GET", "POST"]
)
def add_traffic():

    if "user_id" not in session:

        return redirect("/")


    if request.method == "POST":

        # -----------------------------------------
        # Check model
        # -----------------------------------------

        if model is None:

            return render_template(
                "detection.html",
                error="XGBoost model is not loaded."
            )


        try:

            # -------------------------------------
            # Prepare input
            # -------------------------------------

            input_data = prepare_prediction_data(
                request.form
            )


            # -------------------------------------
            # Make prediction
            # -------------------------------------

            prediction_value = model.predict(
                input_data
            )[0]


            # -------------------------------------
            # Prediction probability
            # -------------------------------------

            probabilities = model.predict_proba(
                input_data
            )[0]


            confidence = float(
                max(probabilities) * 100
            )


            # -------------------------------------
            # Convert prediction
            # -------------------------------------

            if int(prediction_value) == 0:

                prediction = "Normal"

            else:

                prediction = "Attack"


            # -------------------------------------
            # Risk level
            # -------------------------------------

            risk_level = calculate_risk(
                prediction,
                confidence
            )


            # -------------------------------------
            # Save to database
            # -------------------------------------

            db = get_db_connection()

            cursor = db.cursor()


            # -------------------------------------
            # Insert network traffic
            # -------------------------------------

            query = """
                INSERT INTO network_traffic
                (
                    dur,
                    proto,
                    service,
                    state,
                    spkts,
                    dpkts,
                    sbytes,
                    dbytes,
                    rate,
                    sload,
                    dload,
                    sloss,
                    dloss,
                    sinpkt,
                    dinpkt,
                    sjit,
                    djit,
                    swin,
                    stcpb,
                    dtcpb,
                    dwin,
                    tcprtt,
                    synack,
                    ackdat,
                    smean,
                    dmean,
                    trans_depth,
                    response_body_len,
                    ct_src_dport_ltm,
                    ct_dst_sport_ltm,
                    is_ftp_login,
                    ct_ftp_cmd,
                    ct_flw_http_mthd,
                    is_sm_ips_ports,
                    prediction,
                    confidence,
                    risk_level
                )
                VALUES
                (
                    %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s
                )
            """


            values = [

                float(input_data["dur"].iloc[0]),

                request.form.get("proto", ""),

                request.form.get("service", ""),

                request.form.get("state", ""),

                float(input_data["spkts"].iloc[0]),

                float(input_data["dpkts"].iloc[0]),

                float(input_data["sbytes"].iloc[0]),

                float(input_data["dbytes"].iloc[0]),

                float(input_data["rate"].iloc[0]),

                float(input_data["sload"].iloc[0]),

                float(input_data["dload"].iloc[0]),

                float(input_data["sloss"].iloc[0]),

                float(input_data["dloss"].iloc[0]),

                float(input_data["sinpkt"].iloc[0]),

                float(input_data["dinpkt"].iloc[0]),

                float(input_data["sjit"].iloc[0]),

                float(input_data["djit"].iloc[0]),

                float(input_data["swin"].iloc[0]),

                float(input_data["stcpb"].iloc[0]),

                float(input_data["dtcpb"].iloc[0]),

                float(input_data["dwin"].iloc[0]),

                float(input_data["tcprtt"].iloc[0]),

                float(input_data["synack"].iloc[0]),

                float(input_data["ackdat"].iloc[0]),

                float(input_data["smean"].iloc[0]),

                float(input_data["dmean"].iloc[0]),

                float(input_data["trans_depth"].iloc[0]),

                float(input_data["response_body_len"].iloc[0]),

                float(input_data["ct_src_dport_ltm"].iloc[0]),

                float(input_data["ct_dst_sport_ltm"].iloc[0]),

                float(input_data["is_ftp_login"].iloc[0]),

                float(input_data["ct_ftp_cmd"].iloc[0]),

                float(input_data["ct_flw_http_mthd"].iloc[0]),

                float(input_data["is_sm_ips_ports"].iloc[0]),

                prediction,

                confidence,

                risk_level
            ]


            cursor.execute(
                query,
                values
            )

            traffic_id = cursor.lastrowid


            # -------------------------------------
            # Create security alert
            # -------------------------------------

            if prediction == "Attack":

                alert_query = """
                    INSERT INTO alerts
                    (
                        traffic_id,
                        alert_type,
                        message,
                        risk_level
                    )
                    VALUES
                    (%s, %s, %s, %s)
                """


                alert_message = (
                    "Network attack detected. "
                    f"Confidence: {confidence:.2f}%"
                )


                cursor.execute(
                    alert_query,
                    (
                        traffic_id,
                        "Intrusion Detected",
                        alert_message,
                        risk_level
                    )
                )


            db.commit()


            cursor.close()

            db.close()


            # -------------------------------------
            # Display result
            # -------------------------------------

            return render_template(
                "detection.html",

                prediction=prediction,

                confidence=f"{confidence:.2f}",

                risk_level=risk_level
            )


        except Exception as e:

            print("Prediction Error:", e)

            return render_template(
                "detection.html",

                error=f"Prediction error: {str(e)}"
            )


    return render_template(
        "detection.html"
    )


# =====================================================
# TRAFFIC RECORDS
# =====================================================

@app.route("/traffic")
def traffic():

    if "user_id" not in session:

        return redirect("/")


    db = get_db_connection()

    cursor = db.cursor(
        dictionary=True
    )


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

    cursor = db.cursor(
        dictionary=True
    )


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
# MODEL TEST
# =====================================================

@app.route("/model-test")
def model_test():

    if model is None:

        return """
        <h2>❌ XGBoost Model Not Loaded</h2>
        """


    return f"""
    <h2>UNSW-NB15 XGBoost Model Loaded Successfully ✅</h2>

    <p>
        <strong>Model:</strong>
        {type(model).__name__}
    </p>

    <p>
        <strong>Number of features:</strong>
        {len(feature_names)}
    </p>

    <h3>Features</h3>

    <pre>
{feature_names}
    </pre>
    """


# =====================================================
# LOGOUT
# =====================================================

@app.route("/logout")
def logout():

    session.clear()

    return redirect("/")


# =====================================================
# RUN APPLICATION
# =====================================================

if __name__ == "__main__":

    app.run(
        debug=True
    )