import { Request, Response } from "express";
import { AuthRequest } from "../../middlewares/auth.middleware";
import {
  addGroupMemberForAdmin,
  addJuryMemberForAdmin,
  assignSujetFromChoicesForAdmin,
  createChoiceForAdmin,
  createGroupForAdmin,
  createSujetForAdmin,
  deleteChoiceForAdmin,
  deleteGroupForAdmin,
  deleteJuryMemberForAdmin,
  deleteSujetForAdmin,
  getGroupByIdForAdmin,
  listChoicesForAdmin,
  listGroupsForAdmin,
  listJuryForAdmin,
  listPendingSujetsForAdmin,
  listSujetsForAdmin,
  setSujetStatusForAdmin,
  updateChoiceStatusForAdmin,
  updateJuryRoleForAdmin,
  updateSujetForAdmin,
} from "./pfe-admin.service";

const parsePositiveInt = (value: unknown): number | undefined => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }
  return parsed;
};

const mapErrorStatus = (message: string) => {
  const normalized = message.toLowerCase();

  if (normalized.includes("introuvable") || normalized.includes("not found")) {
    return 404;
  }

  if (normalized.includes("deja") || normalized.includes("already")) {
    return 409;
  }

  return 400;
};

const respondError = (
  res: Response,
  code: string,
  fallbackMessage: string,
  error: unknown
) => {
  const message = error instanceof Error ? error.message : fallbackMessage;
  const status = mapErrorStatus(message);

  return res.status(status).json({
    success: false,
    error: {
      code,
      message,
    },
  });
};

export const getSujetsAdminHandler = async (req: Request, res: Response) => {
  try {
    const promoId = parsePositiveInt(req.query.promoId);
    const enseignantId = parsePositiveInt(req.query.enseignantId);
    const status =
      typeof req.query.status === "string" && req.query.status.trim()
        ? req.query.status.trim()
        : undefined;

    const subjects = await listSujetsForAdmin({
      promoId: promoId || undefined,
      enseignantId: enseignantId || undefined,
      status,
    });

    return res.json({
      success: true,
      data: subjects,
    });
  } catch (error) {
    return respondError(res, "PFE_LIST_SUJETS_FAILED", "Impossible de recuperer les sujets", error);
  }
};

export const createSujetAdminHandler = async (req: Request, res: Response) => {
  try {
    const enseignantId = parsePositiveInt(req.body?.enseignantId);
    const promoId = parsePositiveInt(req.body?.promoId);

    if (!enseignantId || !promoId) {
      return res.status(400).json({
        success: false,
        error: {
          code: "PFE_CREATE_SUJET_INVALID_FIELDS",
          message: "enseignantId et promoId sont requis",
        },
      });
    }

    const subject = await createSujetForAdmin({
      titre: String(req.body?.titre || ""),
      description: String(req.body?.description || ""),
      keywords: typeof req.body?.keywords === "string" ? req.body.keywords : undefined,
      workplan: typeof req.body?.workplan === "string" ? req.body.workplan : undefined,
      bibliographie:
        typeof req.body?.bibliographie === "string" ? req.body.bibliographie : undefined,
      typeProjet: typeof req.body?.type_projet === "string" ? req.body.type_projet : req.body?.typeProjet,
      enseignantId,
      promoId,
      anneeUniversitaire:
        typeof req.body?.annee_universitaire === "string"
          ? req.body.annee_universitaire
          : req.body?.anneeUniversitaire,
      maxGrps: Number.isInteger(req.body?.max_grps)
        ? req.body.max_grps
        : Number.isInteger(req.body?.maxGrps)
          ? req.body.maxGrps
          : undefined,
    });

    return res.status(201).json({
      success: true,
      data: subject,
      message: "Sujet PFE cree avec succes",
    });
  } catch (error) {
    return respondError(res, "PFE_CREATE_SUJET_FAILED", "Creation du sujet impossible", error);
  }
};

export const updateSujetAdminHandler = async (req: Request, res: Response) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
      return res.status(400).json({
        success: false,
        error: {
          code: "PFE_UPDATE_SUJET_INVALID_ID",
          message: "ID sujet invalide",
        },
      });
    }

    const enseignantId = req.body?.enseignantId === undefined
      ? undefined
      : parsePositiveInt(req.body.enseignantId);

    const promoId = req.body?.promoId === undefined
      ? undefined
      : parsePositiveInt(req.body.promoId);

    if (req.body?.enseignantId !== undefined && !enseignantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: "PFE_UPDATE_SUJET_INVALID_ENSEIGNANT",
          message: "enseignantId invalide",
        },
      });
    }

    if (req.body?.promoId !== undefined && !promoId) {
      return res.status(400).json({
        success: false,
        error: {
          code: "PFE_UPDATE_SUJET_INVALID_PROMO",
          message: "promoId invalide",
        },
      });
    }

    const subject = await updateSujetForAdmin(id, {
      titre: typeof req.body?.titre === "string" ? req.body.titre : undefined,
      description: typeof req.body?.description === "string" ? req.body.description : undefined,
      keywords: typeof req.body?.keywords === "string" ? req.body.keywords : undefined,
      workplan: typeof req.body?.workplan === "string" ? req.body.workplan : undefined,
      bibliographie:
        typeof req.body?.bibliographie === "string" ? req.body.bibliographie : undefined,
      typeProjet: typeof req.body?.type_projet === "string" ? req.body.type_projet : req.body?.typeProjet,
      status: typeof req.body?.status === "string" ? req.body.status : undefined,
      enseignantId,
      promoId,
      anneeUniversitaire:
        typeof req.body?.annee_universitaire === "string"
          ? req.body.annee_universitaire
          : req.body?.anneeUniversitaire,
      maxGrps: Number.isInteger(req.body?.max_grps)
        ? req.body.max_grps
        : Number.isInteger(req.body?.maxGrps)
          ? req.body.maxGrps
          : undefined,
    });

    return res.json({
      success: true,
      data: subject,
      message: "Sujet PFE mis a jour",
    });
  } catch (error) {
    return respondError(res, "PFE_UPDATE_SUJET_FAILED", "Mise a jour du sujet impossible", error);
  }
};

export const deleteSujetAdminHandler = async (req: Request, res: Response) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
      return res.status(400).json({
        success: false,
        error: {
          code: "PFE_DELETE_SUJET_INVALID_ID",
          message: "ID sujet invalide",
        },
      });
    }

    await deleteSujetForAdmin(id);

    return res.json({
      success: true,
      message: "Sujet PFE supprime",
    });
  } catch (error) {
    return respondError(res, "PFE_DELETE_SUJET_FAILED", "Suppression du sujet impossible", error);
  }
};

export const validateSujetAdminHandler = async (req: Request, res: Response) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
      return res.status(400).json({
        success: false,
        error: {
          code: "PFE_VALIDATE_SUJET_INVALID_ID",
          message: "ID sujet invalide",
        },
      });
    }

    const updated = await setSujetStatusForAdmin(id, "valide");

    return res.json({
      success: true,
      data: updated,
      message: "Sujet valide",
    });
  } catch (error) {
    return respondError(res, "PFE_VALIDATE_SUJET_FAILED", "Validation du sujet impossible", error);
  }
};

export const rejectSujetAdminHandler = async (req: Request, res: Response) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
      return res.status(400).json({
        success: false,
        error: {
          code: "PFE_REJECT_SUJET_INVALID_ID",
          message: "ID sujet invalide",
        },
      });
    }

    const updated = await setSujetStatusForAdmin(id, "reserve");

    return res.json({
      success: true,
      data: updated,
      message: "Sujet reserve",
    });
  } catch (error) {
    return respondError(res, "PFE_REJECT_SUJET_FAILED", "Rejet du sujet impossible", error);
  }
};

export const getPendingSujetsAdminHandler = async (_req: Request, res: Response) => {
  try {
    const pending = await listPendingSujetsForAdmin();

    return res.json({
      success: true,
      data: pending,
    });
  } catch (error) {
    return respondError(res, "PFE_PENDING_SUJETS_FAILED", "Impossible de recuperer les sujets en attente", error);
  }
};

export const getGroupsAdminHandler = async (_req: Request, res: Response) => {
  try {
    const groups = await listGroupsForAdmin();

    return res.json({
      success: true,
      data: groups,
    });
  } catch (error) {
    return respondError(res, "PFE_LIST_GROUPS_FAILED", "Impossible de recuperer les groupes", error);
  }
};

export const getGroupByIdAdminHandler = async (req: Request, res: Response) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
      return res.status(400).json({
        success: false,
        error: {
          code: "PFE_GROUP_INVALID_ID",
          message: "ID groupe invalide",
        },
      });
    }

    const group = await getGroupByIdForAdmin(id);

    return res.json({
      success: true,
      data: group,
    });
  } catch (error) {
    return respondError(res, "PFE_GROUP_FETCH_FAILED", "Impossible de recuperer le groupe", error);
  }
};

export const createGroupAdminHandler = async (req: Request, res: Response) => {
  try {
    const sujetFinalId = parsePositiveInt(req.body?.sujetFinalId);
    if (!sujetFinalId) {
      return res.status(400).json({
        success: false,
        error: {
          code: "PFE_CREATE_GROUP_INVALID_SUJET",
          message: "sujetFinalId est requis",
        },
      });
    }

    const coEncadrantId = req.body?.coEncadrantId === undefined
      ? undefined
      : parsePositiveInt(req.body.coEncadrantId);

    if (req.body?.coEncadrantId !== undefined && !coEncadrantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: "PFE_CREATE_GROUP_INVALID_CODIRECTOR",
          message: "coEncadrantId invalide",
        },
      });
    }

    const dateSoutenance = req.body?.dateSoutenance
      ? new Date(req.body.dateSoutenance)
      : null;

    const group = await createGroupForAdmin({
      nom: typeof req.body?.nom === "string" ? req.body.nom : undefined,
      nomEn: typeof req.body?.nom_en === "string" ? req.body.nom_en : req.body?.nomEn,
      sujetFinalId,
      coEncadrantId,
      dateSoutenance:
        dateSoutenance && !Number.isNaN(dateSoutenance.getTime()) ? dateSoutenance : null,
      salleSoutenance:
        typeof req.body?.salleSoutenance === "string" ? req.body.salleSoutenance : undefined,
    });

    return res.status(201).json({
      success: true,
      data: group,
      message: "Groupe PFE cree",
    });
  } catch (error) {
    return respondError(res, "PFE_CREATE_GROUP_FAILED", "Creation du groupe impossible", error);
  }
};

export const deleteGroupAdminHandler = async (req: Request, res: Response) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
      return res.status(400).json({
        success: false,
        error: {
          code: "PFE_DELETE_GROUP_INVALID_ID",
          message: "ID groupe invalide",
        },
      });
    }

    await deleteGroupForAdmin(id);

    return res.json({
      success: true,
      message: "Groupe PFE supprime",
    });
  } catch (error) {
    return respondError(res, "PFE_DELETE_GROUP_FAILED", "Suppression du groupe impossible", error);
  }
};

export const addGroupMemberAdminHandler = async (req: Request, res: Response) => {
  try {
    const groupId = parsePositiveInt(req.params.id);
    const etudiantId = parsePositiveInt(req.body?.etudiantId);

    if (!groupId || !etudiantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: "PFE_ADD_MEMBER_INVALID_FIELDS",
          message: "groupId et etudiantId sont requis",
        },
      });
    }

    const member = await addGroupMemberForAdmin(groupId, {
      etudiantId,
      role: typeof req.body?.role === "string" ? req.body.role : undefined,
    });

    return res.status(201).json({
      success: true,
      data: member,
      message: "Etudiant ajoute au groupe",
    });
  } catch (error) {
    return respondError(res, "PFE_ADD_MEMBER_FAILED", "Ajout du membre impossible", error);
  }
};

export const assignSubjectToGroupAdminHandler = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const groupId = parsePositiveInt(req.params.id);
    if (!groupId) {
      return res.status(400).json({
        success: false,
        error: {
          code: "PFE_ASSIGN_GROUP_INVALID_ID",
          message: "ID groupe invalide",
        },
      });
    }

    const assigned = await assignSujetFromChoicesForAdmin(groupId, undefined);

    return res.json({
      success: true,
      data: assigned,
      message: "Sujet affecte au groupe",
    });
  } catch (error) {
    return respondError(res, "PFE_ASSIGN_GROUP_FAILED", "Affectation du sujet impossible", error);
  }
};

export const getChoicesAdminHandler = async (_req: Request, res: Response) => {
  try {
    const choices = await listChoicesForAdmin();

    return res.json({
      success: true,
      data: choices,
    });
  } catch (error) {
    return respondError(res, "PFE_LIST_CHOICES_FAILED", "Impossible de recuperer les voeux", error);
  }
};

export const createChoiceAdminHandler = async (req: Request, res: Response) => {
  try {
    const groupId = parsePositiveInt(req.body?.groupId);
    const sujetId = parsePositiveInt(req.body?.sujetId);
    const ordre = parsePositiveInt(req.body?.ordre);

    if (!groupId || !sujetId || !ordre) {
      return res.status(400).json({
        success: false,
        error: {
          code: "PFE_CREATE_CHOICE_INVALID_FIELDS",
          message: "groupId, sujetId et ordre sont requis",
        },
      });
    }

    const choice = await createChoiceForAdmin(groupId, { sujetId, ordre });

    return res.status(201).json({
      success: true,
      data: choice,
      message: "Voeu enregistre",
    });
  } catch (error) {
    return respondError(res, "PFE_CREATE_CHOICE_FAILED", "Creation du voeu impossible", error);
  }
};

export const updateChoiceStatusAdminHandler = async (req: Request, res: Response) => {
  try {
    const id = parsePositiveInt(req.params.id);
    const status = typeof req.body?.status === "string" ? req.body.status : "";

    if (!id || !status) {
      return res.status(400).json({
        success: false,
        error: {
          code: "PFE_UPDATE_CHOICE_INVALID_FIELDS",
          message: "ID voeu et status sont requis",
        },
      });
    }

    const updated = await updateChoiceStatusForAdmin(id, status);

    return res.json({
      success: true,
      data: updated,
      message: "Status du voeu mis a jour",
    });
  } catch (error) {
    return respondError(res, "PFE_UPDATE_CHOICE_FAILED", "Mise a jour du voeu impossible", error);
  }
};

export const deleteChoiceAdminHandler = async (req: Request, res: Response) => {
  try {
    const id = parsePositiveInt(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        error: {
          code: "PFE_DELETE_CHOICE_INVALID_ID",
          message: "ID voeu invalide",
        },
      });
    }

    await deleteChoiceForAdmin(id);

    return res.json({
      success: true,
      message: "Voeu supprime",
    });
  } catch (error) {
    return respondError(res, "PFE_DELETE_CHOICE_FAILED", "Suppression du voeu impossible", error);
  }
};

export const getJuryAdminHandler = async (_req: Request, res: Response) => {
  try {
    const jury = await listJuryForAdmin();

    return res.json({
      success: true,
      data: jury,
    });
  } catch (error) {
    return respondError(res, "PFE_LIST_JURY_FAILED", "Impossible de recuperer le jury", error);
  }
};

export const getJuryByGroupAdminHandler = async (req: Request, res: Response) => {
  try {
    const groupId = parsePositiveInt(req.params.id);

    if (!groupId) {
      return res.status(400).json({
        success: false,
        error: {
          code: "PFE_GROUP_JURY_INVALID_ID",
          message: "ID groupe invalide",
        },
      });
    }

    const jury = await listJuryForAdmin(groupId);

    return res.json({
      success: true,
      data: jury,
    });
  } catch (error) {
    return respondError(res, "PFE_GROUP_JURY_FAILED", "Impossible de recuperer le jury du groupe", error);
  }
};

export const addJuryMemberAdminHandler = async (req: Request, res: Response) => {
  try {
    const groupId = parsePositiveInt(req.body?.groupId);
    const enseignantId = parsePositiveInt(req.body?.enseignantId);

    if (!groupId || !enseignantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: "PFE_ADD_JURY_INVALID_FIELDS",
          message: "groupId et enseignantId sont requis",
        },
      });
    }

    const juryMember = await addJuryMemberForAdmin(groupId, {
      enseignantId,
      role: typeof req.body?.role === "string" ? req.body.role : undefined,
    });

    return res.status(201).json({
      success: true,
      data: juryMember,
      message: "Membre du jury ajoute",
    });
  } catch (error) {
    return respondError(res, "PFE_ADD_JURY_FAILED", "Ajout au jury impossible", error);
  }
};

export const updateJuryRoleAdminHandler = async (req: Request, res: Response) => {
  try {
    const id = parsePositiveInt(req.params.id);
    const role = typeof req.body?.role === "string" ? req.body.role : "";

    if (!id || !role) {
      return res.status(400).json({
        success: false,
        error: {
          code: "PFE_UPDATE_JURY_INVALID_FIELDS",
          message: "ID jury et role sont requis",
        },
      });
    }

    const updated = await updateJuryRoleForAdmin(id, role);

    return res.json({
      success: true,
      data: updated,
      message: "Role du jury mis a jour",
    });
  } catch (error) {
    return respondError(res, "PFE_UPDATE_JURY_FAILED", "Mise a jour du jury impossible", error);
  }
};

export const deleteJuryMemberAdminHandler = async (req: Request, res: Response) => {
  try {
    const id = parsePositiveInt(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        error: {
          code: "PFE_DELETE_JURY_INVALID_ID",
          message: "ID jury invalide",
        },
      });
    }

    await deleteJuryMemberForAdmin(id);

    return res.json({
      success: true,
      message: "Membre du jury supprime",
    });
  } catch (error) {
    return respondError(res, "PFE_DELETE_JURY_FAILED", "Suppression du membre du jury impossible", error);
  }
};
