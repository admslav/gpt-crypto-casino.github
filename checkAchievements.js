
const fs = require("fs");
const path = require("path");

const usersFile = path.join(__dirname, "db", "users.json");
const achievementsFile = path.join(__dirname, "db", "achievements.json");

function loadUsers() {
  return JSON.parse(fs.readFileSync(usersFile, "utf-8"));
}

function saveUsers(users) {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), "utf-8");
}

function loadAchievements() {
  return JSON.parse(fs.readFileSync(achievementsFile, "utf-8"));
}

function checkAchievements(email, context) {
  const users = loadUsers();
  const user = users[email];
  if (!user) return;

  const achievements = loadAchievements();
  const unlocked = user.achievements || [];

  for (const [key, ach] of Object.entries(achievements)) {
    if (unlocked.includes(key)) continue;

    let completed = false;
    switch (ach.trigger) {
      case "login":
        completed = context.type === "login";
        break;
      case "bet_count":
        completed = context.type === "bet_count" && context.value >= ach.target;
        break;
      case "big_bet":
        completed = context.type === "big_bet" && context.value >= ach.target;
        break;
      case "deposit":
        completed = context.type === "deposit" && context.value >= ach.target;
        break;
      case "withdraw":
        completed = context.type === "withdraw";
        break;
      case "ref_count":
        completed = context.type === "ref_count" && context.value >= ach.target;
        break;
      case "spin_count":
        completed = context.type === "spin_count" && context.value >= ach.target;
        break;
      case "level":
        completed = context.type === "level" && context.value >= ach.target;
        break;
    }

    if (completed) {
      unlocked.push(key);
      user.xp = (user.xp || 0) + (ach.reward.xp || 0);

      // Добавим в историю
      user.history = user.history || [];
      user.history.push({
        type: "achievement",
        achievement: key,
        xp: ach.reward.xp || 0,
        date: new Date().toISOString()
      });
    }
  }

  user.achievements = unlocked;
  users[email] = user;
  saveUsers(users);
}

module.exports = { checkAchievements };
