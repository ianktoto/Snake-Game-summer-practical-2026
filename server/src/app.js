import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from './db/index.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/db-check', async (req, res) => {
  try {
    const { rows } = await query('SELECT NOW() AS now');
    res.json({ ok: true, now: rows[0].now });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// --- РЕГИСТРАЦИЯ (используем таблицу players) ---
app.post('/api/signup', async (req, res) => {
  const { username, password } = req.body;

  if (!username || username.length < 3) {
    return res.status(400).json({ error: 'Логин должен быть не менее 3 символов' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
  }

  try {
    const userExists = await query('SELECT * FROM players WHERE username = $1', [username]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'Пользователь с таким именем уже существует' });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    await query(
      'INSERT INTO players (username, password_hash) VALUES ($1, $2)',
      [username, passwordHash]
    );

    res.status(201).json({ message: 'Успешная регистрация' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера при регистрации' });
  }
});

// --- ВХОД (используем таблицу players) ---
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await query('SELECT * FROM players WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const user = result.rows[0];

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
    const token = jwt.sign({ id: user.id, username: user.username }, secret, { expiresIn: '24h' });

    res.json({ token, username: user.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера при входе' });
  }
});

// --- СОХРАНЕНИЕ РЕЗУЛЬТАТОВ (используем player_id) ---
app.post('/api/matches', async (req, res) => {
  const { score, duration_ms } = req.body;
  const authHeader = req.headers.authorization;

  if (!authHeader) return res.status(401).json({ error: 'Нет токена' });

  const token = authHeader.split(' ')[1];
  try {
    const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
    const decoded = jwt.verify(token, secret);
    
    await query(
      'INSERT INTO matches (player_id, score, duration_ms) VALUES ($1, $2, $3)',
      [decoded.id, score, duration_ms]
    );
    res.status(201).json({ message: 'Результат сохранен' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сохранения результата' });
  }
});

// --- ТАБЛИЦА ЛИДЕРОВ (читаем из готового VIEW) ---
app.get('/api/leaderboard', async (req, res) => {
  try {
    // Берем данные из вашего готового представления leaderboard
    const result = await query('SELECT username, best_score FROM leaderboard LIMIT 10');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка загрузки лидерборда' });
  }
});

export default app;
