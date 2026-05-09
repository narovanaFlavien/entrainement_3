// controllers/utilisateur.controller.js
import { Op } from "sequelize";
import bcrypt from "bcrypt";
import { validationResult } from "express-validator";
import { utilisateurStatutEnumerate } from "../models/Utilisateur.js";

class utilisateursController {
  constructor(models) {
    this.Utilisateur = models.Utilisateur;
    this.Famille = models.Famille;
    this.MembreFamille = models.MembreFamille;
    this.Tache = models.Tache;
    this.Notification = models.Notification;
    this.sequelize = models.sequelize;
  }

  //si possible chaque methode utilise les transaction pour garantir l'integrite des donnees
  

  /**
   * POST /api/utilisateurs/register
   * Inscription d'un nouvel utilisateur
   */
  // la création d'un utilisateur entraine la création d'une famille pour lui même et le met comme createur de la famille
  register = async (req, res) => {
    //utilisation des transaction pour garantir l'integrite des donnees
    const transaction = await this.sequelize.transaction();
    try {
      // Validation des entrées
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { nom, prenom, email, motDePasse, tel, role } = req.body;

      // Vérifier si l'email existe déjà
      const existingUser = await this.Utilisateur.findOne({
        where: { email }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Cet email est déjà utilisé"
        });
      }

      // Vérifier si le tel existe déjà
      if (tel) {
        const existingTel = await this.Utilisateur.findOne({
          where: { tel }
        });

        if (existingTel) {
          return res.status(409).json({
            success: false,
            message: "Ce numéro de téléphone est déjà utilisé"
          });
        }
      }

      
      
      // Hasher le mot de passe
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(motDePasse, salt);

      // Créer l'utilisateur
      const utilisateur = await this.Utilisateur.create({
        nom,
        prenom,
        email,
        motDePasse: hashedPassword,
        tel,
        statutCompte: utilisateurStatutEnumerate.ACTIF,
      }, { transaction });

      //la création d'une famille pour lui même et le met comme createur de la famille
      const famille = await this.Famille.create({
        nom,
        identifiantCreateur: utilisateur.id,
      }, { transaction });

      const membreFamille = await this.MembreFamille.create({
        identifiantUtilisateur: utilisateur.id,
        identifiantFamille: famille.id,
      }, { transaction });

      // Retourner l'utilisateur sans le mot de passe
      const { password: pwd, ...userResponse } = utilisateur.toJSON();
      
      // commit de la transaction
      await transaction.commit();

      return res.status(201).json({
        success: true,
        message: "Utilisateur créé avec succès",
        data: userResponse
      });

    } catch (error) {
      console.error("Erreur lors de l'inscription:", error);
      // rollback de la transaction
      await transaction.rollback();
      return res.status(500).json({
        success: false,
        message: "Erreur serveur lors de l'inscription",
        error: error.message
      });
    }
  };

  /**
   * POST /api/utilisateurs/login
   * Connexion d'un utilisateur
   */
  login = async (req, res) => {
    try {
      const { email, password } = req.body;

      // Vérifier si l'utilisateur existe
      const utilisateur = await this.Utilisateur.findOne({
        where: { email }
      });

      if (!utilisateur) {
        return res.status(404).json({
          success: false,
          message: "Email ou mot de passe incorrect"
        });
      }

      // Vérifier si le compte est actif
      if (utilisateur.status !== 'Actif') {
        return res.status(403).json({
          success: false,
          message: "Votre compte est désactivé. Contactez l'administrateur."
        });
      }

      // Vérifier le mot de passe
      const isPasswordValid = await bcrypt.compare(password, utilisateur.password);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Email ou mot de passe incorrect"
        });
      }

      // Stocker l'ID utilisateur en session
      req.session.userId = utilisateur.id_utilisateur;
      req.session.userRole = utilisateur.role;

      const { password: pwd, ...userResponse } = utilisateur.toJSON();

      return res.status(200).json({
        success: true,
        message: "Connexion réussie",
        data: userResponse
      });

    } catch (error) {
      console.error("Erreur lors de la connexion:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur serveur lors de la connexion",
        error: error.message
      });
    }
  };

  /**
   * POST /api/utilisateurs/logout
   * Déconnexion
   */
  logout = async (req, res) => {
    try {
      // Détruire la session
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: "Erreur lors de la déconnexion"
          });
        }

        res.clearCookie('connect.sid');
        return res.status(200).json({
          success: true,
          message: "Déconnexion réussie"
        });
      });
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur serveur",
        error: error.message
      });
    }
  };

  /**
   * GET /api/utilisateurs/profil
   * Récupérer le profil de l'utilisateur connecté
   */
  getProfil = async (req, res) => {
    try {
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Non authentifié"
        });
      }

      const utilisateur = await this.Utilisateur.findByPk(userId, {
        include: [
          {
            model: this.Tache,
            as: 'taches',
            attributes: ['id_tache', 'titre', 'status', 'priorite', 'date_echeance'],
            where: { status: { [Op.ne]: 'done' } },
            required: false
          },
          {
            model: this.Notification,
            as: 'notifications',
            attributes: ['id_notification', 'titre', 'message', 'is_read'],
            where: { is_read: false },
            required: false,
            limit: 10,
            order: [['date_creation', 'DESC']]
          }
        ]
      });

      if (!utilisateur) {
        return res.status(404).json({
          success: false,
          message: "Utilisateur non trouvé"
        });
      }

      const { password: pwd, ...userResponse } = utilisateur.toJSON();

      // Ajouter des statistiques
      userResponse.statistiques = {
        taches_actives: utilisateur.taches?.length || 0,
        notifications_non_lues: utilisateur.notifications?.length || 0
      };

      return res.status(200).json({
        success: true,
        data: userResponse
      });

    } catch (error) {
      console.error("Erreur lors de la récupération du profil:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur serveur",
        error: error.message
      });
    }
  };

  /**
   * PUT /api/utilisateurs/profil
   * Mettre à jour le profil
   */
  updateProfil = async (req, res) => {
    try {
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Non authentifié"
        });
      }

      const { nom, prenom, tel, photo } = req.body;

      // Vérifier si l'utilisateur existe
      const utilisateur = await this.Utilisateur.findByPk(userId);

      if (!utilisateur) {
        return res.status(404).json({
          success: false,
          message: "Utilisateur non trouvé"
        });
      }

      // Vérifier si le tel est unique
      if (tel && tel !== utilisateur.tel) {
        const existingTel = await this.Utilisateur.findOne({
          where: {
            tel,
            id_utilisateur: { [Op.ne]: userId }
          }
        });

        if (existingTel) {
          return res.status(409).json({
            success: false,
            message: "Ce numéro de téléphone est déjà utilisé"
          });
        }
      }

      // Mettre à jour l'utilisateur
      await utilisateur.update({
        nom: nom || utilisateur.nom,
        prenom: prenom || utilisateur.prenom,
        tel: tel || utilisateur.tel,
        photo: photo || utilisateur.photo
      });

      const { password: pwd, ...userResponse } = utilisateur.toJSON();

      return res.status(200).json({
        success: true,
        message: "Profil mis à jour avec succès",
        data: userResponse
      });

    } catch (error) {
      console.error("Erreur lors de la mise à jour du profil:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur serveur",
        error: error.message
      });
    }
  };

  /**
   * PUT /api/utilisateurs/password
   * Changer le mot de passe
   */
  changePassword = async (req, res) => {
    try {
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Non authentifié"
        });
      }

      const { ancienPassword, nouveauPassword } = req.body;

      const utilisateur = await this.Utilisateur.findByPk(userId);

      if (!utilisateur) {
        return res.status(404).json({
          success: false,
          message: "Utilisateur non trouvé"
        });
      }

      // Vérifier l'ancien mot de passe
      const isPasswordValid = await bcrypt.compare(ancienPassword, utilisateur.password);

      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          message: "Ancien mot de passe incorrect"
        });
      }

      // Hasher le nouveau mot de passe
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(nouveauPassword, salt);

      await utilisateur.update({ password: hashedPassword });

      return res.status(200).json({
        success: true,
        message: "Mot de passe changé avec succès"
      });

    } catch (error) {
      console.error("Erreur lors du changement de mot de passe:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur serveur",
        error: error.message
      });
    }
  };

  /**
   * GET /api/utilisateurs
   * Récupérer tous les utilisateurs (admin uniquement)
   */
  getAllUsers = async (req, res) => {
    try {
      // Vérifier les droits admin via la session
      if (req.session.userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: "Accès non autorisé. Droits administrateur requis."
        });
      }

      const { page = 1, limit = 10, status, role, search } = req.query;
      const offset = (page - 1) * limit;

      const whereClause = {};

      if (status) whereClause.status = status;
      if (role) whereClause.role = role;
      if (search) {
        whereClause[Op.or] = [
          { nom: { [Op.like]: `%${search}%` } },
          { prenom: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } }
        ];
      }

      const { count, rows } = await this.Utilisateur.findAndCountAll({
        where: whereClause,
        attributes: { exclude: ['password'] },
        limit: parseInt(limit),
        offset: offset,
        order: [['date_creation', 'DESC']]
      });

      return res.status(200).json({
        success: true,
        data: {
          utilisateurs: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            totalPages: Math.ceil(count / limit),
            limit: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error("Erreur lors de la récupération des utilisateurs:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur serveur",
        error: error.message
      });
    }
  };

  /**
   * GET /api/utilisateurs/:id
   * Récupérer un utilisateur par ID (admin uniquement)
   */
  getUserById = async (req, res) => {
    try {
      // Vérifier les droits admin
      if (req.session.userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: "Accès non autorisé"
        });
      }

      const { id } = req.params;

      const utilisateur = await this.Utilisateur.findByPk(id, {
        attributes: { exclude: ['password'] },
        include: [
          {
            model: this.Tache,
            as: 'taches',
            attributes: ['id_tache', 'titre', 'status', 'date_echeance'],
            limit: 10
          }
        ]
      });

      if (!utilisateur) {
        return res.status(404).json({
          success: false,
          message: "Utilisateur non trouvé"
        });
      }

      return res.status(200).json({
        success: true,
        data: utilisateur
      });

    } catch (error) {
      console.error("Erreur lors de la récupération de l'utilisateur:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur serveur",
        error: error.message
      });
    }
  };

  /**
   * PUT /api/utilisateurs/:id/status
   * Changer le statut d'un utilisateur (admin uniquement)
   */
  updateUserStatus = async (req, res) => {
    try {
      if (req.session.userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: "Accès non autorisé"
        });
      }

      const { id } = req.params;
      const { status } = req.body;

      const utilisateur = await this.Utilisateur.findByPk(id);

      if (!utilisateur) {
        return res.status(404).json({
          success: false,
          message: "Utilisateur non trouvé"
        });
      }

      await utilisateur.update({ status });

      return res.status(200).json({
        success: true,
        message: `Statut de l'utilisateur mis à jour à : ${status}`
      });

    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur serveur",
        error: error.message
      });
    }
  };

  /**
   * DELETE /api/utilisateurs/:id
   * Supprimer un utilisateur (admin uniquement)
   */
  deleteUser = async (req, res) => {
    try {
      if (req.session.userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: "Accès non autorisé"
        });
      }

      const { id } = req.params;

      const utilisateur = await this.Utilisateur.findByPk(id);

      if (!utilisateur) {
        return res.status(404).json({
          success: false,
          message: "Utilisateur non trouvé"
        });
      }

      // Empêcher l'admin de se supprimer lui-même
      if (parseInt(id) === req.session.userId) {
        return res.status(400).json({
          success: false,
          message: "Vous ne pouvez pas supprimer votre propre compte"
        });
      }

      await utilisateur.destroy();

      return res.status(200).json({
        success: true,
        message: "Utilisateur supprimé avec succès"
      });

    } catch (error) {
      console.error("Erreur lors de la suppression de l'utilisateur:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur serveur",
        error: error.message
      });
    }
  };
}

export default utilisateursController;