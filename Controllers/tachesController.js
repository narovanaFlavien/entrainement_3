// controllers/tachesController.js
import { Op } from "sequelize";
import { validationResult } from "express-validator";

class TachesController {
  constructor(models) {
    this.Utilisateur = models.Utilisateur;
    this.Tache = models.Tache;
    this.Famille = models.Famille;
    this.MembreFamille = models.MembreFamille;
    this.Suggestion = models.Suggestion;
    this.HistoriqueChargeMentale = models.HistoriqueChargeMentale;
    this.PlanningHebdomadaire = models.PlanningHebdomadaire;
  }

  /**
   * Calcule le score de charge mentale d'un utilisateur
   */
  calculerScoreChargeMentale = async (identifiantUtilisateur) => {
    try {
      const maintenant = new Date();

      // Récupérer toutes les tâches actives
      const taches = await this.Tache.findAll({
        where: {
          [Op.or]: [
            { identifiantUtilisateur: identifiantUtilisateur },
            { identifiantAssignataire: identifiantUtilisateur }
          ],
          statut: { [Op.in]: ['en_attente', 'en_cours'] }
        }
      });

      const nombreTachesActives = taches.length;
      
      // Tâches en retard
      const tachesEnRetard = taches.filter(tache => 
        tache.dateEcheance && new Date(tache.dateEcheance) < maintenant
      );
      
      // Tâches critiques (priorité critique OU en retard avec priorité haute)
      const tachesCritiques = taches.filter(tache => 
        tache.priorite === 'critique' || 
        (tache.priorite === 'haute' && tache.dateEcheance && new Date(tache.dateEcheance) < maintenant)
      );

      // Formule de calcul du score (0-100)
      let score = 0;
      score += nombreTachesActives * 5; // 5 points par tâche active
      score += tachesEnRetard.length * 10; // 10 points par tâche en retard
      score += tachesCritiques.length * 15; // 15 points par tâche critique

      // Plafonner à 100
      score = Math.min(score, 100);

      // Déterminer le statut
      let statut;
      if (score >= 70) {
        statut = 'rouge';
      } else if (score >= 40) {
        statut = 'orange';
      } else {
        statut = 'vert';
      }

      // Mettre à jour l'utilisateur
      const utilisateur = await this.Utilisateur.findByPk(identifiantUtilisateur);
      if (utilisateur) {
        const modeSaturation = statut === 'rouge';
        
        await utilisateur.update({
          scoreChargeMentale: score,
          statutChargeMentale: statut,
          modeSaturation: modeSaturation
        });

        // Enregistrer dans l'historique
        await this.HistoriqueChargeMentale.create({
          identifiantUtilisateur,
          score,
          statut,
          nombreTachesActives,
          nombreTachesEnRetard: tachesEnRetard.length,
          nombreTachesCritiques: tachesCritiques.length,
          dateEnregistrement: new Date()
        });
      }

      return {
        score,
        statut,
        nombreTachesActives,
        nombreTachesEnRetard: tachesEnRetard.length,
        nombreTachesCritiques: tachesCritiques.length,
        modeSaturation: statut === 'rouge'
      };
    } catch (error) {
      console.error("Erreur lors du calcul du score de charge mentale:", error);
      throw error;
    }
  };

  /**
   * Place automatiquement une tâche dans le planning
   */
  placerTacheDansPlanning = async (identifiantUtilisateur, tache) => {
    try {
      // Récupérer ou créer le planning de la semaine courante
      const aujourdhui = new Date();
      const debutSemaine = new Date(aujourdhui);
      const jourSemaine = aujourdhui.getDay();
      const diffLundi = jourSemaine === 0 ? -6 : 1 - jourSemaine;
      debutSemaine.setDate(aujourdhui.getDate() + diffLundi);
      debutSemaine.setHours(0, 0, 0, 0);

      const finSemaine = new Date(debutSemaine);
      finSemaine.setDate(finSemaine.getDate() + 6);

      let planning = await this.PlanningHebdomadaire.findOne({
        where: {
          identifiantUtilisateur,
          dateDebutSemaine: debutSemaine.toISOString().split('T')[0]
        }
      });

      if (!planning) {
        planning = await this.PlanningHebdomadaire.create({
          identifiantUtilisateur,
          dateDebutSemaine: debutSemaine.toISOString().split('T')[0],
          dateFinSemaine: finSemaine.toISOString().split('T')[0],
          nombreMaxTachesParJour: 5
        });
      }

      // Trouver le jour le moins chargé
      const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
      let chargeActuelle = planning.chargeActuelle;
      
      // Filtrer les jours non passés
      const joursDisponibles = jours.filter((jour, index) => {
        const dateJour = new Date(debutSemaine);
        dateJour.setDate(dateJour.getDate() + index);
        return dateJour >= aujourdhui;
      });

      // Trouver le jour avec le moins de tâches
      let jourChoisi = joursDisponibles[0];
      let minCharge = chargeActuelle[jourChoisi] || 0;

      joursDisponibles.forEach(jour => {
        const charge = chargeActuelle[jour] || 0;
        if (charge < minCharge && charge < planning.nombreMaxTachesParJour) {
          minCharge = charge;
          jourChoisi = jour;
        }
      });

      // Si tous les jours sont pleins, prendre le moins chargé
      if (minCharge >= planning.nombreMaxTachesParJour) {
        jourChoisi = joursDisponibles.reduce((min, jour) => 
          (chargeActuelle[jour] || 0) < (chargeActuelle[min] || 0) ? jour : min
        );
      }

      // Mettre à jour la charge
      chargeActuelle[jourChoisi] = (chargeActuelle[jourChoisi] || 0) + 1;
      await planning.update({ chargeActuelle });

      // Calculer la date planifiée
      const indexJour = jours.indexOf(jourChoisi);
      const datePlanifiee = new Date(debutSemaine);
      datePlanifiee.setDate(datePlanifiee.getDate() + indexJour);
      
      // Définir une heure par défaut (9h)
      datePlanifiee.setHours(9, 0, 0, 0);

      return datePlanifiee;
    } catch (error) {
      console.error("Erreur lors du placement dans le planning:", error);
      return new Date(); // Date par défaut si erreur
    }
  };

  /**
   * Suggère un membre de la famille pour une tâche
   */
  suggererMembreFamille = async (identifiantFamille, identifiantTache) => {
    try {
      // Récupérer tous les membres de la famille
      const membres = await this.MembreFamille.findAll({
        where: { identifiantFamille },
        include: [
          {
            model: this.Utilisateur,
            as: 'utilisateur',
            attributes: ['id', 'prenom', 'nom', 'scoreChargeMentale']
          }
        ]
      });

      if (membres.length <= 1) return null;

      // Trouver le membre avec le score de charge mentale le plus bas
      const membreSuggere = membres
        .sort((a, b) => a.utilisateur.scoreChargeMentale - b.utilisateur.scoreChargeMentale)[0];

      // Créer une suggestion
      await this.Suggestion.create({
        identifiantTache,
        identifiantUtilisateurSuggere: membreSuggere.identifiantUtilisateur,
        raison: `${membreSuggere.utilisateur.prenom} a la charge mentale la plus légère actuellement`,
        statut: 'en_attente'
      });

      return membreSuggere;
    } catch (error) {
      console.error("Erreur lors de la suggestion de membre:", error);
      return null;
    }
  };

  /**
   * Replanifie automatiquement les tâches en retard
   */
  replanifierTachesEnRetard = async () => {
    try {
      const maintenant = new Date();
      
      const tachesEnRetard = await this.Tache.findAll({
        where: {
          dateEcheance: { [Op.lt]: maintenant },
          statut: { [Op.in]: ['en_attente', 'en_cours'] }
        }
      });

      for (const tache of tachesEnRetard) {
        // Déplacer la tâche de 24h
        const nouvelleDate = new Date(maintenant);
        nouvelleDate.setDate(nouvelleDate.getDate() + 1);
        nouvelleDate.setHours(9, 0, 0, 0);
        
        await tache.update({
          dateEcheance: nouvelleDate,
          datePlanifiee: nouvelleDate
        });
      }

      console.log(`${tachesEnRetard.length} tâches replanifiées`);
      return tachesEnRetard.length;
    } catch (error) {
      console.error("Erreur lors de la replanification:", error);
      return 0;
    }
  };

  /**
   * Analyse le texte libre et structure la tâche (version simplifiée sans IA)
   */
  analyserTexteLibre = (texte) => {
    const categories = {
      courses: ['course', 'achat', 'supermarché', 'magasin', 'aliment', 'manger', 'repas'],
      sante: ['médecin', 'docteur', 'santé', 'médicament', 'pharmacie', 'dentiste', 'rdv médical'],
      maison: ['ménage', 'nettoyage', 'maison', 'appartement', 'rangement', 'lessive', 'vaisselle'],
      travail: ['travail', 'boulot', 'réunion', 'dossier', 'projet', 'client', 'bureau'],
      famille: ['enfant', 'école', 'famille', 'parent', 'devoir', 'activité'],
      administratif: ['papier', 'document', 'administration', 'impôt', 'banque', 'facture'],
      loisirs: ['sport', 'cinéma', 'loisir', 'jeu', 'lecture', 'musique', 'film']
    };

    texte = texte.toLowerCase();
    let categorie = 'autre';
    let priorite = 'moyenne';

    // Détecter la catégorie
    for (const [cat, mots] of Object.entries(categories)) {
      if (mots.some(mot => texte.includes(mot))) {
        categorie = cat;
        break;
      }
    }

    // Détecter la priorité via des mots-clés
    if (texte.includes('urgent') || texte.includes('important') || texte.includes('vite') || texte.includes('critique')) {
      priorite = 'haute';
    } else if (texte.includes('peut attendre') || texte.includes('pas pressé')) {
      priorite = 'basse';
    }

    // Estimer une date d'échéance
    let dateEcheance = null;
    const demain = new Date();
    if (texte.includes('demain')) {
      demain.setDate(demain.getDate() + 1);
      dateEcheance = demain;
    } else if (texte.includes('aujourd\'hui') || texte.includes('ce soir')) {
      dateEcheance = new Date();
    } else if (priorite === 'haute') {
      demain.setDate(demain.getDate() + 2);
      dateEcheance = demain;
    } else {
      // Par défaut : dans une semaine
      demain.setDate(demain.getDate() + 7);
      dateEcheance = demain;
    }

    return {
      titre: texte.length > 100 ? texte.substring(0, 100) + '...' : texte,
      categorie,
      priorite,
      dateEcheance
    };
  };

  /**
   * GET /api/taches
   * Récupérer toutes les tâches de l'utilisateur connecté
   */
  getAllTaches = async (req, res) => {
    try {
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).json({ success: false, message: "Non authentifié" });
      }

      const { 
        statut, categorie, priorite, page = 1, limit = 20,
        tri = 'dateCreation', ordre = 'DESC',
        recherche, modeSaturation
      } = req.query;

      const offset = (page - 1) * limit;
      const whereClause = {
        [Op.or]: [
          { identifiantUtilisateur: userId },
          { identifiantAssignataire: userId }
        ]
      };

      // Filtres
      if (statut) whereClause.statut = statut;
      else whereClause.statut = { [Op.in]: ['en_attente', 'en_cours'] };
      
      if (categorie) whereClause.categorie = categorie;
      if (priorite) whereClause.priorite = priorite;
      
      if (recherche) {
        whereClause[Op.and] = [
          { titre: { [Op.like]: `%${recherche}%` } }
        ];
      }

      // Mode saturation : ne retourner que les tâches critiques
      const isModeSaturation = modeSaturation === 'true' || req.session.modeSaturation;
      
      let options = {
        where: whereClause,
        include: [
          {
            model: this.Utilisateur,
            as: 'createur',
            attributes: ['id', 'prenom', 'nom', 'avatar']
          },
          {
            model: this.Utilisateur,
            as: 'assignataire',
            attributes: ['id', 'prenom', 'nom', 'avatar']
          }
        ],
        order: [[tri, ordre]],
        limit: parseInt(limit),
        offset: offset,
        distinct: true
      };

      if (isModeSaturation) {
        // En mode saturé, ne retourner que les 3 tâches les plus critiques
        options.where.priorite = { [Op.in]: ['critique', 'haute'] };
        options.limit = 3;
        options.order = [['priorite', 'ASC'], ['dateEcheance', 'ASC']];
      }

      const { count, rows } = await this.Tache.findAndCountAll(options);

      // Vérifier si des tâches sont en retard et doivent être replanifiées
      const maintenant = new Date();
      const tachesEnRetard = rows.filter(t => 
        t.dateEcheance && new Date(t.dateEcheance) < maintenant && 
        t.statut !== 'termine'
      );
      
      if (tachesEnRetard.length > 0) {
        await this.replanifierTachesEnRetard();
      }

      return res.status(200).json({
        success: true,
        data: {
          taches: rows,
          modeSaturation: isModeSaturation,
          pagination: {
            total: count,
            page: parseInt(page),
            totalPages: Math.ceil(count / limit),
            limit: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error("Erreur lors de la récupération des tâches:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur serveur",
        error: error.message
      });
    }
  };

  /**
   * GET /api/taches/:id
   * Récupérer une tâche spécifique
   */
  getTacheById = async (req, res) => {
    try {
      const userId = req.session.userId;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ success: false, message: "Non authentifié" });
      }

      const tache = await this.Tache.findOne({
        where: {
          id,
          [Op.or]: [
            { identifiantUtilisateur: userId },
            { identifiantAssignataire: userId }
          ]
        },
        include: [
          {
            model: this.Utilisateur,
            as: 'createur',
            attributes: ['id', 'prenom', 'nom', 'avatar', 'email']
          },
          {
            model: this.Utilisateur,
            as: 'assignataire',
            attributes: ['id', 'prenom', 'nom', 'avatar', 'email']
          },
          {
            model: this.Suggestion,
            as: 'suggestions',
            include: [
              {
                model: this.Utilisateur,
                as: 'utilisateurSuggere',
                attributes: ['id', 'prenom', 'nom', 'avatar']
              }
            ]
          },
          {
            model: this.Tache,
            as: 'sousTaches',
            attributes: ['id', 'titre', 'statut', 'priorite']
          }
        ]
      });

      if (!tache) {
        return res.status(404).json({ success: false, message: "Tâche non trouvée" });
      }

      return res.status(200).json({ success: true, data: tache });

    } catch (error) {
      console.error("Erreur lors de la récupération de la tâche:", error);
      return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
    }
  };

  /**
   * POST /api/taches
   * Créer une nouvelle tâche avec analyse automatique
   */
  createTache = async (req, res) => {
    const transaction = await this.Tache.sequelize.transaction();
    
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        await transaction.rollback();
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userId = req.session.userId;
      if (!userId) {
        await transaction.rollback();
        return res.status(401).json({ success: false, message: "Non authentifié" });
      }

      const { 
        texteLibre, titre, description, categorie, priorite, 
        dateEcheance, identifiantAssignataire, estPartage 
      } = req.body;

      let tacheData = {};

      // Si texte libre fourni, analyser automatiquement
      if (texteLibre) {
        const analyse = this.analyserTexteLibre(texteLibre);
        tacheData = {
          identifiantUtilisateur: userId,
          titre: analyse.titre,
          saisieBrute: texteLibre,
          description: description || texteLibre,
          categorie: categorie || analyse.categorie,
          priorite: priorite || analyse.priorite,
          dateEcheance: dateEcheance || analyse.dateEcheance,
          estGenereAutomatiquement: true
        };
      } else {
        // Sinon utiliser les champs structurés
        tacheData = {
          identifiantUtilisateur: userId,
          titre,
          description,
          categorie: categorie || 'autre',
          priorite: priorite || 'moyenne',
          dateEcheance: dateEcheance || null,
          saisieBrute: titre
        };
      }

      // Assignation si spécifiée
      if (identifiantAssignataire) {
        tacheData.identifiantAssignataire = identifiantAssignataire;
        tacheData.estPartage = true;
        tacheData.identifiantPartageAvec = identifiantAssignataire;
      } else if (estPartage) {
        tacheData.estPartage = true;
      }

      // Créer la tâche
      const tache = await this.Tache.create(tacheData, { transaction });

      // Placer automatiquement dans le planning
      const datePlanifiee = await this.placerTacheDansPlanning(userId, tache);
      await tache.update({ datePlanifiee }, { transaction });

      // Si partagée, suggérer un membre de la famille
      if (estPartage && !identifiantAssignataire) {
        const famille = await this.MembreFamille.findOne({
          where: { identifiantUtilisateur: userId }
        });

        if (famille) {
          await this.suggererMembreFamille(famille.identifiantFamille, tache.id);
        }
      }

      // Recalculer le score de charge mentale
      await this.calculerScoreChargeMentale(userId);

      await transaction.commit();

      // Récupérer la tâche complète avec associations
      const tacheComplete = await this.Tache.findByPk(tache.id, {
        include: [
          { model: this.Utilisateur, as: 'createur', attributes: ['id', 'prenom', 'nom', 'avatar'] },
          { model: this.Utilisateur, as: 'assignataire', attributes: ['id', 'prenom', 'nom', 'avatar'] }
        ]
      });

      return res.status(201).json({
        success: true,
        message: "Tâche créée avec succès",
        data: tacheComplete
      });

    } catch (error) {
      console.error("Erreur lors de la création de la tâche:", error);
      await transaction.rollback();
      return res.status(500).json({
        success: false,
        message: "Erreur serveur",
        error: error.message
      });
    }
  };

  /**
   * PUT /api/taches/:id
   * Mettre à jour une tâche
   */
  updateTache = async (req, res) => {
    try {
      const userId = req.session.userId;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ success: false, message: "Non authentifié" });
      }

      const tache = await this.Tache.findOne({
        where: {
          id,
          [Op.or]: [
            { identifiantUtilisateur: userId },
            { identifiantAssignataire: userId }
          ]
        }
      });

      if (!tache) {
        return res.status(404).json({ success: false, message: "Tâche non trouvée" });
      }

      const champsAutorises = [
        'titre', 'description', 'categorie', 'priorite', 
        'dateEcheance', 'statut', 'identifiantAssignataire',
        'estPartage', 'identifiantPartageAvec'
      ];

      const updates = {};
      champsAutorises.forEach(champ => {
        if (req.body[champ] !== undefined) {
          updates[champ] = req.body[champ];
        }
      });

      // Si la tâche est marquée comme terminée
      if (updates.statut === 'termine') {
        updates.dateTerminee = new Date();
        updates.rappelEnvoye = true; // Stopper les rappels
      }

      await tache.update(updates);

      // Recalculer le score
      await this.calculerScoreChargeMentale(userId);

      return res.status(200).json({
        success: true,
        message: "Tâche mise à jour avec succès",
        data: tache
      });

    } catch (error) {
      console.error("Erreur lors de la mise à jour de la tâche:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur serveur",
        error: error.message
      });
    }
  };

  /**
   * PUT /api/taches/:id/valider
   * Valider/terminer une tâche rapidement
   */
  validerTache = async (req, res) => {
    try {
      const userId = req.session.userId;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ success: false, message: "Non authentifié" });
      }

      const tache = await this.Tache.findOne({
        where: {
          id,
          [Op.or]: [
            { identifiantUtilisateur: userId },
            { identifiantAssignataire: userId }
          ]
        }
      });

      if (!tache) {
        return res.status(404).json({ success: false, message: "Tâche non trouvée" });
      }

      if (tache.statut === 'termine') {
        return res.status(400).json({ success: false, message: "Cette tâche est déjà terminée" });
      }

      await tache.update({
        statut: 'termine',
        dateTerminee: new Date(),
        rappelEnvoye: true
      });

      // Recalculer le score
      await this.calculerScoreChargeMentale(userId);

      return res.status(200).json({
        success: true,
        message: "✅ Tâche validée ! Charge mentale allégée.",
        data: tache
      });

    } catch (error) {
      console.error("Erreur lors de la validation de la tâche:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur serveur",
        error: error.message
      });
    }
  };

  /**
   * DELETE /api/taches/:id
   * Supprimer une tâche
   */
  deleteTache = async (req, res) => {
    try {
      const userId = req.session.userId;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ success: false, message: "Non authentifié" });
      }

      const tache = await this.Tache.findByPk(id);

      if (!tache) {
        return res.status(404).json({ success: false, message: "Tâche non trouvée" });
      }

      // Vérifier que l'utilisateur est le créateur
      if (tache.identifiantUtilisateur !== userId) {
        return res.status(403).json({ success: false, message: "Vous n'êtes pas le créateur de cette tâche" });
      }

      await tache.destroy();

      // Recalculer le score
      await this.calculerScoreChargeMentale(userId);

      return res.status(200).json({
        success: true,
        message: "Tâche supprimée avec succès"
      });

    } catch (error) {
      console.error("Erreur lors de la suppression de la tâche:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur serveur",
        error: error.message
      });
    }
  };

  /**
   * GET /api/taches/mode-sature
   * Récupérer les tâches en mode saturé (3 tâches critiques uniquement)
   */
  getTachesModeSature = async (req, res) => {
    try {
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).json({ success: false, message: "Non authentifié" });
      }

      // Récupérer l'utilisateur pour vérifier son état
      const utilisateur = await this.Utilisateur.findByPk(userId);

      if (!utilisateur || !utilisateur.modeSaturation) {
        return res.status(400).json({ 
          success: false, 
          message: "Le mode saturé n'est pas activé" 
        });
      }

      const taches = await this.Tache.findAll({
        where: {
          [Op.or]: [
            { identifiantUtilisateur: userId },
            { identifiantAssignataire: userId }
          ],
          statut: { [Op.in]: ['en_attente', 'en_cours'] },
          priorite: { [Op.in]: ['critique', 'haute'] }
        },
        order: [['priorite', 'ASC'], ['dateEcheance', 'ASC']],
        limit: 3
      });

      return res.status(200).json({
        success: true,
        modeSaturation: true,
        message: "Mode saturé : voici vos 3 priorités",
        data: taches
      });

    } catch (error) {
      console.error("Erreur lors de la récupération des tâches en mode saturé:", error);
      return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
    }
  };

  /**
   * GET /api/taches/stats
   * Récupérer les statistiques des tâches
   */
  getStats = async (req, res) => {
    try {
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).json({ success: false, message: "Non authentifié" });
      }

      const maintenant = new Date();

      const [totalTaches, tachesTerminees, tachesEnCours, tachesEnRetard, tachesCritiques] = await Promise.all([
        this.Tache.count({
          where: {
            [Op.or]: [{ identifiantUtilisateur: userId }, { identifiantAssignataire: userId }]
          }
        }),
        this.Tache.count({
          where: {
            [Op.or]: [{ identifiantUtilisateur: userId }, { identifiantAssignataire: userId }],
            statut: 'termine'
          }
        }),
        this.Tache.count({
          where: {
            [Op.or]: [{ identifiantUtilisateur: userId }, { identifiantAssignataire: userId }],
            statut: { [Op.in]: ['en_attente', 'en_cours'] }
          }
        }),
        this.Tache.count({
          where: {
            [Op.or]: [{ identifiantUtilisateur: userId }, { identifiantAssignataire: userId }],
            dateEcheance: { [Op.lt]: maintenant },
            statut: { [Op.in]: ['en_attente', 'en_cours'] }
          }
        }),
        this.Tache.count({
          where: {
            [Op.or]: [{ identifiantUtilisateur: userId }, { identifiantAssignataire: userId }],
            priorite: 'critique',
            statut: { [Op.in]: ['en_attente', 'en_cours'] }
          }
        })
      ]);

      // Récupérer le score actuel
      const utilisateur = await this.Utilisateur.findByPk(userId, {
        attributes: ['scoreChargeMentale', 'statutChargeMentale', 'modeSaturation']
      });

      return res.status(200).json({
        success: true,
        data: {
          totalTaches,
          tachesTerminees,
          tachesEnCours,
          tachesEnRetard,
          tachesCritiques,
          tauxCompletion: totalTaches > 0 ? Math.round((tachesTerminees / totalTaches) * 100) : 0,
          chargeMentale: utilisateur
        }
      });

    } catch (error) {
      console.error("Erreur lors de la récupération des stats:", error);
      return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
    }
  };

  /**
   * POST /api/taches/partager/:id
   * Partager/assigner une tâche à un autre utilisateur
   */
  partagerTache = async (req, res) => {
    try {
      const userId = req.session.userId;
      const { id } = req.params;
      const { identifiantAssignataire } = req.body;

      if (!userId) {
        return res.status(401).json({ success: false, message: "Non authentifié" });
      }

      const tache = await this.Tache.findByPk(id);

      if (!tache || tache.identifiantUtilisateur !== userId) {
        return res.status(404).json({ success: false, message: "Tâche non trouvée ou non autorisée" });
      }

      // Vérifier que l'assignataire fait partie de la même famille
      const familleCreateur = await this.MembreFamille.findOne({
        where: { identifiantUtilisateur: userId }
      });

      const familleAssignataire = await this.MembreFamille.findOne({
        where: { 
          identifiantUtilisateur: identifiantAssignataire,
          identifiantFamille: familleCreateur?.identifiantFamille
        }
      });

      if (!familleAssignataire) {
        return res.status(400).json({
          success: false,
          message: "L'utilisateur ne fait pas partie de votre famille"
        });
      }

      await tache.update({
        identifiantAssignataire,
        estPartage: true,
        identifiantPartageAvec: identifiantAssignataire
      });

      // Recalculer les scores des deux utilisateurs
      await this.calculerScoreChargeMentale(userId);
      await this.calculerScoreChargeMentale(identifiantAssignataire);

      return res.status(200).json({
        success: true,
        message: "Tâche partagée avec succès",
        data: tache
      });

    } catch (error) {
      console.error("Erreur lors du partage de la tâche:", error);
      return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
    }
  };
}

export default TachesController;