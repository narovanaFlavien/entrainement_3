import { Model, DataTypes } from "sequelize";

const createClassFamille = (sequelize) => {

  class Famille extends Model {
    static associate({ Utilisateur, MembreFamille }) {

      // Une famille est créée par un utilisateur
      Famille.belongsTo(Utilisateur, {
        foreignKey: 'identifiantCreateur',
        as: 'createur',
      });

      // Une famille peut avoir plusieurs membres
      Famille.belongsToMany(Utilisateur, {
        through: MembreFamille,
        foreignKey: 'identifiantFamille',
        as: 'membres',
      });
    }
  }

  Famille.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      nom: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [2, 100],
        },
      },
      codeInvitation: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        comment: 'Code unique pour inviter des membres à rejoindre la famille',
      },
      identifiantCreateur: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Utilisateur',
          key: 'id',
        },
      },
    },
    {
      sequelize: sequelize,
      modelName: "Famille",
      freezeTableName: true,
      timestamps: true,
      createdAt: 'dateCreation',
      updatedAt: 'dateModification',
      hooks: {
        beforeCreate: async (famille) => {
          // Génération automatique d'un code d'invitation unique
          if (!famille.codeInvitation) {
            famille.codeInvitation = `FAM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
          }
        },
      },
    }
  );

  return Famille;
};

export default createClassFamille;