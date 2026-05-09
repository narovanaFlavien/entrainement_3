import { Model, DataTypes } from "sequelize";

const createClassUtilisateur = (sequelize) => {

  class Utilisateur extends Model {
    static associate({ Tache, Famille, Notification }) {
      // Un utilisateur possède plusieurs tâches
      Utilisateur.hasMany(Tache, {
        foreignKey: 'id_utilisateur',
        as: 'taches',
        onDelete: 'CASCADE',
      });

      // Un utilisateur peut appartenir à plusieurs familles (partage)
      Utilisateur.belongsToMany(Famille, {
        through: 'Utilisateur_Famille',
        foreignKey: 'id_utilisateur',
      });

      // Un utilisateur reçoit plusieurs notifications
      Utilisateur.hasMany(Notification, {
        foreignKey: 'id_utilisateur',
        as: 'notifications',
        onDelete: 'CASCADE',
      });
    }
  }

  Utilisateur.init(
    {
      id_utilisateur: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      nom: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      prenom: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      tel: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true, // peut être facultatif
      },
      photo: {
        type: DataTypes.STRING,
        defaultValue: '',
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.STRING,
        defaultValue: 'user',
        allowNull: false,
        // exemples : 'user', 'parent', 'enfant', 'admin'
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Actif',
        // 'Actif', 'Inactif', 'Suspendu'
      },
      date_creation: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize: sequelize,
      modelName: "Utilisateur",
      freezeTableName: true, // table nommée "Utilisateur"
    }
  );

  return Utilisateur;
};

export default createClassUtilisateur;