module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      email: {
        type: DataTypes.STRING(100),
        allowNul: false, //필수
        unique: true, // 중복금지
      },
      password: {
        type: DataTypes.STRING(100),
        allowNull: false, //필수
      },
      userType: {
        type: DataTypes.STRING(10),
        allowNul: false, //필수
      },
      nickName: {
        type: DataTypes.STRING(45),
        allowNull: false, //필수
      },
      introduce: {
        type: DataTypes.STRING(200),
        allowNull: true, //비필수
      },
      profileImg: {
        type: DataTypes.STRING(45),
        allowNull: true, //비필수
      },
      commentNoticeYsno: {
        type: DataTypes.STRING(1),
        allowNull: false, //필수
      },
      newPostNoticeYsno: {
        type: DataTypes.STRING(1),
        allowNull: false, //필수
      },
      dltYsno: {
        type: DataTypes.STRING(1),
        allowNull: false, //필수
      },
    },
    {
      charset: "utf8",
      collate: "utf8_general_ci", //한글 저장돼요
    }
  );

  User.associate = (db) => {
    db.User.belongsToMany(db.Post, {
      through: db.PostLikeUser,
      foreignKey: 'UserId',
      as: 'likedPost'
    });
    db.User.hasMany(db.Post);
    db.User.hasMany(db.TempPost);
    db.User.hasMany(db.Comment);
    db.User.hasOne(db.Image);
  };
  return User;
};
