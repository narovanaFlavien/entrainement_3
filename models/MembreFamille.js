import { Model, DataTypes } from "sequelize";

const createClassMembreFamille = (sequelize) => {

  class MembreFamille extends Model {
    static associate({ Utilisateur, Famille }) {

      // Un membre appartient à une famille
      MembreFamille.belongsTo(Famille, {
        foreignKey: 'identifiantFamille',
        as: 'famille',
      });

      // Un membre est un utilisateur
      MembreFamille.belongsTo(Utilisateur, {
        foreignKey: 'identifiantUtilisateur',
        as: 'utilisateur',
      });
    }
  }

  MembreFamille.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      identifiantFamille: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Famille',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      identifiantUtilisateur: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Utilisateur',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      role: {
        type: DataTypes.ENUM('admin', 'membre'),
        allowNull: false,
        defaultValue: 'admin',
        comment: 'Rôle du membre dans la famille : admin peut gérer les paramètres, membre a des droits limités',
      },
      dateAdhesion: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize: sequelize,
      modelName: "MembreFamille",
      freezeTableName: true,
      timestamps: false,
      indexes: [
        {
          unique: true,
          fields: ['identifiantFamille', 'identifiantUtilisateur'],
        },
      ],
    }
  );

  return MembreFamille;
};

export default createClassMembreFamille;