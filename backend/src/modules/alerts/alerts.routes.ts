import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";
import {
  createAlertHandler,
  deleteAlertHandler,
  getActiveAlertsHandler,
  getAlertHandler,
  listAlertsHandler,
  updateAlertHandler,
} from "./alerts.controller";

const router = Router();

router.get("/active", getActiveAlertsHandler);

router.get("/", requireAuth, requireRole(["admin"]), listAlertsHandler);
router.get("/:id", requireAuth, requireRole(["admin"]), getAlertHandler);
router.post("/", requireAuth, requireRole(["admin"]), createAlertHandler);
router.patch("/:id", requireAuth, requireRole(["admin"]), updateAlertHandler);
router.delete("/:id", requireAuth, requireRole(["admin"]), deleteAlertHandler);

export default router;
