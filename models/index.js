const { Sequelize } = require("sequelize");
const env = process.env.NODE_ENV || "development";
const config = require(__dirname + "/../config/config.js")[env];
const db = {};

const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  config
);

db.User = require("./user")(sequelize, Sequelize);
db.Post = require("./post")(sequelize, Sequelize);
db.Comment = require("./comment")(sequelize, Sequelize);
db.Hashtag = require("./hashtag")(sequelize, Sequelize);
db.Series = require("./series")(sequelize, Sequelize);
db.Image = require("./image")(sequelize, Sequelize);
db.Email = require("./email")(sequelize, Sequelize);
db.SeriesPost = require("./seriespost")(sequelize, Sequelize);
db.PostHashtag = require("./posthashtag")(sequelize, Sequelize);
db.PostLikeUser = require("./postlikeuser")(sequelize, Sequelize);
db.TempPost = require("./temppost")(sequelize, Sequelize);
db.TempHashtag = require("./temphashtag")(sequelize, Sequelize);
db.TempPostHashtag = require("./tempposthashtag")(sequelize, Sequelize);
db.TempSeriesPost = require("./tempseriespost")(sequelize, Sequelize);

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
