import { Model, DataTypes } from "sequelize";

const createClassTache = (sequelize) => {

  class Tache extends Model {
    static associate({ Utilisateur, Suggestion }) {

      // Une tâche appartient à un utilisateur (créateur)
      Tache.belongsTo(Utilisateur, {
        foreignKey: 'identifiantUtilisateur',
        as: 'createur',
      });

      // Une tâche peut être assignée à un utilisateur
      Tache.belongsTo(Utilisateur, {
        foreignKey: 'identifiantAssignataire',
        as: 'assignataire',
      });

      // Une tâche peut avoir des suggestions de répartition
      Tache.hasMany(Suggestion, {
        foreignKey: 'identifiantTache',
        as: 'suggestions',
        onDelete: 'CASCADE',
      });

      // Auto-référence pour les sous-tâches
      Tache.belongsTo(Tache, {
        foreignKey: 'identifiantTacheParent',
        as: 'tacheParent',
      });

      Tache.hasMany(Tache, {
        foreignKey: 'identifiantTacheParent',
        as: 'sousTaches',
        onDelete: 'CASCADE',
      });
    }
  }

  Tache.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      identifiantUtilisateur: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Utilisateur',
          key: 'id',
        },
      },
      identifiantAssignataire: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Utilisateur',
          key: 'id',
        },
      },
      titre: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      saisieBrute: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Texte original saisi par l\'utilisateur avant structuration',
      },
      categorie: {
        type: DataTypes.ENUM('courses', 'sante', 'maison', 'travail', 'famille', 'administratif', 'loisirs', 'autre'),
        allowNull: true,
        defaultValue: 'autre',
      },
      priorite: {
        type: DataTypes.ENUM('basse', 'moyenne', 'haute', 'critique'),
        allowNull: false,
        defaultValue: 'moyenne',
      },
      statut: {
        type: DataTypes.ENUM('en_attente', 'en_cours', 'termine', 'annule'),
        allowNull: false,
        defaultValue: 'en_attente',
      },
      dateEcheance: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      datePlanifiee: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Date planifiée automatiquement par le système',
      },
      dateTerminee: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      rappelEnvoye: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      nombreRappels: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          max: 2,
        },
      },
      estGenereAutomatiquement: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indique si la tâche a été générée par IA',
      },
      estPartage: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      identifiantPartageAvec: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Utilisateur',
          key: 'id',
        },
      },
      identifiantTacheParent: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Tache',
          key: 'id',
        },
      },
    },
    {
      sequelize: sequelize,
      modelName: "Tache",
      freezeTableName: true,
      timestamps: true,
      createdAt: 'dateCreation',
      updatedAt: 'dateModification',
      hooks: {
        beforeUpdate: async (tache) => {
          if (tache.statut === 'termine' && !tache.dateTerminee) {
            tache.dateTerminee = new Date();
          }
          if (tache.statut === 'en_cours' && tache.changed('statut')) {
            // Logique supplémentaire si nécessaire
          }
        },
      },
    }
  );

  return Tache;
};

export default createClassTache;