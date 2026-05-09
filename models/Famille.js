import { DataTypes, Model } from "sequelize";


const createClassFamille = (sequelize) => {
    class Famille extends Model {
        static associate({ Utilisateur, Tache }) {
            // Un utilisateur peut appartenir à plusieurs familles
            Famille.belongsToMany(Utilisateur, {
                through: 'Utilisateur_Famille',
                foreignKey: 'id_famille',
            });
            // Une famille peut avoir plusieurs tâches
            Famille.hasMany(Tache, {
                foreignKey: 'id_famille',
                as: 'taches',
                onDelete: 'CASCADE',
            });
        }
    }
    Famille.init({
        id_famille: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
        },
        nom_famille: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        date_creation: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        }
    }, {
        sequelize: sequelize,
        modelName: "Famille",
        tableName: "Famille",
    })
    return Famille;
}

export default createClassFamille;
