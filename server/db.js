import Database from 'better-sqlite3';
import path from 'node:path';

const dbPath = path.join(process.cwd(), 'data', 'resource-planner.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

const PRIORITIES = ['Prio 1', 'Prio 2', 'Prio 3', 'Prio 4'];
const TRADES = ['UX', 'UI', 'FE-DEV', 'BE-DEV', 'PM', 'TPM', 'COPY', 'CREATIVE', 'CONSULTANT', 'OTHER'];
const LEVELS = ['JUNIOR', 'MIDWEIGHT', 'SENIOR', 'DIRECTOR', 'C-LEVEL'];

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      since TEXT NOT NULL,
      priority TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      budget_eur REAL NOT NULL,
      FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS people (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      trade TEXT NOT NULL,
      level TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      challenge_id INTEGER NOT NULL UNIQUE,
      person_id INTEGER NOT NULL,
      is_owner INTEGER NOT NULL DEFAULT 0,
      is_leader INTEGER NOT NULL DEFAULT 0,
      quantity INTEGER NOT NULL DEFAULT 100,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
      FOREIGN KEY(person_id) REFERENCES people(id) ON DELETE CASCADE
    );
  `);
}

function recomputePersonQuantities(personId) {
  const rows = db.prepare('SELECT id FROM assignments WHERE person_id = ? ORDER BY id').all(personId);
  const count = rows.length;
  if (count === 0) return;

  const base = Math.floor(100 / count);
  let remainder = 100 - base * count;
  const update = db.prepare('UPDATE assignments SET quantity = ? WHERE id = ?');
  const txn = db.transaction(() => {
    for (const row of rows) {
      const value = base + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder -= 1;
      update.run(value, row.id);
    }
  });
  txn();
}

export const staticLists = {
  priorities: PRIORITIES,
  trades: TRADES,
  levels: LEVELS
};

export function getDashboardData() {
  return {
    people: db.prepare('SELECT * FROM people ORDER BY last_name, first_name').all(),
    clients: db.prepare('SELECT * FROM clients ORDER BY name').all(),
    projects: db.prepare('SELECT * FROM projects ORDER BY name').all(),
    challenges: db.prepare('SELECT * FROM challenges ORDER BY title').all(),
    assignments: db.prepare('SELECT * FROM assignments ORDER BY id').all(),
    staticLists
  };
}

export function createPerson(input) {
  const result = db.prepare(
    `INSERT INTO people (first_name, last_name, trade, level) VALUES (@firstName, @lastName, @trade, @level)`
  ).run(input);
  return db.prepare('SELECT * FROM people WHERE id = ?').get(result.lastInsertRowid);
}

export function updatePerson(id, input) {
  db.prepare(
    `UPDATE people SET first_name = @firstName, last_name = @lastName, trade = @trade, level = @level WHERE id = @id`
  ).run({ id, ...input });
  return db.prepare('SELECT * FROM people WHERE id = ?').get(id);
}

export function deletePerson(id) {
  db.prepare('DELETE FROM people WHERE id = ?').run(id);
}

export function createClient(input) {
  const result = db.prepare(
    `INSERT INTO clients (name, location, since, priority) VALUES (@name, @location, @since, @priority)`
  ).run(input);
  return db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid);
}

export function updateClient(id, input) {
  db.prepare(
    `UPDATE clients SET name = @name, location = @location, since = @since, priority = @priority WHERE id = @id`
  ).run({ id, ...input });
  return db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
}

export function deleteClient(id) {
  db.prepare('DELETE FROM clients WHERE id = ?').run(id);
}

export function createProject(input) {
  const result = db.prepare(
    `INSERT INTO projects (client_id, name, start_date, end_date, budget_eur) VALUES (@clientId, @name, @startDate, @endDate, @budgetEur)`
  ).run(input);
  return db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
}

export function updateProject(id, input) {
  db.prepare(
    `UPDATE projects SET client_id = @clientId, name = @name, start_date = @startDate, end_date = @endDate, budget_eur = @budgetEur WHERE id = @id`
  ).run({ id, ...input });
  return db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
}

export function deleteProject(id) {
  db.prepare('DELETE FROM projects WHERE id = ?').run(id);
}

export function createChallenge(input) {
  const result = db.prepare(
    `INSERT INTO challenges (project_id, title, description) VALUES (@projectId, @title, @description)`
  ).run(input);
  return db.prepare('SELECT * FROM challenges WHERE id = ?').get(result.lastInsertRowid);
}

export function updateChallenge(id, input) {
  db.prepare(
    `UPDATE challenges SET project_id = @projectId, title = @title, description = @description WHERE id = @id`
  ).run({ id, ...input });
  return db.prepare('SELECT * FROM challenges WHERE id = ?').get(id);
}

export function deleteChallenge(id) {
  db.prepare('DELETE FROM challenges WHERE id = ?').run(id);
}

export function createAssignment(input) {
  const result = db.prepare(
    `INSERT INTO assignments (project_id, challenge_id, person_id, is_owner, is_leader) VALUES (@projectId, @challengeId, @personId, @isOwner, @isLeader)`
  ).run(input);
  recomputePersonQuantities(input.personId);
  return db.prepare('SELECT * FROM assignments WHERE id = ?').get(result.lastInsertRowid);
}

export function updateAssignment(id, input) {
  const previous = db.prepare('SELECT * FROM assignments WHERE id = ?').get(id);
  db.prepare(
    `UPDATE assignments SET project_id = @projectId, challenge_id = @challengeId, person_id = @personId, is_owner = @isOwner, is_leader = @isLeader WHERE id = @id`
  ).run({ id, ...input });
  recomputePersonQuantities(input.personId);
  if (previous && previous.person_id !== input.personId) {
    recomputePersonQuantities(previous.person_id);
  }
  return db.prepare('SELECT * FROM assignments WHERE id = ?').get(id);
}

export function deleteAssignment(id) {
  const previous = db.prepare('SELECT * FROM assignments WHERE id = ?').get(id);
  db.prepare('DELETE FROM assignments WHERE id = ?').run(id);
  if (previous) recomputePersonQuantities(previous.person_id);
}

export function exportState() {
  return getDashboardData();
}

export function importState(state) {
  const txn = db.transaction(() => {
    db.exec(`
      DELETE FROM assignments;
      DELETE FROM challenges;
      DELETE FROM projects;
      DELETE FROM clients;
      DELETE FROM people;
    `);

    const insertPerson = db.prepare('INSERT INTO people (id, first_name, last_name, trade, level) VALUES (@id, @first_name, @last_name, @trade, @level)');
    const insertClient = db.prepare('INSERT INTO clients (id, name, location, since, priority) VALUES (@id, @name, @location, @since, @priority)');
    const insertProject = db.prepare('INSERT INTO projects (id, client_id, name, start_date, end_date, budget_eur) VALUES (@id, @client_id, @name, @start_date, @end_date, @budget_eur)');
    const insertChallenge = db.prepare('INSERT INTO challenges (id, project_id, title, description) VALUES (@id, @project_id, @title, @description)');
    const insertAssignment = db.prepare('INSERT INTO assignments (id, project_id, challenge_id, person_id, is_owner, is_leader, quantity) VALUES (@id, @project_id, @challenge_id, @person_id, @is_owner, @is_leader, @quantity)');

    for (const item of state.people || []) insertPerson.run(item);
    for (const item of state.clients || []) insertClient.run(item);
    for (const item of state.projects || []) insertProject.run(item);
    for (const item of state.challenges || []) insertChallenge.run(item);
    for (const item of state.assignments || []) insertAssignment.run(item);
  });
  txn();
}
