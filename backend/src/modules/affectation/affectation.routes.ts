import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";
import {
  closeAffectationCampaignHandler,
  createAffectationCampaignHandler,
  listAffectationCampaignsHandler,
  openAffectationCampaignHandler,
  updateAffectationCampaignHandler,
} from "./affectation.controller";

const router = Router();

const affectationAdminRoles = ["admin"];

router.get("/campaigns", requireAuth, requireRole(affectationAdminRoles), listAffectationCampaignsHandler);
router.post("/campaigns", requireAuth, requireRole(affectationAdminRoles), createAffectationCampaignHandler);
router.patch("/campaigns/:id", requireAuth, requireRole(affectationAdminRoles), updateAffectationCampaignHandler);
router.patch("/campaigns/:id/open", requireAuth, requireRole(affectationAdminRoles), openAffectationCampaignHandler);
router.patch("/campaigns/:id/close", requireAuth, requireRole(affectationAdminRoles), closeAffectationCampaignHandler);

export default router;
