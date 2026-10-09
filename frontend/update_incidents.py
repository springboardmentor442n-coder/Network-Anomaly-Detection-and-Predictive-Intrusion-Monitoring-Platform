from pathlib import Path
import re


APP_FILE = Path("src/App.jsx")


if not APP_FILE.exists():
    raise FileNotFoundError(
        f"Could not find {APP_FILE.resolve()}"
    )


content = APP_FILE.read_text(
    encoding="utf-8"
)


# ---------------------------------------------------------
# 1. ADD INCIDENTS TO SIDEBAR NAVIGATION
# ---------------------------------------------------------

if "name: 'Incidents'" not in content:

    risk_navigation = re.search(
        r"""(\{\s*name:\s*['"]Risk Analysis['"].*?\n\s*\},?)""",
        content,
        re.DOTALL,
    )

    if risk_navigation:
        insertion = (
            risk_navigation.group(1)
            + """
    {
      name: 'Incidents',
      icon: '⚡',
    },"""
        )

        content = (
            content[:risk_navigation.start()]
            + insertion
            + content[risk_navigation.end():]
        )

    else:
        analytics_navigation = re.search(
            r"""(\{\s*name:\s*['"]Analytics['"].*?\n\s*\},?)""",
            content,
            re.DOTALL,
        )

        if not analytics_navigation:
            raise RuntimeError(
                "Could not find Analytics or Risk Analysis "
                "navigation item."
            )

        insertion = (
            analytics_navigation.group(1)
            + """
    {
      name: 'Risk Analysis',
      icon: '◈',
    },
    {
      name: 'Incidents',
      icon: '⚡',
    },"""
        )

        content = (
            content[:analytics_navigation.start()]
            + insertion
            + content[analytics_navigation.end():]
        )


# ---------------------------------------------------------
# 2. ADD INCIDENTS PAGE ROUTE
# ---------------------------------------------------------

if "case 'Incidents':" not in content:

    analytics_case = re.search(
        r"""(\s*case\s+['"]Analytics['"]:\s*
\s*return\s+<Analytics\s*\/>;\s*)""",
        content,
        re.DOTALL,
    )

    if not analytics_case:
        raise RuntimeError(
            "Could not find Analytics render route."
        )

    insertion = analytics_case.group(1) + """
      case 'Risk Analysis':
        return <RiskAnalysis />;

      case 'Incidents':
        return <Incidents />;

"""

    content = (
        content[:analytics_case.start()]
        + insertion
        + content[analytics_case.end():]
    )


# ---------------------------------------------------------
# 3. ADD INCIDENT COMPONENT
# ---------------------------------------------------------

if "function Incidents()" not in content:

    marker = (
        "// ---------------------------------------------------------\n"
        "// USER MANAGEMENT"
    )

    if marker not in content:
        raise RuntimeError(
            "Could not find the User Management section."
        )


    incident_component = r'''
// ---------------------------------------------------------
// INCIDENT MANAGEMENT
// ---------------------------------------------------------

function Incidents() {
  const [incidents, setIncidents] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [severityFilter, setSeverityFilter] =
    useState('');

  const [statusFilter, setStatusFilter] =
    useState('');

  const [selectedIncident, setSelectedIncident] =
    useState(null);

  const [note, setNote] =
    useState('');

  const [savingNote, setSavingNote] =
    useState(false);


  const fetchIncidents = async () => {
    const token =
      localStorage.getItem(
        'netshield_token'
      );

    if (!token) {
      setError(
        'Authentication token not found.'
      );

      setLoading(false);
      return;
    }

    try {
      setError('');

      const params =
        new URLSearchParams();

      if (severityFilter) {
        params.set(
          'severity',
          severityFilter
        );
      }

      if (statusFilter) {
        params.set(
          'incident_status',
          statusFilter
        );
      }

      const query =
        params.toString();

      const response =
        await fetch(
          `${API_URL}/incidents${
            query
              ? `?${query}`
              : ''
          }`,
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


      if (!response.ok) {
        throw new Error(
          `Incident service returned HTTP ${response.status}`
        );
      }


      const data =
        await response.json();

      setIncidents(data);

    } catch (err) {
      setError(
        err.message ||
        'Unable to load incidents.'
      );

    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchIncidents();
  }, [
    severityFilter,
    statusFilter,
  ]);


  const updateIncident =
    async (
      incidentId,
      payload
    ) => {

      const token =
        localStorage.getItem(
          'netshield_token'
        );

      if (!token) {
        setError(
          'Authentication token not found.'
        );
        return;
      }

      try {
        setError('');

        const response =
          await fetch(
            `${API_URL}/incidents/${incidentId}`,
            {
              method: 'PATCH',

              headers: {
                'Content-Type':
                  'application/json',

                Authorization:
                  `Bearer ${token}`,
              },

              body: JSON.stringify(
                payload
              ),
            }
          );


        if (response.status === 401) {
          throw new Error(
            'Authentication expired. Please login again.'
          );
        }


        const data =
          await response.json()
            .catch(
              () => ({})
            );


        if (!response.ok) {
          throw new Error(
            data.detail ||
            'Unable to update incident.'
          );
        }


        await fetchIncidents();

      } catch (err) {
        setError(
          err.message ||
          'Unable to update incident.'
        );
      }
    };


  const addNote = async () => {

    if (!selectedIncident) {
      return;
    }


    if (!note.trim()) {
      setError(
        'Investigation note cannot be empty.'
      );
      return;
    }


    const token =
      localStorage.getItem(
        'netshield_token'
      );


    if (!token) {
      setError(
        'Authentication token not found.'
      );
      return;
    }


    try {
      setSavingNote(true);
      setError('');


      const response =
        await fetch(
          `${API_URL}/incidents/${selectedIncident.incident_id}/notes`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',

              Authorization:
                `Bearer ${token}`,
            },

            body: JSON.stringify({
              note: note.trim(),
            }),
          }
        );


      if (response.status === 401) {
        throw new Error(
          'Authentication expired. Please login again.'
        );
      }


      const data =
        await response.json()
          .catch(
            () => ({})
          );


      if (!response.ok) {
        throw new Error(
          data.detail ||
          'Unable to add investigation note.'
        );
      }


      setNote('');
      setSelectedIncident(data);

      await fetchIncidents();

    } catch (err) {
      setError(
        err.message ||
        'Unable to add investigation note.'
      );

    } finally {
      setSavingNote(false);
    }
  };


  const createFromAlert =
    async () => {

      const token =
        localStorage.getItem(
          'netshield_token'
        );


      if (!token) {
        setError(
          'Authentication token not found.'
        );
        return;
      }


      try {
        setError('');


        const alertResponse =
          await fetch(
            `${API_URL}/alerts`,
            {
              method: 'GET',

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );


        if (
          alertResponse.status === 401
        ) {
          throw new Error(
            'Authentication expired. Please login again.'
          );
        }


        if (!alertResponse.ok) {
          throw new Error(
            'Unable to load alerts.'
          );
        }


        const alerts =
          await alertResponse.json();


        const candidate =
          alerts.find(
            (alert) => {

              const level =
                (
                  alert.risk_level ||
                  ''
                ).toUpperCase();

              return (
                level === 'CRITICAL' ||
                level === 'HIGH'
              );
            }
          );


        if (!candidate) {
          throw new Error(
            'No HIGH or CRITICAL alert is available.'
          );
        }


        const response =
          await fetch(
            `${API_URL}/incidents/from-alert/${candidate.alert_id}`,
            {
              method: 'POST',

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );


        const data =
          await response.json()
            .catch(
              () => ({})
            );


        if (!response.ok) {
          throw new Error(
            data.detail ||
            'Unable to create incident from alert.'
          );
        }


        await fetchIncidents();

        setSelectedIncident(data);

      } catch (err) {
        setError(
          err.message ||
          'Unable to create incident.'
        );
      }
    };


  if (loading) {
    return (
      <div className="panel">

        <div className="panel-header">

          <div>
            <h2>
              Incident Management
            </h2>

            <span>
              Security incidents requiring investigation
            </span>
          </div>

        </div>


        <div className="monitoring-placeholder">

          <h3>
            Loading incidents...
          </h3>

        </div>

      </div>
    );
  }


  return (
    <div>

      <div className="panel">

        <div className="panel-header">

          <div>

            <h2>
              Incident Management
            </h2>

            <span>
              Security incidents requiring investigation
            </span>

          </div>


          <button
            className="primary-button"
            onClick={createFromAlert}
          >
            + Create From Alert
          </button>

        </div>


        {error && (
          <p className="login-error">
            {error}
          </p>
        )}


        <div
          style={{
            display: 'flex',
            gap: '10px',
            marginBottom: '20px',
            flexWrap: 'wrap',
          }}
        >

          <select
            value={severityFilter}
            onChange={(event) =>
              setSeverityFilter(
                event.target.value
              )
            }
          >

            <option value="">
              All Severities
            </option>

            <option value="CRITICAL">
              CRITICAL
            </option>

            <option value="HIGH">
              HIGH
            </option>

            <option value="MEDIUM">
              MEDIUM
            </option>

            <option value="LOW">
              LOW
            </option>

          </select>


          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
          >

            <option value="">
              All Statuses
            </option>

            <option value="OPEN">
              OPEN
            </option>

            <option value="INVESTIGATING">
              INVESTIGATING
            </option>

            <option value="RESOLVED">
              RESOLVED
            </option>

            <option value="CLOSED">
              CLOSED
            </option>

          </select>

        </div>


        {incidents.length === 0 ? (

          <div className="monitoring-placeholder">

            <h3>
              No incidents found
            </h3>

            <p>
              Click "Create From Alert" to
              create an incident from a
              HIGH or CRITICAL alert.
            </p>

          </div>

        ) : (

          <div className="user-table">

            <table>

              <thead>

                <tr>

                  <th>
                    ID
                  </th>

                  <th>
                    Incident
                  </th>

                  <th>
                    Attack Type
                  </th>

                  <th>
                    Severity
                  </th>

                  <th>
                    Risk
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Source
                  </th>

                  <th>
                    Actions
                  </th>

                </tr>

              </thead>


              <tbody>

                {incidents.map(
                  (incident) => (

                    <tr
                      key={
                        incident.incident_id
                      }
                    >

                      <td>
                        #
                        {
                          incident.incident_id
                        }
                      </td>


                      <td>

                        <strong>
                          {
                            incident.title
                          }
                        </strong>

                      </td>


                      <td>
                        {
                          incident.attack_type
                        }
                      </td>


                      <td>

                        <span
                          className={`risk-badge ${
                            (
                              incident.severity ||
                              'LOW'
                            ).toLowerCase()
                          }`}
                        >
                          {
                            incident.severity
                          }
                        </span>

                      </td>


                      <td>

                        {
                          Number(
                            incident.risk_score ||
                            0
                          ).toFixed(1)
                        }
                        /100

                      </td>


                      <td>

                        <span className="table-role">
                          {
                            incident.status
                          }
                        </span>

                      </td>


                      <td>

                        {
                          incident.source ||
                          'N/A'
                        }

                      </td>


                      <td>

                        <button
                          className="table-action"
                          onClick={() => {
                            setSelectedIncident(
                              incident
                            );

                            setNote('');
                            setError('');
                          }}
                        >
                          View
                        </button>


                        {incident.status !==
                          'INVESTIGATING' &&
                          incident.status !==
                            'RESOLVED' &&
                          incident.status !==
                            'CLOSED' && (

                          <button
                            className="table-action"
                            onClick={() =>
                              updateIncident(
                                incident.incident_id,
                                {
                                  status:
                                    'INVESTIGATING',
                                }
                              )
                            }
                          >
                            Investigate
                          </button>

                        )}


                        {incident.status !==
                          'RESOLVED' &&
                          incident.status !==
                            'CLOSED' && (

                          <button
                            className="table-action danger"
                            onClick={() =>
                              updateIncident(
                                incident.incident_id,
                                {
                                  status:
                                    'RESOLVED',
                                }
                              )
                            }
                          >
                            Resolve
                          </button>

                        )}

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>


      {selectedIncident && (

        <div className="panel">

          <div className="panel-header">

            <div>

              <h2>
                Incident #
                {
                  selectedIncident.incident_id
                }
              </h2>

              <span>
                Investigation workspace
              </span>

            </div>


            <button
              className="table-action"
              onClick={() =>
                setSelectedIncident(null)
              }
            >
              Close
            </button>

          </div>


          <div className="analytics-list">

            <div>
              <span>
                Title
              </span>

              <strong>
                {
                  selectedIncident.title
                }
              </strong>
            </div>


            <div>
              <span>
                Attack Type
              </span>

              <strong>
                {
                  selectedIncident.attack_type
                }
              </strong>
            </div>


            <div>
              <span>
                Severity
              </span>

              <strong>
                {
                  selectedIncident.severity
                }
              </strong>
            </div>


            <div>
              <span>
                Risk Score
              </span>

              <strong>
                {
                  Number(
                    selectedIncident.risk_score ||
                    0
                  ).toFixed(1)
                }
                /100
              </strong>
            </div>


            <div>
              <span>
                Source
              </span>

              <strong>
                {
                  selectedIncident.source ||
                  'N/A'
                }
              </strong>
            </div>


            <div>
              <span>
                Destination
              </span>

              <strong>
                {
                  selectedIncident.destination ||
                  'N/A'
                }
              </strong>
            </div>


            <div>
              <span>
                Status
              </span>

              <strong>
                {
                  selectedIncident.status
                }
              </strong>
            </div>

          </div>


          <h3>
            Investigation Notes
          </h3>


          <div
            className="monitoring-placeholder"
            style={{
              textAlign: 'left',
              whiteSpace: 'pre-wrap',
            }}
          >
            {
              selectedIncident.investigation_notes ||
              'No investigation notes yet.'
            }
          </div>


          <textarea
            value={note}
            onChange={(event) =>
              setNote(
                event.target.value
              )
            }
            placeholder="Enter investigation note..."
            rows={4}
            style={{
              width: '100%',
              marginTop: '12px',
              padding: '10px',
            }}
            disabled={savingNote}
          />


          <button
            className="primary-button"
            onClick={addNote}
            disabled={savingNote}
            style={{
              marginTop: '10px',
            }}
          >
            {savingNote
              ? 'Saving...'
              : 'Add Investigation Note'}
          </button>

        </div>

      )}

    </div>
  );
}


'''

    content = content.replace(
        marker,
        incident_component + marker,
        1,
    )


APP_FILE.write_text(
    content,
    encoding="utf-8",
)

print(
    "SUCCESS: App.jsx updated with Incident Management."
)