import { useMemo, useState } from 'react';


// =========================================================
// MODEL METRIC CARD
// =========================================================

function ModelMetricCard({
  title,
  value,
  description,
  icon,
}) {
  return (
    <div className="metric-card">

      <div className="metric-icon">
        {icon}
      </div>

      <div className="metric-info">

        <span>
          {title}
        </span>

        <strong>
          {value}
        </strong>

        <small>
          {description}
        </small>

      </div>

    </div>
  );
}


// =========================================================
// MODEL INFO
// =========================================================

function ModelInfo() {

  const [selectedModel, setSelectedModel] =
    useState('Random Forest');


  const modelDetails = useMemo(() => {

    const models = {

      'Random Forest': {
        role:
          'Supervised attack detection and attack-type classification',
        algorithm:
          'Random Forest',
        training:
          'CICIDS2017 network traffic dataset',
        purpose:
          'Identifies whether network traffic is benign or malicious and supports attack-type classification.',
        strengths:
          'Handles nonlinear relationships, mixed feature patterns and provides robust ensemble-based predictions.',
      },

      'Isolation Forest': {
        role:
          'Unsupervised anomaly detection',
        algorithm:
          'Isolation Forest',
        training:
          'Network traffic feature baseline',
        purpose:
          'Detects unusual traffic behaviour that differs from the learned normal baseline.',
        strengths:
          'Useful for identifying behavioural deviations and previously unseen abnormal traffic patterns.',
      },

      'Hybrid Detection': {
        role:
          'Final contextual security decision',
        algorithm:
          'Classifier + anomaly detection + contextual risk scoring',
        training:
          'Combined model outputs and security context',
        purpose:
          'Combines supervised attack probability, behavioural deviation, asset criticality and repetition context.',
        strengths:
          'Provides a more security-focused prioritization instead of relying only on classifier confidence.',
      },

    };

    return models[selectedModel];

  }, [selectedModel]);


  return (
    <div>


      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <div className="panel">

        <div className="panel-header">

          <div>

            <h2>
              Model Info
            </h2>

            <span>
              Machine learning models and predictive detection pipeline
            </span>

          </div>

        </div>

      </div>


      {/* =====================================================
          MODEL SUMMARY CARDS
      ===================================================== */}

      <div className="metrics-grid">

        <ModelMetricCard
          title="Primary Model"
          value="Random Forest"
          description="Supervised attack detection"
          icon="◆"
        />

        <ModelMetricCard
          title="Anomaly Model"
          value="Isolation Forest"
          description="Behavioural deviation detection"
          icon="◈"
        />

        <ModelMetricCard
          title="Reported F1"
          value="99.64%"
          description="CICIDS2017 validation metric"
          icon="✓"
        />

        <ModelMetricCard
          title="ROC-AUC"
          value="99.97%"
          description="Reported model performance"
          icon="⌁"
        />

      </div>


      {/* =====================================================
          MODEL SELECTOR
      ===================================================== */}

      <div className="panel">

        <div className="panel-header">

          <div>

            <h2>
              Model Architecture
            </h2>

            <span>
              Explore the role of each detection component
            </span>

          </div>

        </div>


        <div className="dashboard-grid">

          <div className="form-group">

            <label>
              Select Model
            </label>

            <select
              value={selectedModel}
              onChange={(event) =>
                setSelectedModel(
                  event.target.value
                )
              }
            >

              <option value="Random Forest">
                Random Forest
              </option>

              <option value="Isolation Forest">
                Isolation Forest
              </option>

              <option value="Hybrid Detection">
                Hybrid Detection
              </option>

            </select>

          </div>


          <div className="form-group">

            <label>
              Algorithm
            </label>

            <input
              type="text"
              value={modelDetails.algorithm}
              readOnly
            />

          </div>

        </div>

      </div>


      {/* =====================================================
          SELECTED MODEL DETAILS
      ===================================================== */}

      <div className="panel">

        <div className="panel-header">

          <div>

            <h2>
              {selectedModel}
            </h2>

            <span>
              {modelDetails.role}
            </span>

          </div>

          <span className="table-role">
            MODEL ACTIVE
          </span>

        </div>


        <div className="dashboard-grid">

          <div className="form-group">

            <label>
              Role
            </label>

            <input
              type="text"
              value={modelDetails.role}
              readOnly
            />

          </div>


          <div className="form-group">

            <label>
              Training Source
            </label>

            <input
              type="text"
              value={modelDetails.training}
              readOnly
            />

          </div>

        </div>


        <div
          className="panel"
          style={{
            marginTop: '18px',
            marginBottom: '0',
          }}
        >

          <div className="panel-header">

            <div>

              <h3>
                Purpose
              </h3>

              <span>
                How this component contributes to detection
              </span>

            </div>

          </div>

          <p>
            {modelDetails.purpose}
          </p>

        </div>


        <div
          className="panel"
          style={{
            marginTop: '18px',
            marginBottom: '0',
          }}
        >

          <div className="panel-header">

            <div>

              <h3>
                Key Strengths
              </h3>

              <span>
                Operational value of this model
              </span>

            </div>

          </div>

          <p>
            {modelDetails.strengths}
          </p>

        </div>

      </div>


      {/* =====================================================
          PERFORMANCE METRICS
      ===================================================== */}

      <div className="panel">

        <div className="panel-header">

          <div>

            <h2>
              Reported Model Performance
            </h2>

            <span>
              CICIDS2017 evaluation metrics reported for the project
            </span>

          </div>

        </div>


        <div className="alert-table">

          <table>

            <thead>

              <tr>

                <th>
                  Metric
                </th>

                <th>
                  Value
                </th>

                <th>
                  Interpretation
                </th>

              </tr>

            </thead>


            <tbody>

              <tr>

                <td>
                  Accuracy
                </td>

                <td>
                  <strong>
                    99.78%
                  </strong>
                </td>

                <td>
                  Overall classification correctness
                </td>

              </tr>


              <tr>

                <td>
                  Precision
                </td>

                <td>
                  <strong>
                    99.68%
                  </strong>
                </td>

                <td>
                  Reliability of positive attack predictions
                </td>

              </tr>


              <tr>

                <td>
                  Recall
                </td>

                <td>
                  <strong>
                    99.60%
                  </strong>
                </td>

                <td>
                  Ability to identify malicious traffic
                </td>

              </tr>


              <tr>

                <td>
                  F1 Score
                </td>

                <td>
                  <strong>
                    99.64%
                  </strong>
                </td>

                <td>
                  Balance between precision and recall
                </td>

              </tr>


              <tr>

                <td>
                  ROC-AUC
                </td>

                <td>
                  <strong>
                    99.97%
                  </strong>
                </td>

                <td>
                  Discrimination capability across thresholds
                </td>

              </tr>

            </tbody>

          </table>

        </div>

      </div>


      {/* =====================================================
          DETECTION PIPELINE
      ===================================================== */}

      <div className="panel">

        <div className="panel-header">

          <div>

            <h2>
              Predictive Detection Pipeline
            </h2>

            <span>
              How network traffic moves through NetShield AI
            </span>

          </div>

        </div>


        <div className="dashboard-grid">

          <div className="panel">

            <h3>
              01. Feature Processing
            </h3>

            <p>
              Network flow features are normalized and prepared for
              machine learning analysis.
            </p>

          </div>


          <div className="panel">

            <h3>
              02. Attack Classification
            </h3>

            <p>
              The Random Forest classifier evaluates the traffic and
              estimates malicious activity and attack type.
            </p>

          </div>


          <div className="panel">

            <h3>
              03. Behaviour Analysis
            </h3>

            <p>
              Isolation Forest evaluates whether the observed traffic
              deviates from the expected behavioural baseline.
            </p>

          </div>


          <div className="panel">

            <h3>
              04. Contextual Risk Scoring
            </h3>

            <p>
              Model confidence, behavioural deviation, asset context
              and repeated activity contribute to security prioritization.
            </p>

          </div>


          <div className="panel">

            <h3>
              05. Alert Prioritization
            </h3>

            <p>
              Suspicious activity is converted into actionable security
              alerts based on its calculated risk level.
            </p>

          </div>


          <div className="panel">

            <h3>
              06. Analyst Investigation
            </h3>

            <p>
              Analysts can review alerts, create incidents, investigate
              activity and track the response lifecycle.
            </p>

          </div>

        </div>

      </div>


      {/* =====================================================
          MODEL STATUS
      ===================================================== */}

      <div className="panel">

        <div className="panel-header">

          <div>

            <h2>
              Model Status
            </h2>

            <span>
              Current predictive monitoring configuration
            </span>

          </div>

          <span className="risk-badge low">
            ONLINE
          </span>

        </div>


        <div className="alert-table">

          <table>

            <thead>

              <tr>

                <th>
                  Component
                </th>

                <th>
                  Status
                </th>

                <th>
                  Function
                </th>

              </tr>

            </thead>


            <tbody>

              <tr>

                <td>
                  Random Forest
                </td>

                <td>
                  <span className="risk-badge low">
                    ACTIVE
                  </span>
                </td>

                <td>
                  Attack detection and classification
                </td>

              </tr>


              <tr>

                <td>
                  Isolation Forest
                </td>

                <td>
                  <span className="risk-badge low">
                    ACTIVE
                  </span>
                </td>

                <td>
                  Behavioural anomaly detection
                </td>

              </tr>


              <tr>

                <td>
                  Risk Scoring
                </td>

                <td>
                  <span className="risk-badge low">
                    ACTIVE
                  </span>
                </td>

                <td>
                  Context-aware threat prioritization
                </td>

              </tr>

            </tbody>

          </table>

        </div>

      </div>


    </div>
  );
}


export default ModelInfo;