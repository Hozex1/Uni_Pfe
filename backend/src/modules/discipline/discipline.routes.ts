import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";

import {
  addMembreHandler,
  createConseilHandler,
  createDossierHandler,
  createDecisionHandler,
  createInfractionHandler,
  deleteDecisionHandler,
  deleteConseilHandler,
  deleteDossierHandler,
  deleteInfractionHandler,
  finaliserConseilHandler,
  getConseilHandler,
  getDecisionHandler,
  getDisciplineStudentProfileHandler,
  getDossierHandler,
  getInfractionHandler,
  listConseilsHandler,
  listDecisionsHandler,
  listDisciplineStudentsHandler,
  listDossiersHandler,
  listInfractionsHandler,
  listStaffHandler,
  recordDecisionHandler,
  removeMembreHandler,
  scheduleMeetingHandler,
  statsHandler,
  updateConseilHandler,
  updateDecisionHandler,
  updateDossierHandler,
  updateInfractionHandler,
} from "./discipline.controller";

const router = Router();

// Read access: any authenticated teacher or admin can browse.
const readRoles = ["admin", "enseignant"];
// Reporting: teachers AND admins can create dossiers.
const reportRoles = ["admin", "enseignant"];
// Admin-only: meeting creation/edition/deletion, dossier mutation, member mgmt.
const adminOnly = ["admin"];
// Decision/finalisation: route-level allows enseignant; the handler then
// verifies the caller is the *president* of the specific conseil.
const presidentRoles = ["enseignant"];

router.get("/conseils", requireAuth, requireRole(readRoles), listConseilsHandler);
router.get("/conseils/:id", requireAuth, requireRole(readRoles), getConseilHandler);
router.post("/conseils", requireAuth, requireRole(adminOnly), createConseilHandler);
router.patch("/conseils/:id", requireAuth, requireRole(adminOnly), updateConseilHandler);
router.delete("/conseils/:id", requireAuth, requireRole(adminOnly), deleteConseilHandler);
router.patch("/conseils/:id/finaliser", requireAuth, requireRole(presidentRoles), finaliserConseilHandler);
router.post("/membres-conseil", requireAuth, requireRole(adminOnly), addMembreHandler);
router.post("/conseils/:cid/membres", requireAuth, requireRole(adminOnly), addMembreHandler);
router.delete("/conseils/:cid/membres/:mid", requireAuth, requireRole(adminOnly), removeMembreHandler);

router.get("/dossiers-disciplinaires", requireAuth, requireRole(readRoles), listDossiersHandler);
router.get("/cases", requireAuth, requireRole(readRoles), listDossiersHandler);
router.get("/dossiers-disciplinaires/:id", requireAuth, requireRole(readRoles), getDossierHandler);
router.get("/cases/:id", requireAuth, requireRole(readRoles), getDossierHandler);
router.post("/dossiers-disciplinaires", requireAuth, requireRole(reportRoles), createDossierHandler);
router.post("/cases", requireAuth, requireRole(reportRoles), createDossierHandler);
router.patch("/dossiers-disciplinaires/:id", requireAuth, requireRole(adminOnly), updateDossierHandler);
router.patch("/cases/:id", requireAuth, requireRole(adminOnly), updateDossierHandler);
router.delete("/dossiers-disciplinaires/:id", requireAuth, requireRole(adminOnly), deleteDossierHandler);
router.delete("/cases/:id", requireAuth, requireRole(adminOnly), deleteDossierHandler);

router.get("/infractions", requireAuth, requireRole(readRoles), listInfractionsHandler);
router.get("/infractions/:id", requireAuth, requireRole(readRoles), getInfractionHandler);
router.post("/infractions", requireAuth, requireRole(adminOnly), createInfractionHandler);
router.patch("/infractions/:id", requireAuth, requireRole(adminOnly), updateInfractionHandler);
router.put("/infractions/:id", requireAuth, requireRole(adminOnly), updateInfractionHandler);
router.delete("/infractions/:id", requireAuth, requireRole(adminOnly), deleteInfractionHandler);

router.get("/decisions", requireAuth, requireRole(readRoles), listDecisionsHandler);
router.get("/decisions/:id", requireAuth, requireRole(readRoles), getDecisionHandler);
router.post("/decisions/catalog", requireAuth, requireRole(adminOnly), createDecisionHandler);
router.patch("/decisions/:id", requireAuth, requireRole(adminOnly), updateDecisionHandler);
router.put("/decisions/:id", requireAuth, requireRole(adminOnly), updateDecisionHandler);
router.delete("/decisions/:id", requireAuth, requireRole(adminOnly), deleteDecisionHandler);

router.get("/students", requireAuth, requireRole(readRoles), listDisciplineStudentsHandler);
router.get("/students/:id/profile", requireAuth, requireRole(readRoles), getDisciplineStudentProfileHandler);
router.get("/staff", requireAuth, requireRole(readRoles), listStaffHandler);

router.post("/meetings", requireAuth, requireRole(adminOnly), scheduleMeetingHandler);
router.get("/meetings", requireAuth, requireRole(readRoles), listConseilsHandler);
router.post("/decisions", requireAuth, requireRole(presidentRoles), recordDecisionHandler);
router.get("/stats", requireAuth, requireRole(readRoles), statsHandler);

export default router;
