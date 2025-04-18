
const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");
const { checkAchievements } = require("./checkAchievements");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

const usersFile = path.join(__dirname, "db", "users.json");
const saveUsers = (users) => fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
const loadUsers = () => JSON.parse(fs.readFileSync(usersFile, "utf-8"));

function getUser(email) {
  const users = loadUsers();
  return users[email];
}

function updateUser(email, updater) {
  const users = loadUsers();
  if (users[email]) {
    updater(users[email]);
    saveUsers(users);
    return users[email];
  }
  return null;
}

// Регистрация
app.post("/api/register", (req, res) => {
  const { email, password } = req.body;
  const users = loadUsers();
  if (users[email]) return res.json({ error: "User already exists" });

  users[email] = {
    email,
    password,
    balance: 0,
    xp: 0,
    level: 0,
    bets: 0,
    spins: 0,
    referrals: [],
    achievements: [],
    history: []
  };
  saveUsers(users);
  res.json({ success: true });
});

// Вход
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  const user = getUser(email);
  if (!user || user.password !== password) return res.json({ error: "Invalid credentials" });

  checkAchievements(email, { type: "login" });
  res.json({ success: true, user });
});

// Пополнение (тестовая крипта)
app.post("/api/deposit", (req, res) => {
  const { email, amount } = req.body;
  const user = updateUser(email, (u) => {
    u.balance += amount;
    checkAchievements(email, { type: "deposit", value: amount });
  });
  res.json({ success: true, balance: user.balance });
});

// Вывод
app.post("/api/withdraw", (req, res) => {
  const { email, amount } = req.body;
  const user = getUser(email);
  if (!user || user.balance < amount) return res.json({ error: "Insufficient funds" });

  updateUser(email, (u) => {
    u.balance -= amount;
    u.history.push({ type: "withdraw", amount, date: new Date().toISOString() });
    checkAchievements(email, { type: "withdraw" });
  });

  res.json({ success: true });
});

// Ставка (например, в Краше)
app.post("/api/bet", (req, res) => {
  const { email, amount } = req.body;
  const user = getUser(email);
  if (!user || user.balance < amount) return res.json({ error: "Insufficient funds" });

  updateUser(email, (u) => {
    u.balance -= amount;
    u.bets = (u.bets || 0) + 1;
    checkAchievements(email, { type: "bet_count", value: u.bets });
    checkAchievements(email, { type: "big_bet", value: amount });
    u.history.push({ type: "bet", amount, date: new Date().toISOString() });
  });

  res.json({ success: true });
});

// Спин в слоте
app.post("/api/spin", (req, res) => {
  const { email, amount } = req.body;
  const user = getUser(email);
  if (!user || user.balance < amount) return res.json({ error: "Insufficient funds" });

  updateUser(email, (u) => {
    u.balance -= amount;
    u.spins = (u.spins || 0) + 1;
    checkAchievements(email, { type: "spin_count", value: u.spins });
    u.history.push({ type: "spin", amount, date: new Date().toISOString() });
  });

  res.json({ success: true });
});

// Обновление XP и уровня
app.post("/api/xp", (req, res) => {
  const { email, xp } = req.body;
  updateUser(email, (u) => {
    u.xp = (u.xp || 0) + xp;
    u.level = Math.floor(u.xp / 100);
    checkAchievements(email, { type: "level", value: u.level });
  });
  res.json({ success: true });
});

app.listen(PORT, () => console.log("Casino backend running on port " + PORT));
