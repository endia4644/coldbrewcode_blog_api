module.exports = (sequelize, DataTypes) => {
  const Series = sequelize.define('Series', {
    seriesName: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },
    seriesThumbnail: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    posts: {
      type: DataTypes.VIRTUAL,
      set(value) {
        this.setDataValue("posts", value);
      },
    },
  }, {
    charset: 'utf8',
    collate: 'utf8_general_ci'
  });
  Series.associate = (db) => {
    db.Series.belongsToMany(db.Post, { through: db.SeriesPost });
    db.Series.belongsToMany(db.TempPost, { through: db.TempSeriesPost, });
    db.Series.hasMany(db.Image);
  }
  return Series;
}