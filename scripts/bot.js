//^^^^^^^^^^^^^^^^^^^^^^^ここからbot部分

'use strict';

const { Op } = require('sequelize');

module.exports = (robot) => {

  robot.respond(/start (\w+)$/i, async (res) => {
    const username = res.match[1];
    const now = Math.floor(Date.now() / 1000) - 864000;
    res.send(`${username} さんの記録を開始します`);

    let user = await User.findOne({ where: { username } });
    if (!user) {
      user = await User.create({ username, is_training: true, start_time: now });
    } else {
      await user.update({ is_training: true, start_time: now });
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
      const problemIds = solved.map(s => s.problem_id);
      const uniqueProblemIds = [...new Set(problemIds)];
      // ACになった問題は復習リスト（Data）から削除する
      for (const problemId of uniqueProblemIds) {
        await Data.destroy({
          where: {
            Userid: user.id,
            problem: problemId
          }
        });
      }
      const message = `${username} さんの測定を終了しました。お疲れ様でした！\n解けた問題一覧:\n${uniqueProblemIds.join('\n')}`;

      const badResults = ['WA', 'TLE', 'RE'];
      for (const submission of submissions) {
        if (badResults.includes(submission.result)) {
          const exists = await Data.findOne({
            where: {
              Userid: user.id,
              problem: submission.problem_id,
              result: submission.result,
            }
          });
          if (!exists) {
            await Data.create({
              Userid: user.id,
              problem: submission.problem_id,
              result: submission.result,
            });
          }
        }
      }

      res.send(message);

    } else {
      res.send(`${username} さんは登録されていません。`);
    }
  });

  robot.respond(/review (\w+)$/i, async (res) => {
    const username = res.match[1];
    const user = await User.findOne({ where: { username } });
    if (!user) {
      res.send(`${username} さんは登録されていません。`);
      return;
    }

    // ユーザーが間違えた問題をDataテーブルから取得
    const mistakes = await Data.findAll({
      where: {
        Userid: user.id,
        result: {
          [Op.in]: ['WA', 'TLE', 'RE']
        }
      }
    });

    if (mistakes.length === 0) {
      res.send(`${username} さんの間違えた問題はありません。`);
      return;
    }

    // ランダムに1問選ぶ
    const randomIndex = Math.floor(Math.random() * mistakes.length);
    const problem = mistakes[randomIndex].problem;

    // AtCoderの問題リンク生成 (例: https://atcoder.jp/contests/abc001/tasks/abc001_1)
    // problemの形式によるので適宜調整してください
    // 例: problemが "abc001_1" なら
    const contestId = problem.split('_')[0];
    const url = `https://atcoder.jp/contests/${contestId}/tasks/${problem}`;

    res.send(`${username} さん、こちらの問題を復習しましょう！\n${url}`);
  });

    robot.respond(/reviewlist (\w+)$/i, async (res) => {
    const username = res.match[1];
    const user = await User.findOne({ where: { username } });
    if (!user) {
      res.send(`${username} さんは登録されていません。`);
      return;
    }

    // 復習対象の問題一覧を取得
    const mistakes = await Data.findAll({
      where: {
        Userid: user.id,
        result: {
          [Op.in]: ['WA', 'TLE', 'RE']
        }
      }
    });

    if (mistakes.length === 0) {
      res.send(`${username} さんは復習対象の問題がありません。`);
      return;
    }

    // 重複を避ける（同じ問題が複数の結果で登録されている場合）
    const uniqueProblems = [...new Set(mistakes.map(m => m.problem))];

    // AtCoder問題リンクを作成
    const links = uniqueProblems.map(problem => {
      const contestId = problem.split('_')[0];
      return `https://atcoder.jp/contests/${contestId}/tasks/${problem}`;
    });

    res.send(`${username} さんの復習リストです（${uniqueProblems.length} 問）：\n` + links.join('\n'));
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

const Data = sequelize.define('data',
  {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },//識別
    Userid: { type: Sequelize.INTEGER, allowNull: false },//ユーザーID
    problem: { type: Sequelize.STRING, allowNull: false },//問題識別
    result: { type: Sequelize.STRING, allowNull: false },//ACかWAかTLEかRE
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