module.exports = (sequelize, DataTypes) => {
  const Comment = sequelize.define('Comment', {
    commentContent: {
      type: DataTypes.STRING(200), // 매우 긴 글
      allowNull: false,
    },
    commentDepth: {
      type: DataTypes.STRING(1),
      allowNull: false,
    },
    dltYsno: {
      type: DataTypes.STRING(1),
      allowNull: false, //필수
    },
  }, {
    charset: 'utf8mb4',
    collate: 'utf8mb4_general_ci'
  });
  Comment.associate = (db) => {
    db.Comment.belongsTo(db.User); //UserId
    db.Comment.belongsTo(db.Post); //postNo
    db.Comment.hasMany(db.Comment, { as: 'childComment', foreignKey: 'ParentId' }); //commentNo
  };
  return Comment;
}