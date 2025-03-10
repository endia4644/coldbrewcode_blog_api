module.exports = (sequelize, DataTypes) => {
  const Email = sequelize.define('Email', {
    id: {
      type: DataTypes.STRING(12),
      allowNull: false,
      primaryKey: true,
    },
    address: {
      type: DataTypes.STRING(100),
      allowNull: false,
      primaryKey: true
    },
  }, {
    charset: 'utf8',
    collate: 'utf8_general_ci'
  });
  return Email;
}