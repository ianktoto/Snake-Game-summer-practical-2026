import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';

let server;
let baseUrl;

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

test.after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

test('GET /api/health returns status ok', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
});

test('POST /api/signup rejects a username shorter than 3 characters', async () => {
  const response = await fetch(`${baseUrl}/api/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'ab', password: 'password123' }),
  });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /Логин должен быть не менее 3 символов/);
});

test('POST /api/signup rejects a password shorter than 6 characters', async () => {
  const response = await fetch(`${baseUrl}/api/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'player1', password: '123' }),
  });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /Пароль должен быть не менее 6 символов/);
});

test('POST /api/matches rejects a request without an authorization token', async () => {
  const response = await fetch(`${baseUrl}/api/matches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ score: 10, duration_ms: 5000 }),
  });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Нет токена' });
});
