// routes/utilisateur.routes.js
import { Router } from "express";
import { body } from "express-validator";
import UtilisateurController from "../Controllers/utilisateursController.js";
import { authMiddleware, adminMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

export default (models) => {
  const controller = new UtilisateurController(models);

  // Routes publiques (sans authentification)
  router.post(
    "/register",
    [
      body("email").isEmail().withMessage("Email invalide").normalizeEmail(),
      body("password")
        .isLength({ min: 6 })
        .withMessage("Le mot de passe doit contenir au moins 6 caractères"),
      body("nom")
        .notEmpty()
        .withMessage("Le nom est requis")
        .trim()
    ],
    controller.register
  );

  router.post(
    "/login",
    [
      body("email").isEmail().withMessage("Email invalide"),
      body("password").notEmpty().withMessage("Mot de passe requis")
    ],
    controller.login
  );

  router.post("/logout", controller.logout);

  // Routes protégées (utilisateur connecté)
  router.use(authMiddleware);
  
  router.get("/profil", controller.getProfil);
  router.put("/profil", controller.updateProfil);
  router.put("/password", controller.changePassword);

  // Routes admin uniquement
  router.get("/", adminMiddleware, controller.getAllUsers);
  router.get("/:id", adminMiddleware, controller.getUserById);
  router.put("/:id/status", adminMiddleware, controller.updateUserStatus);
  router.delete("/:id", adminMiddleware, controller.deleteUser);

  return router;
};