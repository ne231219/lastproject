'use strict';

module.exports = (robot) => {

  robot.respond(/start (\w+)$/i, (res) => {
    const username = res.match[1];
    res.send(`${username} さんの記録を開始します`);
  });

  robot.respond(/finish$/i, (res) => {
    res.send("測定終了　お疲れ様でした");
  });

};
