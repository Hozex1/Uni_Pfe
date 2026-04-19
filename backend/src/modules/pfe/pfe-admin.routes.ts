import { Router } from "express";
import {
  addGroupMemberAdminHandler,
  addJuryMemberAdminHandler,
  assignSubjectToGroupAdminHandler,
  createChoiceAdminHandler,
  createGroupAdminHandler,
  createSujetAdminHandler,
  deleteChoiceAdminHandler,
  deleteGroupAdminHandler,
  deleteJuryMemberAdminHandler,
  deleteSujetAdminHandler,
  getChoicesAdminHandler,
  getGroupByIdAdminHandler,
  getGroupsAdminHandler,
  getJuryAdminHandler,
  getJuryByGroupAdminHandler,
  getPendingSujetsAdminHandler,
  getSujetsAdminHandler,
  rejectSujetAdminHandler,
  updateChoiceStatusAdminHandler,
  updateJuryRoleAdminHandler,
  updateSujetAdminHandler,
  validateSujetAdminHandler,
} from "./pfe-admin.controller";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";

const router = Router();

router.use(requireAuth, requireRole("admin"));

router.get("/sujets", getSujetsAdminHandler);
router.post("/sujets", createSujetAdminHandler);
router.put("/sujets/:id", updateSujetAdminHandler);
router.delete("/sujets/:id", deleteSujetAdminHandler);
router.post("/sujets/:id/valider", validateSujetAdminHandler);
router.post("/sujets/:id/rejeter", rejectSujetAdminHandler);
router.get("/sujets/pending", getPendingSujetsAdminHandler);

router.get("/groups", getGroupsAdminHandler);
router.get("/groups/:id", getGroupByIdAdminHandler);
router.post("/groups", createGroupAdminHandler);
router.delete("/groups/:id", deleteGroupAdminHandler);
router.post("/groups/:id/members", addGroupMemberAdminHandler);
router.post("/groups/:id/assign-subject", assignSubjectToGroupAdminHandler);

router.get("/choix-sujets", getChoicesAdminHandler);
router.post("/choix-sujets", createChoiceAdminHandler);
router.put("/choix-sujets/:id/status", updateChoiceStatusAdminHandler);
router.delete("/choix-sujets/:id", deleteChoiceAdminHandler);

router.get("/jury", getJuryAdminHandler);
router.get("/groups/:id/jury", getJuryByGroupAdminHandler);
router.post("/jury", addJuryMemberAdminHandler);
router.put("/jury/:id", updateJuryRoleAdminHandler);
router.delete("/jury/:id", deleteJuryMemberAdminHandler);

export default router;
