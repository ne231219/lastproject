//^^^^^^^^^^^^^^^^^^^^^^^ここからbot部分

'use strict';

module.exports = (robot) => {

  robot.respond(/start (\w+)$/i, async (res) => {
    const username = res.match[1];
    const now = Math.floor(Date.now() / 1000) - 86400;
    res.send(`${username} さんの記録を開始します`);

    let user = await User.findOne({ where: { username } });
    if (!user) {
      user = await User.create({ username, is_training: true, start_time: now });
    } else {
      await user.update({ is_training: true, start_time: now  });
    }
  });

  robot.respond(/finish (\w+)$/i, async (res) => {
    const username = res.match[1];
    const user = await User.findOne({ where: { username } });
    if (user) {
      await user.update({ is_training: false });
      const url = `https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user=${username}&from_second=${user.start_time}`;
      const response = await fetch(url);
      const submissions = await response.json();

      const solved = submissions.filter(s => s.result === 'AC');
      const message = `${username} さんの測定を終了しました。お疲れ様でした！\n解いた問題一覧:\n${uniqueProblems.join(', ')}`;
      res.send(message);

    } else {
      res.send(`${username} さんは登録されていません。`);
    }
  });
};

//^^^^^^^^^^^^^^^^^^^^^^^ここからデータベース部分

const Sequelize = require('sequelize');

let DB_INFO = process.env.DATABASE_URL;
let pg_option = { ssl: { rejectUnauthorized: false } };

const sequelize = new Sequelize(DB_INFO, {
  dialect: 'postgres',
  dialectOptions: pg_option,
});

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
  }
  catch (mes) {
    console.log('Unable to connect to the database:', mes);
  }
})();

const User = sequelize.define('users',
  {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },//ユーザー識別ID
    username: { type: Sequelize.STRING, allowNull: false, unique: true },//Atcoderの名前
    is_training: { type: Sequelize.BOOLEAN, defaultValue: false },//学習中か
    start_time: { type: Sequelize.INTEGER, allowNull: true },//開始時間
  },
  {
    freezeTableName: true,
  }
);

(async () => {
  try {
    await sequelize.sync({ force: false, alter: true });
    console.log("Database synchronized successfully.");
  } catch (error) {
    console.error("Error synchronizing the database:", error);
  }
}
)();