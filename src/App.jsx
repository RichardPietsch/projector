import { useEffect, useMemo, useState } from 'react';

const emptyForms = {
  person: { firstName: '', lastName: '', trade: 'UX', level: 'JUNIOR' },
  client: { name: '', location: '', since: '', priority: 'Prio 1' },
  project: { clientId: '', name: '', startDate: '', endDate: '', budgetEur: 0 },
  challenge: { projectId: '', title: '', description: '' },
  assignment: { projectId: '', challengeId: '', personId: '', isOwner: false, isLeader: false }
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Request failed');
  }
  if (response.status === 204) return null;
  return response.json();
}

export function App() {
  const [state, setState] = useState(null);
  const [view, setView] = useState('people');
  const [form, setForm] = useState(emptyForms);
  const [editing, setEditing] = useState({});
  const [error, setError] = useState('');

  const refresh = async () => {
    const data = await api('/api/state');
    setState(data);
  };

  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, []);

  const lookup = useMemo(() => {
    if (!state) return {};
    return {
      people: Object.fromEntries(state.people.map((p) => [p.id, p])),
      clients: Object.fromEntries(state.clients.map((c) => [c.id, c])),
      projects: Object.fromEntries(state.projects.map((p) => [p.id, p])),
      challenges: Object.fromEntries(state.challenges.map((c) => [c.id, c]))
    };
  }, [state]);

  const beginEdit = (type, row, mapper) => {
    setEditing((prev) => ({ ...prev, [type]: row.id }));
    setForm((prev) => ({ ...prev, [type]: mapper(row) }));
  };

  const clearEdit = (type) => {
    setEditing((prev) => ({ ...prev, [type]: null }));
    setForm((prev) => ({ ...prev, [type]: emptyForms[type] }));
  };

  const save = async (type, endpoint) => {
    try {
      const id = editing[type];
      await api(id ? `${endpoint}/${id}` : endpoint, {
        method: id ? 'PUT' : 'POST',
        body: form[type]
      });
      clearEdit(type);
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  };

  const remove = async (endpoint, id) => {
    try {
      await api(`${endpoint}/${id}`, { method: 'DELETE' });
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  };

  const exportState = async () => {
    const data = await api('/api/export');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'resource-planner-export.json';
    link.click();
  };

  const importState = async (file) => {
    try {
      const text = await file.text();
      await api('/api/import', { method: 'POST', body: JSON.parse(text) });
      await refresh();
    } catch (e) {
      setError(`Import failed: ${e.message}`);
    }
  };

  if (!state) return <div className="container">Loading…</div>;

  const unassignedChallenges = state.challenges.filter(
    (challenge) => !state.assignments.some((assignment) => assignment.challenge_id === challenge.id)
  );

  return (
    <div className="container">
      <h1>Resource Planner</h1>
      <div className="toolbar">
        {['people', 'clients', 'projects'].map((name) => (
          <button key={name} className={view === name ? 'active' : ''} onClick={() => setView(name)}>
            {name[0].toUpperCase() + name.slice(1)} View
          </button>
        ))}
        <button onClick={exportState}>Export JSON</button>
        <label className="import-label">
          Import JSON
          <input type="file" accept="application/json" onChange={(e) => e.target.files?.[0] && importState(e.target.files[0])} />
        </label>
      </div>
      {error ? <div className="error">{error}</div> : null}

      {view === 'people' && (
        <section>
          <h2>People</h2>
          <table>
            <thead><tr><th>First Name</th><th>Last Name</th><th>Trade</th><th>Level</th><th>Assignments</th><th /></tr></thead>
            <tbody>
              {state.people.map((person) => (
                <tr key={person.id}>
                  <td>{person.first_name}</td><td>{person.last_name}</td><td>{person.trade}</td><td>{person.level}</td>
                  <td>{state.assignments.filter((a) => a.person_id === person.id).length}</td>
                  <td>
                    <button onClick={() => beginEdit('person', person, (r) => ({ firstName: r.first_name, lastName: r.last_name, trade: r.trade, level: r.level }))}>Edit</button>
                    <button onClick={() => remove('/api/people', person.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="form-grid">
            <input placeholder="First name" value={form.person.firstName} onChange={(e) => setForm((p) => ({ ...p, person: { ...p.person, firstName: e.target.value } }))} />
            <input placeholder="Last name" value={form.person.lastName} onChange={(e) => setForm((p) => ({ ...p, person: { ...p.person, lastName: e.target.value } }))} />
            <select value={form.person.trade} onChange={(e) => setForm((p) => ({ ...p, person: { ...p.person, trade: e.target.value } }))}>{state.staticLists.trades.map((x) => <option key={x}>{x}</option>)}</select>
            <select value={form.person.level} onChange={(e) => setForm((p) => ({ ...p, person: { ...p.person, level: e.target.value } }))}>{state.staticLists.levels.map((x) => <option key={x}>{x}</option>)}</select>
            <button onClick={() => save('person', '/api/people')}>{editing.person ? 'Update' : 'Add'} Person</button>
            {editing.person ? <button onClick={() => clearEdit('person')}>Cancel</button> : null}
          </div>
        </section>
      )}

      {view === 'clients' && (
        <section>
          <h2>Clients</h2>
          <table>
            <thead><tr><th>Name</th><th>Location</th><th>Since (YYYY.MM)</th><th>Priority</th><th>Projects</th><th /></tr></thead>
            <tbody>
              {state.clients.map((client) => (
                <tr key={client.id}>
                  <td>{client.name}</td><td>{client.location}</td><td>{client.since}</td><td>{client.priority}</td>
                  <td>{state.projects.filter((p) => p.client_id === client.id).map((p) => p.name).join(', ') || '-'}</td>
                  <td>
                    <button onClick={() => beginEdit('client', client, (r) => ({ name: r.name, location: r.location, since: r.since, priority: r.priority }))}>Edit</button>
                    <button onClick={() => remove('/api/clients', client.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="form-grid">
            <input placeholder="Client name" value={form.client.name} onChange={(e) => setForm((p) => ({ ...p, client: { ...p.client, name: e.target.value } }))} />
            <input placeholder="Location" value={form.client.location} onChange={(e) => setForm((p) => ({ ...p, client: { ...p.client, location: e.target.value } }))} />
            <input placeholder="YYYY.MM" value={form.client.since} onChange={(e) => setForm((p) => ({ ...p, client: { ...p.client, since: e.target.value } }))} />
            <select value={form.client.priority} onChange={(e) => setForm((p) => ({ ...p, client: { ...p.client, priority: e.target.value } }))}>{state.staticLists.priorities.map((x) => <option key={x}>{x}</option>)}</select>
            <button onClick={() => save('client', '/api/clients')}>{editing.client ? 'Update' : 'Add'} Client</button>
            {editing.client ? <button onClick={() => clearEdit('client')}>Cancel</button> : null}
          </div>
        </section>
      )}

      {view === 'projects' && (
        <section>
          <h2>Projects</h2>
          <table>
            <thead><tr><th>Name</th><th>Client</th><th>Start</th><th>End</th><th>Budget</th><th>Challenges</th><th /></tr></thead>
            <tbody>
              {state.projects.map((project) => (
                <tr key={project.id}>
                  <td>{project.name}</td><td>{lookup.clients[project.client_id]?.name}</td><td>{project.start_date}</td><td>{project.end_date || '-'}</td><td>€ {project.budget_eur}</td>
                  <td>{state.challenges.filter((c) => c.project_id === project.id).length}</td>
                  <td>
                    <button onClick={() => beginEdit('project', project, (r) => ({ clientId: r.client_id, name: r.name, startDate: r.start_date, endDate: r.end_date || '', budgetEur: r.budget_eur }))}>Edit</button>
                    <button onClick={() => remove('/api/projects', project.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="form-grid">
            <select value={form.project.clientId} onChange={(e) => setForm((p) => ({ ...p, project: { ...p.project, clientId: Number(e.target.value) } }))}>
              <option value="">Select client</option>
              {state.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
            </select>
            <input placeholder="Project name" value={form.project.name} onChange={(e) => setForm((p) => ({ ...p, project: { ...p.project, name: e.target.value } }))} />
            <input placeholder="Start YYYY.MM" value={form.project.startDate} onChange={(e) => setForm((p) => ({ ...p, project: { ...p.project, startDate: e.target.value } }))} />
            <input placeholder="End YYYY.MM" value={form.project.endDate} onChange={(e) => setForm((p) => ({ ...p, project: { ...p.project, endDate: e.target.value } }))} />
            <input type="number" placeholder="Budget in €" value={form.project.budgetEur} onChange={(e) => setForm((p) => ({ ...p, project: { ...p.project, budgetEur: Number(e.target.value) } }))} />
            <button onClick={() => save('project', '/api/projects')}>{editing.project ? 'Update' : 'Add'} Project</button>
            {editing.project ? <button onClick={() => clearEdit('project')}>Cancel</button> : null}
          </div>

          <h3>Challenges</h3>
          <table>
            <thead><tr><th>Title</th><th>Project</th><th>Description</th><th>Status</th><th /></tr></thead>
            <tbody>
              {state.challenges.map((challenge) => {
                const assignment = state.assignments.find((a) => a.challenge_id === challenge.id);
                return (
                  <tr key={challenge.id}>
                    <td>{challenge.title}</td>
                    <td>{lookup.projects[challenge.project_id]?.name}</td>
                    <td>{challenge.description}</td>
                    <td>{assignment ? `Assigned to ${lookup.people[assignment.person_id]?.first_name || 'Unknown'} (${assignment.quantity}%)` : 'Open'}</td>
                    <td>
                      <button onClick={() => beginEdit('challenge', challenge, (r) => ({ projectId: r.project_id, title: r.title, description: r.description }))}>Edit</button>
                      <button onClick={() => remove('/api/challenges', challenge.id)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="form-grid">
            <select value={form.challenge.projectId} onChange={(e) => setForm((p) => ({ ...p, challenge: { ...p.challenge, projectId: Number(e.target.value) } }))}>
              <option value="">Select project</option>
              {state.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
            <input placeholder="Challenge title" value={form.challenge.title} onChange={(e) => setForm((p) => ({ ...p, challenge: { ...p.challenge, title: e.target.value } }))} />
            <input placeholder="Description" value={form.challenge.description} onChange={(e) => setForm((p) => ({ ...p, challenge: { ...p.challenge, description: e.target.value } }))} />
            <button onClick={() => save('challenge', '/api/challenges')}>{editing.challenge ? 'Update' : 'Add'} Challenge</button>
            {editing.challenge ? <button onClick={() => clearEdit('challenge')}>Cancel</button> : null}
          </div>

          <h3>Assignments</h3>
          <table>
            <thead><tr><th>Project</th><th>Challenge</th><th>Person</th><th>Owner</th><th>Leader</th><th>Quantity</th><th /></tr></thead>
            <tbody>
              {state.assignments.map((assignment) => (
                <tr key={assignment.id}>
                  <td>{lookup.projects[assignment.project_id]?.name}</td>
                  <td>{lookup.challenges[assignment.challenge_id]?.title}</td>
                  <td>{lookup.people[assignment.person_id]?.first_name} {lookup.people[assignment.person_id]?.last_name}</td>
                  <td>{assignment.is_owner ? 'Yes' : 'No'}</td>
                  <td>{assignment.is_leader ? 'Yes' : 'No'}</td>
                  <td>{assignment.quantity}%</td>
                  <td>
                    <button onClick={() => beginEdit('assignment', assignment, (r) => ({ projectId: r.project_id, challengeId: r.challenge_id, personId: r.person_id, isOwner: !!r.is_owner, isLeader: !!r.is_leader }))}>Edit</button>
                    <button onClick={() => remove('/api/assignments', assignment.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="form-grid">
            <select value={form.assignment.projectId} onChange={(e) => setForm((p) => ({ ...p, assignment: { ...p.assignment, projectId: Number(e.target.value) } }))}>
              <option value="">Select project</option>
              {state.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
            <select value={form.assignment.challengeId} onChange={(e) => setForm((p) => ({ ...p, assignment: { ...p.assignment, challengeId: Number(e.target.value) } }))}>
              <option value="">Select challenge</option>
              {(editing.assignment ? state.challenges : unassignedChallenges).map((challenge) => <option key={challenge.id} value={challenge.id}>{challenge.title}</option>)}
            </select>
            <select value={form.assignment.personId} onChange={(e) => setForm((p) => ({ ...p, assignment: { ...p.assignment, personId: Number(e.target.value) } }))}>
              <option value="">Select person</option>
              {state.people.map((person) => <option key={person.id} value={person.id}>{person.first_name} {person.last_name}</option>)}
            </select>
            <label><input type="checkbox" checked={form.assignment.isOwner} onChange={(e) => setForm((p) => ({ ...p, assignment: { ...p.assignment, isOwner: e.target.checked } }))} /> Owner</label>
            <label><input type="checkbox" checked={form.assignment.isLeader} onChange={(e) => setForm((p) => ({ ...p, assignment: { ...p.assignment, isLeader: e.target.checked } }))} /> Leader</label>
            <button onClick={() => save('assignment', '/api/assignments')}>{editing.assignment ? 'Update' : 'Add'} Assignment</button>
            {editing.assignment ? <button onClick={() => clearEdit('assignment')}>Cancel</button> : null}
          </div>
        </section>
      )}
    </div>
  );
}
