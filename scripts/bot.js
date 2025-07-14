//^^^^^^^^^^^^^^^^^^^^^^^ここからbot部分

'use strict';

module.exports = (robot) => {

  robot.respond(/start (\w+)$/i, async (res) => {
    const username = res.match[1];
    res.send(`${username} さんの記録を開始します`);

    let user = await User.findOne({ where: { username } });
    if (!user) {
      user = await User.create({ username, is_training: true });
    } else {
      await user.update({ is_training: true });
    }
  });

  robot.respond(/finish (\w+)$/i, async (res) => {
    const username = res.match[1];
    const user = await User.findOne({ where: { username } });
    if (user) {
      await user.update({ is_training: false });
      res.send(`${username} さんの測定を終了しました。お疲れ様でした！`);
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
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    username: { type: Sequelize.STRING, allowNull: false, unique: true },
    is_training: { type: Sequelize.BOOLEAN, defaultValue: false },
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