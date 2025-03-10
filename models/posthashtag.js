module.exports = (sequelize, DataTypes) => {
  const PostHashtag = sequelize.define(
    "PostHashtag"
  );
  return PostHashtag;
};
