module.exports = (sequelize, DataTypes) => {
  const PostLikeUser = sequelize.define(
    "PostLikeUser"
  );
  return PostLikeUser;
};
