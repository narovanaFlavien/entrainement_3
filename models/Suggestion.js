import { Model, DataTypes } from "sequelize";

const createClassSuggestion = (sequelize) => {

  class Suggestion extends Model {
    static associate({ Tache, Utilisateur }) {

      // Une suggestion concerne une tâche spécifique
      Suggestion.belongsTo(Tache, {
        foreignKey: 'identifiantTache',
        as: 'tache',
      });

      // Une suggestion propose un utilisateur spécifique
      Suggestion.belongsTo(Utilisateur, {
        foreignKey: 'identifiantUtilisateurSuggere',
        as: 'utilisateurSuggere',
      });
    }
  }

  Suggestion.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      identifiantTache: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Tache',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      identifiantUtilisateurSuggere: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Utilisateur',
          key: 'id',
        },
      },
      raison: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Raison pour laquelle cet utilisateur est suggéré, générée par l\'IA',
        validate: {
          len: [0, 500],
        },
      },
      statut: {
        type: DataTypes.ENUM('en_attente', 'acceptee', 'refusee'),
        allowNull: false,
        defaultValue: 'en_attente',
      },
    },
    {
      sequelize: sequelize,
      modelName: "Suggestion",
      freezeTableName: true,
      timestamps: true,
      createdAt: 'dateCreation',
      updatedAt: false,
      hooks: {
        beforeCreate: async (suggestion) => {
          // Vérification que l'utilisateur suggéré fait partie de la même famille
          // Cette logique peut être implémentée dans le service
        },
      },
    }
  );

  return Suggestion;
};

export default createClassSuggestion;