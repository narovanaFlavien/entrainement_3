import { Model, DataTypes } from "sequelize";

const createClassPlanningHebdomadaire = (sequelize) => {

  class PlanningHebdomadaire extends Model {
    static associate({ Utilisateur, Tache }) {

      // Un planning appartient à un utilisateur
      PlanningHebdomadaire.belongsTo(Utilisateur, {
        foreignKey: 'identifiantUtilisateur',
        as: 'utilisateur',
      });
    }
  }

  PlanningHebdomadaire.init(
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
        onDelete: 'CASCADE',
      },
      dateDebutSemaine: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: 'Date du lundi de la semaine concernée',
      },
      dateFinSemaine: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: 'Date du dimanche de la semaine concernée',
        validate: {
          isAfterStart(value) {
            if (this.dateDebutSemaine && new Date(value) <= new Date(this.dateDebutSemaine)) {
              throw new Error('La date de fin doit être après la date de début');
            }
          },
        },
      },
      nombreMaxTachesParJour: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5,
        validate: {
          min: 1,
          max: 20,
        },
      },
      chargeActuelle: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {
          lundi: 0,
          mardi: 0,
          mercredi: 0,
          jeudi: 0,
          vendredi: 0,
          samedi: 0,
          dimanche: 0,
        },
        comment: 'Répartition actuelle des tâches par jour de la semaine',
        validate: {
          isValidStructure(value) {
            const jours = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
            const keys = Object.keys(value);
            const hasAllDays = jours.every(jour => keys.includes(jour));
            const allNumbers = Object.values(value).every(v => typeof v === 'number');
            
            if (!hasAllDays || !allNumbers) {
              throw new Error('La charge actuelle doit contenir tous les jours avec des valeurs numériques');
            }
          },
        },
      },
      estActif: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indique si ce planning est actif',
      },
    },
    {
      sequelize: sequelize,
      modelName: "PlanningHebdomadaire",
      freezeTableName: true,
      timestamps: true,
      createdAt: 'dateCreation',
      updatedAt: 'dateModification',
      indexes: [
        {
          unique: true,
          fields: ['identifiantUtilisateur', 'dateDebutSemaine'],
        },
      ],
      hooks: {
        beforeCreate: async (planning) => {
          // S'assurer que les dates sont correctes (lundi au dimanche)
          const debutDate = new Date(planning.dateDebutSemaine);
          const jourSemaine = debutDate.getDay();
          
          // Ajuster au lundi si nécessaire
          if (jourSemaine !== 1) { // 1 = lundi
            const diff = jourSemaine === 0 ? -6 : 1 - jourSemaine;
            debutDate.setDate(debutDate.getDate() + diff);
            planning.dateDebutSemaine = debutDate.toISOString().split('T')[0];
          }
          
          // Définir la fin de semaine (dimanche)
          const finDate = new Date(debutDate);
          finDate.setDate(finDate.getDate() + 6);
          planning.dateFinSemaine = finDate.toISOString().split('T')[0];
        },
      },
    }
  );

  return PlanningHebdomadaire;
};

export default createClassPlanningHebdomadaire;