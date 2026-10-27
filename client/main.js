const API_URL = '/api';
let token = localStorage.getItem('token');
let username = localStorage.getItem('username');

const authScreen = document.getElementById('auth-screen');
const gameScreen = document.getElementById('game-screen');
const leaderboardScreen = document.getElementById('leaderboard-screen');
const authError = document.getElementById('auth-error');
const currentUserEl = document.getElementById('current-user');
const scoreEl = document.getElementById('score');

// АВТОРИЗАЦИЯ
async function auth(endpoint) {
  const user = document.getElementById('username').value;
  const pass = document.getElementById('password').value;
  try {
    const res = await fetch(`${API_URL}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password: pass })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Ошибка');

    if (endpoint === 'login') {
      token = data.token;
      username = data.username;
      localStorage.setItem('token', token);
      localStorage.setItem('username', username);
      showGame();
    } else {
      alert('Регистрация успешна! Теперь войдите.');
    }
  } catch (err) {
    authError.textContent = typeof err.message === 'string' ? err.message : 'Ошибка валидации';
  }
}

document.getElementById('btn-login').onclick = () => auth('login');
document.getElementById('btn-signup').onclick = () => auth('signup');

document.getElementById('btn-logout').onclick = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  location.reload();
};

function showGame() {
  authScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  currentUserEl.textContent = username;
  initGame();
}

// ИГРА (ЗМЕЙКА)
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const box = 20;
let snake, direction, food, score, gameLoop, startTime;

function initGame() {
  snake = [{ x: 10 * box, y: 10 * box }];
  direction = 'RIGHT';
  score = 0;
  scoreEl.textContent = score;
  document.getElementById('game-over').classList.add('hidden');
  generateFood();
  startTime = Date.now();
  if (gameLoop) clearInterval(gameLoop);
  gameLoop = setInterval(update, 150);
}

function generateFood() {
  food = {
    x: Math.floor(Math.random() * 20) * box,
    y: Math.floor(Math.random() * 20) * box
  };
}

document.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
  if (e.key === 'ArrowUp' && direction !== 'DOWN') direction = 'UP';
  if (e.key === 'ArrowDown' && direction !== 'UP') direction = 'DOWN';
  if (e.key === 'ArrowLeft' && direction !== 'RIGHT') direction = 'LEFT';
  if (e.key === 'ArrowRight' && direction !== 'LEFT') direction = 'RIGHT';
});

function update() {
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ff5252';
  ctx.fillRect(food.x, food.y, box, box);

  let headX = snake[0].x;
  let headY = snake[0].y;

  if (direction === 'LEFT') headX -= box;
  if (direction === 'RIGHT') headX += box;
  if (direction === 'UP') headY -= box;
  if (direction === 'DOWN') headY += box;

  if (headX < 0 || headX >= canvas.width || headY < 0 || headY >= canvas.height) return gameOver();
  for (let i = 0; i < snake.length; i++) {
    if (snake[i].x === headX && snake[i].y === headY) return gameOver();
  }

  snake.unshift({ x: headX, y: headY });

  if (headX === food.x && headY === food.y) {
    score++;
    scoreEl.textContent = score;
    generateFood();
  } else {
    snake.pop();
  }

  for (let i = 0; i < snake.length; i++) {
    ctx.fillStyle = i === 0 ? '#4CAF50' : '#8bc34a';
    ctx.fillRect(snake[i].x, snake[i].y, box, box);
  }
}

async function gameOver() {
  clearInterval(gameLoop);
  document.getElementById('game-over').classList.remove('hidden');
  document.getElementById('final-score').textContent = score;
  const duration = Date.now() - startTime;
  
  try {
    await fetch(`${API_URL}/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ score: score, duration_ms: duration })
    });
  } catch (err) {
    console.error('Ошибка сохранения', err);
  }
}

document.getElementById('btn-restart').onclick = () => {
  gameScreen.classList.add('hidden');
  leaderboardScreen.classList.remove('hidden');
  loadLeaderboard();
};

document.getElementById('btn-back').onclick = () => {
  leaderboardScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  initGame();
};

async function loadLeaderboard() {
  const res = await fetch(`${API_URL}/leaderboard`);
  const data = await res.json();
  const tbody = document.querySelector('#leaderboard-table tbody');
  tbody.innerHTML = '';
  data.forEach((row, index) => {
    tbody.innerHTML += `<tr><td>${index + 1}</td><td>${row.username}</td><td>${row.best_score}</td></tr>`;
  });
}

if (token && username) showGame();
else authScreen.classList.remove('hidden');
