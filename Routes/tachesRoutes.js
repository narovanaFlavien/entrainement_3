// routes/tachesRoute.js
import { Router } from "express";
import { body, query } from "express-validator";
import TachesController from "../Controllers/tachesController.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

export default (models) => {
  const controller = new TachesController(models);

  // Toutes les routes des tâches sont protégées
  router.use(authMiddleware);

  // GET /api/taches/stats - Statistiques (avant /:id pour éviter les conflits)
  router.get("/stats", controller.getStats);

  // GET /api/taches/mode-sature - Mode saturé (avant /:id pour éviter les conflits)
  router.get("/mode-sature", controller.getTachesModeSature);

  // GET /api/taches - Récupérer toutes les tâches
  router.get(
    "/",
    [
      query("statut").optional().isIn(['en_attente', 'en_cours', 'termine', 'annule']),
      query("categorie").optional().isIn(['courses', 'sante', 'maison', 'travail', 'famille', 'administratif', 'loisirs', 'autre']),
      query("priorite").optional().isIn(['basse', 'moyenne', 'haute', 'critique']),
      query("page").optional().isInt({ min: 1 }),
      query("limit").optional().isInt({ min: 1, max: 50 }),
      query("tri").optional().isIn(['dateCreation', 'dateEcheance', 'priorite', 'statut']),
      query("ordre").optional().isIn(['ASC', 'DESC']),
      query("modeSaturation").optional().isBoolean(),
    ],
    controller.getAllTaches
  );

  // POST /api/taches - Créer une tâche
  router.post(
    "/",
    [
      body("texteLibre").optional().isString().trim(),
      body("titre").optional().isString().trim().isLength({ min: 1, max: 200 }),
      body("description").optional().isString().trim(),
      body("categorie").optional().isIn(['courses', 'sante', 'maison', 'travail', 'famille', 'administratif', 'loisirs', 'autre']),
      body("priorite").optional().isIn(['basse', 'moyenne', 'haute', 'critique']),
      body("dateEcheance").optional().isISO8601(),
      body("identifiantAssignataire").optional().isUUID(),
      body("estPartage").optional().isBoolean(),
    ],
    controller.createTache
  );

  // GET /api/taches/:id - Récupérer une tâche spécifique
  router.get("/:id", controller.getTacheById);

  // PUT /api/taches/:id - Mettre à jour une tâche
  router.put("/:id", controller.updateTache);

  // PUT /api/taches/:id/valider - Valider une tâche
  router.put("/:id/valider", controller.validerTache);

  // POST /api/taches/:id/partager - Partager une tâche
  router.post("/:id/partager", controller.partagerTache);

  // DELETE /api/taches/:id - Supprimer une tâche
  router.delete("/:id", controller.deleteTache);

  return router;
};