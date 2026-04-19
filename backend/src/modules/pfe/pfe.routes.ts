import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";
import {
  getPFEStatsHandler,
  getPFESubjectByIdHandler,
  getPFESubjectsHandler,
  getTeacherCoursesHandler,
  getCourseGroupsHandler,
} from "./pfe.controller";

const router = Router();

router.get(
  "/summary",
  requireAuth,
  requireRole(["admin", "enseignant", "etudiant"]),
  getPFEStatsHandler
);

router.get(
  "/subjects",
  requireAuth,
  requireRole(["admin", "enseignant", "etudiant"]),
  getPFESubjectsHandler
);

router.get(
  "/subjects/:subjectId",
  requireAuth,
  requireRole(["admin", "enseignant", "etudiant"]),
  getPFESubjectByIdHandler
);

router.get(
  "/teacher/:teacherId/courses",
  requireAuth,
  requireRole(["admin", "enseignant"]),
  getTeacherCoursesHandler
);

router.get(
  "/course/:courseId/groups",
  requireAuth,
  requireRole(["admin", "enseignant"]),
  getCourseGroupsHandler
);

export default router;
