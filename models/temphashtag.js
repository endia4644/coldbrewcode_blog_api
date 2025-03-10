module.exports = (sequelize, DataTypes) => {
  const TempHashtag = sequelize.define('TempHashtag', {
    hashtagName: {
      type: DataTypes.STRING(20),
      allowNull: false,
    }
  }, {
    charset: 'utf8',
    collate: 'utf8_general_ci'
  });
  TempHashtag.associate = (db) => {
    db.TempHashtag.belongsToMany(db.TempPost, { through: db.TempPostHashtag, })
  }
  return TempHashtag;
}