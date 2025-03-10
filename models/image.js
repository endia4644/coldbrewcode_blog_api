module.exports = (sequelize, DataTypes) => {
  const Image = sequelize.define(
    "Image",
    {
      fileName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      saveYsno: {
        type: DataTypes.BOOLEAN,
        default: false,
        allowNull: false,
      },
    },
    {
      charset: "utf8",
      collate: "utf8_general_ci",
    }
  );
  Image.associate = (db) => {
    db.Image.belongsTo(db.Post, {
      foreignKey: {
        allowNull: true,
      },
    });
    db.Image.belongsTo(db.TempPost, {
      foreignKey: {
        allowNull: true,
      },
    });
    db.Image.belongsTo(db.User, {
      foreignKey: {
        allowNull: true,
      },
    });
    db.Image.belongsTo(db.Series, {
      foreignKey: {
        allowNull: true,
      },
    });
  };
  return Image;
};
