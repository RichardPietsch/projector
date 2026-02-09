import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import {
  initDb,
  getDashboardData,
  createPerson,
  updatePerson,
  deletePerson,
  createClient,
  updateClient,
  deleteClient,
  createProject,
  updateProject,
  deleteProject,
  createChallenge,
  updateChallenge,
  deleteChallenge,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  exportState,
  importState
} from './db.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));
initDb();

app.get('/api/state', (_req, res) => {
  res.json(getDashboardData());
});

app.post('/api/people', (req, res) => {
  res.json(createPerson(req.body));
});
app.put('/api/people/:id', (req, res) => {
  res.json(updatePerson(Number(req.params.id), req.body));
});
app.delete('/api/people/:id', (req, res) => {
  deletePerson(Number(req.params.id));
  res.status(204).send();
});

app.post('/api/clients', (req, res) => {
  res.json(createClient(req.body));
});
app.put('/api/clients/:id', (req, res) => {
  res.json(updateClient(Number(req.params.id), req.body));
});
app.delete('/api/clients/:id', (req, res) => {
  deleteClient(Number(req.params.id));
  res.status(204).send();
});

app.post('/api/projects', (req, res) => {
  res.json(createProject(req.body));
});
app.put('/api/projects/:id', (req, res) => {
  res.json(updateProject(Number(req.params.id), req.body));
});
app.delete('/api/projects/:id', (req, res) => {
  deleteProject(Number(req.params.id));
  res.status(204).send();
});

app.post('/api/challenges', (req, res) => {
  res.json(createChallenge(req.body));
});
app.put('/api/challenges/:id', (req, res) => {
  res.json(updateChallenge(Number(req.params.id), req.body));
});
app.delete('/api/challenges/:id', (req, res) => {
  deleteChallenge(Number(req.params.id));
  res.status(204).send();
});

app.post('/api/assignments', (req, res) => {
  try {
    res.json(createAssignment(req.body));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
app.put('/api/assignments/:id', (req, res) => {
  try {
    res.json(updateAssignment(Number(req.params.id), req.body));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
app.delete('/api/assignments/:id', (req, res) => {
  deleteAssignment(Number(req.params.id));
  res.status(204).send();
});

app.get('/api/export', (_req, res) => {
  res.json(exportState());
});

app.post('/api/import', (req, res) => {
  importState(req.body);
  res.status(204).send();
});

const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  console.log(`API listening on ${port}`);
});
