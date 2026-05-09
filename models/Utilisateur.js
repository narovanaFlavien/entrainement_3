import { Model, DataTypes } from "sequelize";
export const utilisateurStatutEnumerate = {
  ACTIF: 'actif',
  INACTIF: 'inactif',
};

export const statutChargeMentaleEnumerate = {
  VERT: 'vert',
  ORANGE: 'orange',
  ROUGE: 'rouge',
};

const createClassUtilisateur = (sequelize) => {

  class Utilisateur extends Model {
    static associate({ Tache, HistoriqueChargeMentale, PlanningHebdomadaire, Famille, MembreFamille }) {

      // Un utilisateur peut avoir plusieurs tâches
      Utilisateur.hasMany(Tache, {
        foreignKey: 'identifiantUtilisateur',
        as: 'taches',
        onDelete: 'CASCADE',
      });

      // Un utilisateur peut être assigné à plusieurs tâches
      Utilisateur.hasMany(Tache, {
        foreignKey: 'identifiantAssignataire',
        as: 'tachesAssignees',
        onDelete: 'SET NULL',
      });

      // Un utilisateur a un historique de charge mentale
      Utilisateur.hasMany(HistoriqueChargeMentale, {
        foreignKey: 'identifiantUtilisateur',
        as: 'historiqueChargeMentale',
        onDelete: 'CASCADE',
      });

      // Un utilisateur a plusieurs plannings hebdomadaires
      Utilisateur.hasMany(PlanningHebdomadaire, {
        foreignKey: 'identifiantUtilisateur',
        as: 'plannings',
        onDelete: 'CASCADE',
      });

      // Un utilisateur peut appartenir à plusieurs familles
      Utilisateur.belongsToMany(Famille, {
        through: MembreFamille,
        foreignKey: 'identifiantUtilisateur',
        as: 'familles',
      });
      Utilisateur.hasMany(MembreFamille, {
        foreignKey: 'identifiantUtilisateur',
        as: 'membreFamille',
        onDelete: 'CASCADE',
      });

      // Un utilisateur peut créer plusieurs familles
      Utilisateur.hasMany(Famille, {
        foreignKey: 'identifiantCreateur',
        as: 'famillesCrees',
        onDelete: 'CASCADE',
      });
    }
  }

  Utilisateur.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      motDePasse: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      prenom: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      nom: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      avatar: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: '',
      },
      scoreChargeMentale: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
          max: 100,
        },
      },
      statutChargeMentale: {
        type: DataTypes.ENUM('vert', 'orange', 'rouge'),
        allowNull: false,
        defaultValue: 'vert',
      },
      modeSaturation: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      statutCompte: {
        type: DataTypes.ENUM('actif', 'inactif'),
        allowNull: false,
        defaultValue: 'actif',
      },
    },
    {
      sequelize: sequelize,
      modelName: "Utilisateur",
      freezeTableName: true,
      timestamps: true,
      createdAt: 'dateCreation',
      updatedAt: 'dateModification',
    }
  );

  return Utilisateur;
};

export default createClassUtilisateur;