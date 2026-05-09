// routes/utilisateursRoute.js
import { Router } from "express";
import { body } from "express-validator";
import UtilisateurController from "../Controllers/utilisateursController.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

export default (models) => {
  const controller = new UtilisateurController(models);

  // Routes publiques (sans authentification)
  router.post(
    "/register",
    [
      body("email").isEmail().withMessage("Email invalide").normalizeEmail(),
      body("motDePasse")
        .isLength({ min: 6 })
        .withMessage("Le mot de passe doit contenir au moins 6 caractères"),
      body("nom")
        .notEmpty()
        .withMessage("Le nom est requis")
        .trim(),
      body("prenom")
        .optional()
        .trim()
    ],
    controller.register
  );

  router.post(
    "/login",
    [
      body("email").isEmail().withMessage("Email invalide").normalizeEmail(),
      body("motDePasse").notEmpty().withMessage("Mot de passe requis")
    ],
    controller.login
  );

  router.post("/logout", controller.logout);

  // Routes protégées (utilisateur connecté)
  router.use(authMiddleware);
  
  router.get("/profil", controller.getProfil);
  router.put("/profil", controller.updateProfil);
  router.put("/password", controller.changePassword);
  // router.get("/score-mental", controller.getScoreMental);

  return router;
};