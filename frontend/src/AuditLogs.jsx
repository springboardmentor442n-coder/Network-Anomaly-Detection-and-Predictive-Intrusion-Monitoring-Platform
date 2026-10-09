import { useEffect, useMemo, useState } from 'react';


const API_URL = 'http://127.0.0.1:8000';


// =========================================================
// AUDIT METRIC CARD
// =========================================================

function AuditMetricCard({
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
// AUDIT LOGS
// =========================================================

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [totalLogs, setTotalLogs] = useState(0);


  // =======================================================
  // FETCH AUDIT LOGS
  // =======================================================

  const fetchAuditLogs = async () => {
    const token = localStorage.getItem(
      'netshield_token'
    );

    if (!token) {
      setError(
        'Authentication token not found. Please login again.'
      );
      setLoading(false);
      return;
    }

    try {
      setError('');

      const response = await fetch(
        `${API_URL}/audit-logs`,
        {
          method: 'GET',
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );


      if (response.status === 401) {
        throw new Error(
          'Authentication expired. Please login again.'
        );
      }


      if (response.status === 403) {
        throw new Error(
          'You do not have permission to view audit logs.'
        );
      }


      if (!response.ok) {
        throw new Error(
          `Audit Logs service returned HTTP ${response.status}`
        );
      }


      const data =
        await response.json();


      setLogs(
        Array.isArray(data.logs)
          ? data.logs
          : []
      );


      setTotalLogs(
        Number(
          data.total_logs || 0
        )
      );


      setLastUpdated(
        new Date()
      );

    } catch (err) {
      setError(
        err.message ||
        'Unable to load audit logs.'
      );

    } finally {
      setLoading(false);
    }
  };


  // =======================================================
  // INITIAL LOAD + AUTO REFRESH
  // =======================================================

  useEffect(() => {
    fetchAuditLogs();

    const intervalId =
      setInterval(
        fetchAuditLogs,
        10000
      );

    return () => {
      clearInterval(
        intervalId
      );
    };
  }, []);


  // =======================================================
  // FILTER OPTIONS
  // =======================================================

  const moduleOptions = useMemo(() => {
    const values = new Set();

    logs.forEach((log) => {
      if (log.module) {
        values.add(log.module);
      }
    });

    return Array.from(values).sort();
  }, [logs]);


  const actionOptions = useMemo(() => {
    const values = new Set();

    logs.forEach((log) => {
      if (log.action) {
        values.add(log.action);
      }
    });

    return Array.from(values).sort();
  }, [logs]);


  // =======================================================
  // FILTERED LOGS
  // =======================================================

  const filteredLogs = useMemo(() => {
    const normalizedSearch =
      searchTerm
        .trim()
        .toLowerCase();


    return logs.filter(
      (log) => {

        const searchableText = [
          log.user,
          log.action,
          log.module,
          log.severity,
          log.description,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();


        const matchesSearch =
          !normalizedSearch ||
          searchableText.includes(
            normalizedSearch
          );


        const matchesSeverity =
          severityFilter === 'ALL' ||
          (
            log.severity ||
            'INFO'
          ).toUpperCase() ===
          severityFilter;


        const matchesModule =
          moduleFilter === 'ALL' ||
          (
            log.module ||
            'UNKNOWN'
          ) === moduleFilter;


        const matchesAction =
          actionFilter === 'ALL' ||
          (
            log.action ||
            'UNKNOWN'
          ) === actionFilter;


        return (
          matchesSearch &&
          matchesSeverity &&
          matchesModule &&
          matchesAction
        );

      }
    );

  }, [
    logs,
    searchTerm,
    severityFilter,
    moduleFilter,
    actionFilter,
  ]);


  // =======================================================
  // SUMMARY COUNTS
  // =======================================================

  const criticalCount =
    logs.filter(
      (log) =>
        (
          log.severity ||
          ''
        ).toUpperCase() ===
        'CRITICAL'
    ).length;


  const highCount =
    logs.filter(
      (log) =>
        (
          log.severity ||
          ''
        ).toUpperCase() ===
        'HIGH'
    ).length;


  const infoCount =
    logs.filter(
      (log) => {
        const severity =
          (
            log.severity ||
            'INFO'
          ).toUpperCase();

        return (
          severity === 'INFO' ||
          severity === 'LOW' ||
          severity === 'MEDIUM'
        );
      }
    ).length;


  // =======================================================
  // DATE FORMATTER
  // =======================================================

  const formatDateTime = (
    timestamp
  ) => {

    if (!timestamp) {
      return 'System event';
    }


    const date =
      new Date(timestamp);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return timestamp;
    }


    return date.toLocaleString();
  };


  // =======================================================
  // SEVERITY CLASS
  // =======================================================

  const getSeverityClass =
    (severity) => {

      return (
        `risk-badge ${
          (
            severity ||
            'INFO'
          ).toLowerCase()
        }`
      );

    };


  // =======================================================
  // LOADING STATE
  // =======================================================

  if (
    loading &&
    logs.length === 0
  ) {
    return (
      <div className="panel">

        <div className="panel-header">

          <div>

            <h2>
              Audit Logs
            </h2>

            <span>
              Security activity and system audit trail
            </span>

          </div>

        </div>


        <div className="monitoring-placeholder">

          <span>
            ◌
          </span>

          <h3>
            Loading Audit Logs
          </h3>

          <p>
            Retrieving recent security and administrative events...
          </p>

        </div>

      </div>
    );
  }


  // =======================================================
  // ERROR STATE
  // =======================================================

  if (
    error &&
    logs.length === 0
  ) {
    return (
      <div className="panel">

        <div className="panel-header">

          <div>

            <h2>
              Audit Logs
            </h2>

            <span>
              Security activity and system audit trail
            </span>

          </div>

        </div>


        <div className="alert-table">

          <p className="login-error">
            {error}
          </p>


          <button
            className="primary-button"
            onClick={fetchAuditLogs}
          >
            Retry
          </button>

        </div>

      </div>
    );
  }


  return (
    <div>


      {/* =================================================
          PAGE HEADER
          ================================================= */}

      <div className="panel">

        <div className="panel-header">

          <div>

            <h2>
              Audit Logs
            </h2>

            <span>
              Security activity and administrative audit trail
            </span>

            {lastUpdated && (
              <span>
                Updated:{' '}
                {lastUpdated.toLocaleTimeString()}
              </span>
            )}

          </div>


          <button
            className="primary-button"
            onClick={fetchAuditLogs}
          >
            Refresh Logs
          </button>

        </div>


        {error && (
          <p className="login-error">
            {error}
          </p>
        )}

      </div>


      {/* =================================================
          SUMMARY CARDS
          ================================================= */}

      <div className="metrics-grid">

        <AuditMetricCard
          title="Total Events"
          value={totalLogs.toLocaleString()}
          description="Available audit events"
          icon="▣"
        />


        <AuditMetricCard
          title="Critical Events"
          value={criticalCount.toLocaleString()}
          description="Critical security activity"
          icon="⚠"
        />


        <AuditMetricCard
          title="High Severity"
          value={highCount.toLocaleString()}
          description="High-risk activity"
          icon="◆"
        />


        <AuditMetricCard
          title="Other Events"
          value={infoCount.toLocaleString()}
          description="Informational and general activity"
          icon="◈"
        />

      </div>


      {/* =================================================
          FILTERS
          ================================================= */}

      <div className="panel">

        <div className="panel-header">

          <div>

            <h2>
              Search & Filters
            </h2>

            <span>
              Narrow the audit trail by event properties
            </span>

          </div>

        </div>


        <div className="dashboard-grid">

          <div className="form-group">

            <label>
              Search
            </label>

            <input
              type="text"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value
                )
              }
              placeholder="Search user, action, module or description"
            />

          </div>


          <div className="form-group">

            <label>
              Severity
            </label>

            <select
              value={severityFilter}
              onChange={(event) =>
                setSeverityFilter(
                  event.target.value
                )
              }
            >

              <option value="ALL">
                All severities
              </option>

              <option value="CRITICAL">
                Critical
              </option>

              <option value="HIGH">
                High
              </option>

              <option value="MEDIUM">
                Medium
              </option>

              <option value="LOW">
                Low
              </option>

              <option value="INFO">
                Info
              </option>

            </select>

          </div>


          <div className="form-group">

            <label>
              Module
            </label>

            <select
              value={moduleFilter}
              onChange={(event) =>
                setModuleFilter(
                  event.target.value
                )
              }
            >

              <option value="ALL">
                All modules
              </option>

              {moduleOptions.map(
                (module) => (
                  <option
                    key={module}
                    value={module}
                  >
                    {module}
                  </option>
                )
              )}

            </select>

          </div>


          <div className="form-group">

            <label>
              Action
            </label>

            <select
              value={actionFilter}
              onChange={(event) =>
                setActionFilter(
                  event.target.value
                )
              }
            >

              <option value="ALL">
                All actions
              </option>

              {actionOptions.map(
                (action) => (
                  <option
                    key={action}
                    value={action}
                  >
                    {action}
                  </option>
                )
              )}

            </select>

          </div>

        </div>


        <div className="panel-header">

          <span>
            Showing{' '}
            {filteredLogs.length.toLocaleString()}
            {' '}
            of{' '}
            {logs.length.toLocaleString()}
            {' '}
            loaded events
          </span>

          <button
            className="primary-button"
            onClick={() => {
              setSearchTerm('');
              setSeverityFilter('ALL');
              setModuleFilter('ALL');
              setActionFilter('ALL');
            }}
          >
            Clear Filters
          </button>

        </div>

      </div>


      {/* =================================================
          AUDIT TABLE
          ================================================= */}

      <div className="panel">

        <div className="panel-header">

          <div>

            <h2>
              Security Audit Trail
            </h2>

            <span>
              Latest system, alert and incident activity
            </span>

          </div>

        </div>


        {filteredLogs.length === 0 ? (

          <div className="monitoring-placeholder">

            <span>
              ◇
            </span>

            <h3>
              No Matching Events
            </h3>

            <p>
              No audit records match the current search and filter settings.
            </p>

          </div>

        ) : (

          <div className="alert-table">

            <table>

              <thead>

                <tr>

                  <th>
                    Timestamp
                  </th>

                  <th>
                    User
                  </th>

                  <th>
                    Action
                  </th>

                  <th>
                    Module
                  </th>

                  <th>
                    Severity
                  </th>

                  <th>
                    Description
                  </th>

                </tr>

              </thead>


              <tbody>

                {filteredLogs.map(
                  (log, index) => (

                    <tr
                      key={`audit-${index}-${log.timestamp || 'system'}`}
                    >

                      <td>
                        {formatDateTime(
                          log.timestamp
                        )}
                      </td>


                      <td>

                        <strong>
                          {log.user ||
                            'SYSTEM'}
                        </strong>

                      </td>


                      <td>

                        <span className="table-role">
                          {log.action ||
                            'UNKNOWN'}
                        </span>

                      </td>


                      <td>
                        {log.module ||
                          'Unknown'}
                      </td>


                      <td>

                        <span
                          className={getSeverityClass(
                            log.severity
                          )}
                        >
                          {(
                            log.severity ||
                            'INFO'
                          ).toUpperCase()}
                        </span>

                      </td>


                      <td>
                        {log.description ||
                          'No description available.'}
                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>


    </div>
  );
}


export default AuditLogs;