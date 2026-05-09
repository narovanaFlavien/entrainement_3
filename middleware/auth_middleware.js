// middleware/auth.middleware.js
export const authMiddleware = (req, res, next) => {
  // Vérifier si l'utilisateur est connecté via la session
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      message: "Non authentifié. Veuillez vous connecter."
    });
  }
  next();
};

export const adminMiddleware = (req, res, next) => {
  // Vérifier si l'utilisateur est admin
  if (!req.session || req.session.userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      message: "Accès non autorisé. Droits administrateur requis."
    });
  }
  next();
};