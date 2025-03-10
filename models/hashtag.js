module.exports = (sequelize, DataTypes) => {
  const Hashtag = sequelize.define('Hashtag', {
    hashtagName: {
      type: DataTypes.STRING(20),
      allowNull: false,
    }
  }, {
    charset: 'utf8',
    collate: 'utf8_general_ci'
  });
  Hashtag.associate = (db) => {
    db.Hashtag.belongsToMany(db.Post, { through: db.PostHashtag })
  }
  return Hashtag;
}