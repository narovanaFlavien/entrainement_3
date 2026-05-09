// middleware/auth_middleware.js

/**
 * Middleware d'authentification par session
 * Vérifie si l'utilisateur est connecté via la session
 */
export const authMiddleware = (req, res, next) => {
  // Vérifier si la session existe et contient un userId
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      message: "Non authentifié. Veuillez vous connecter.",
      code: "AUTH_REQUIRED"
    });
  }

  // Vérifier si la session n'est pas expirée (optionnel)
  if (req.session.cookie && req.session.cookie.expires) {
    const now = new Date();
    const expiryDate = new Date(req.session.cookie.expires);
    
    if (now > expiryDate) {
      // Détruire la session expirée
      req.session.destroy((err) => {
        if (err) {
          console.error("Erreur lors de la destruction de la session:", err);
        }
      });
      
      return res.status(401).json({
        success: false,
        message: "Session expirée. Veuillez vous reconnecter.",
        code: "SESSION_EXPIRED"
      });
    }
  }

  // Ajouter les informations utilisateur à la requête pour les contrôleurs
  req.user = {
    id: req.session.userId,
    email: req.session.userEmail,
    nom: req.session.userNom
  };

  next();
};

/**
 * Middleware pour vérifier les rôles (optionnel)
 * @param {string[]} roles - Liste des rôles autorisés
 */
export const roleMiddleware = (...roles) => {
  return (req, res, next) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        success: false,
        message: "Non authentifié"
      });
    }

    // Si des rôles sont spécifiés, vérifier que l'utilisateur a le bon rôle
    if (roles.length > 0 && !roles.includes(req.session.userRole)) {
      return res.status(403).json({
        success: false,
        message: "Accès non autorisé. Vous n'avez pas les droits nécessaires.",
        code: "INSUFFICIENT_PERMISSIONS"
      });
    }

    next();
  };
};

/**
 * Middleware pour vérifier si l'utilisateur est en mode saturation
 * Utile pour certaines routes qui doivent adapter leur comportement
 */
export const saturationMiddleware = async (req, res, next) => {
  try {
    const { Utilisateur } = req.app.get('models');
    
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        success: false,
        message: "Non authentifié"
      });
    }

    const utilisateur = await Utilisateur.findByPk(req.session.userId, {
      attributes: ['modeSaturation', 'statutChargeMentale']
    });

    if (utilisateur) {
      req.userModeSaturation = utilisateur.modeSaturation;
      req.userStatutChargeMentale = utilisateur.statutChargeMentale;
    }

    next();
  } catch (error) {
    console.error("Erreur dans le middleware de saturation:", error);
    next();
  }
};