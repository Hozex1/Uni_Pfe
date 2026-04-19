import { Router } from "express";
import {
  getGroupStudentsHandler,
  searchAvailableStudentsHandler,
  bulkAssignStudentsHandler,
  removeStudentHandler,
  setGroupLeaderHandler,
  getGroupWithTeacherHandler,
} from "./pfe-group.controller";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";

const router = Router();

/**
 * ==================== PFE GROUP MANAGEMENT ROUTES ====================
 * All routes require authentication and admin role
 */

// ── Get group students (view) ───────────────────────────────────
router.get(
  "/:groupId/students",
  requireAuth,
  requireRole(["admin", "enseignant"]),
  getGroupStudentsHandler
);

// ── Search available students (with auto-exclude) ──────────────
router.get(
  "/students/search",
  requireAuth,
  requireRole(["admin"]),
  searchAvailableStudentsHandler
);

// ── Get group with teacher info ────────────────────────────────
router.get(
  "/:groupId/with-teacher",
  requireAuth,
  requireRole(["admin"]),
  getGroupWithTeacherHandler
);

// ── Bulk assign students ───────────────────────────────────────
router.post(
  "/:groupId/assign-students",
  requireAuth,
  requireRole(["admin"]),
  bulkAssignStudentsHandler
);

// ── Remove student from group ──────────────────────────────────
router.delete(
  "/:groupId/students/:studentId",
  requireAuth,
  requireRole(["admin"]),
  removeStudentHandler
);

// ── Set group leader ───────────────────────────────────────────
router.put(
  "/:groupId/leader/:studentId",
  requireAuth,
  requireRole(["admin"]),
  setGroupLeaderHandler
);

export default router;
