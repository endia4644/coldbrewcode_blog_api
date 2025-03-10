module.exports = (sequelize, DataTypes) => {
  const TempPost = sequelize.define(
    "TempPost",
    {
      postContent: {
        type: DataTypes.TEXT, // 매우 긴 글
        allowNull: true,
      },
      postName: {
        type: DataTypes.STRING(200),
        allowNull: true,
      },
      postDescription: {
        type: DataTypes.STRING(1000),
        allowNull: true,
      },
      postThumbnail: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      permission: {
        type: DataTypes.STRING(10),
        allowNull: true,
      },
      dltYsno: {
        type: DataTypes.STRING(1),
        allowNull: false, //필수
      },
      PostId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      }
    },
    {
      charset: "utf8mb4",
      collate: "utf8mb4_general_ci",
    }
  );
  TempPost.associate = (db) => {
    db.TempPost.belongsTo(db.User);
    db.TempPost.belongsToMany(db.TempHashtag, { through: db.TempPostHashtag });
    db.TempPost.hasMany(db.Image);
    db.TempPost.belongsToMany(db.Series, { through: db.TempSeriesPost });
  };
  return TempPost;
};
