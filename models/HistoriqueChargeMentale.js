import { Model, DataTypes } from "sequelize";

const createClassHistoriqueChargeMentale = (sequelize) => {

  class HistoriqueChargeMentale extends Model {
    static associate({ Utilisateur }) {
      HistoriqueChargeMentale.belongsTo(Utilisateur, {
        foreignKey: 'identifiantUtilisateur',
        as: 'utilisateur',
      });
    }
  }

  HistoriqueChargeMentale.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      identifiantUtilisateur: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Utilisateur',
          key: 'id',
        },
      },
      score: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 0,
          max: 100,
        },
      },
      statut: {
        type: DataTypes.ENUM('vert', 'orange', 'rouge'),
        allowNull: false,
      },
      nombreTachesActives: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      nombreTachesEnRetard: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      nombreTachesCritiques: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      dateEnregistrement: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize: sequelize,
      modelName: "HistoriqueChargeMentale",
      freezeTableName: true,
      timestamps: false,
    }
  );

  return HistoriqueChargeMentale;
};

export default createClassHistoriqueChargeMentale;