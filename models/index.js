// models/index.js
import { Sequelize } from 'sequelize';
import { config } from "dotenv";
import createClassUtilisateur from './Utilisateur.js';
import createClassTache from './Tache.js';
import createClassHistoriqueChargeMentale from './HistoriqueChargeMentale.js';
import createClassFamille from './Famille.js';
import createClassMembreFamille from './MembreFamille.js';
import createClassSuggestion from './Suggestion.js';
import createClassPlanningHebdomadaire from './PlanningHebdomadaire.js';

config();

const sequelize = new Sequelize({
  // Votre configuration de connexion
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'entrainement',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '1234',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
});

// Création des modèles
const Utilisateur = createClassUtilisateur(sequelize);
const Tache = createClassTache(sequelize);
const HistoriqueChargeMentale = createClassHistoriqueChargeMentale(sequelize);
const Famille = createClassFamille(sequelize);
const MembreFamille = createClassMembreFamille(sequelize);
const Suggestion = createClassSuggestion(sequelize);
const PlanningHebdomadaire = createClassPlanningHebdomadaire(sequelize);

// Association des modèles
Object.values(sequelize.models).forEach(model => {
  if (model.associate) {
    model.associate(sequelize.models);
  }
});
//----------------------------------------------------------------------
//#########___________SYNCHRONISATION_________________#################
const Synchronisation = async () => {

//   const hashedPassword = await bcrypt.hash("Password2025", 12);
  
  sequelize.sync({ force: true }).then(data => {
    console.log('Synchronisation terminé avec succés', data)
    // model.Agent.create({
    //   nom_agent: "admin",
    //   prenom_agent: "admin",
    //   email: "email@gmail.com",
    //   tel_agent: "+261 00 00 000 00", 
    //   matricule: "AG-4545",
    //   grade: "Inspecteur",
    //   password: hashedPassword,
    //   role: "admin",
    //   status: "Actif",
    //   photo_agent: null,
    // })
  }).catch(err => {
    console.log('Une erreur est survenue', err)
  })
};
await Synchronisation();

//#_______________________________________________________________________#
//######################################################################

export {
  sequelize,
  Utilisateur,
  Tache,
  HistoriqueChargeMentale,
  Famille,
  MembreFamille,
  Suggestion,
  PlanningHebdomadaire,
};

export default sequelize;