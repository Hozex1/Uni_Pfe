// Consolidated Disciplinary Module Controller
// Integrates Conseil, Dossier, Decision, and Infraction management

import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../../middlewares/auth.middleware";
import prisma from "../../config/database";

const ADMIN_ROLE = "admin";
const MIN_ADDITIONAL_COUNCIL_MEMBERS = 2;
const MAX_ADDITIONAL_COUNCIL_MEMBERS = 2;

type DossierSignalantRow = {
  id: number;
  status: string;
  enseignantSignalant: number | null;
  conseilId: number | null;
};

type ConseilMemberRow = {
  id: number;
  enseignantId: number;
  role: string;
};

const normalizeRole = (role: string) => String(role || "").trim().toLowerCase();

const callerIsAdmin = (req: AuthRequest): boolean =>
  Array.isArray(req.user?.roles) && req.user.roles.some((role) => normalizeRole(role) === ADMIN_ROLE);

const getCallerEnseignantId = async (userId: number): Promise<number | null> => {
  const enseignant = await prisma.enseignant.findUnique({
    where: { userId },
    select: { id: true },
  });

  return enseignant?.id ?? null;
};

/* ════════════════════════════════════════════════════════════════
   INCLUDE QUERIES (Reusable Relations)
   ════════════════════════════════════════════════════════════════ */

const dossierInclude = {
  etudiant: {
    include: {
      user: { select: { nom: true, prenom: true, email: true } },
      promo: {
        include: {
          specialite: {
            include: { filiere: { select: { id: true, nom_ar: true, nom_en: true } } },
          },
        },
      },
    },
  },
  infraction: true,
  decision: true,
  enseignantSignalantR: {
    include: { user: { select: { nom: true, prenom: true } } },
  },
  conseil: { select: { id: true, dateReunion: true, lieu: true, status: true } },
};

const conseilInclude = {
  membres: {
    include: {
      enseignant: {
        include: {
          user: { select: { nom: true, prenom: true } },
          grade: { select: { id: true, nom_ar: true, nom_en: true } },
        },
      },
    },
  },
  dossiers: {
    include: {
      etudiant: {
        include: {
          user: { select: { nom: true, prenom: true } },
          promo: {
            include: {
              specialite: {
                include: { filiere: { select: { id: true, nom_ar: true, nom_en: true } } },
              },
            },
          },
        },
      },
      infraction: true,
      decision: true,
      enseignantSignalantR: {
        include: { user: { select: { nom: true, prenom: true } } },
      },
    },
  },
};

/* ════════════════════════════════════════════════════════════════
   TRANSFORMATION HELPERS
   ════════════════════════════════════════════════════════════════ */

/**
 * Transform decision object to frontend-compatible format
 * Maps nom_ar/nom_en to verdict, description_ar/en to details
 */
const transformDecision = (decision: any) => {
  if (!decision) return null;
  return {
    id: decision.id,
    verdict: decision.nom_en || decision.nom_ar,
    details: decision.description_en || decision.description_ar,
    niveauSanction: decision.niveauSanction,
  };
};

/**
 * Transform dossier to include formatted decision
 */
const transformDossier = (dossier: any) => ({
  ...dossier,
  decision: transformDecision(dossier.decision),
});

/**
 * Transform array of dossiers
 */
const transformDossiers = (dossiers: any[]) => dossiers.map(transformDossier);

/* ════════════════════════════════════════════════════════════════
   DOSSIER DISCIPLINAIRE HANDLERS
   ════════════════════════════════════════════════════════════════ */

/**
 * GET /api/v1/cd/dossiers-disciplinaires
 * GET /api/v1/cd/cases
 * List all disciplinary dossiers with optional filters
 */
export const listDossiersHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, error: { message: "Authentification requise." } });
      return;
    }

    const isAdmin = callerIsAdmin(req);
    const callerEnseignantId = isAdmin ? null : await getCallerEnseignantId(req.user.id);

    if (!isAdmin && !callerEnseignantId) {
      res.status(403).json({
        success: false,
        error: { message: "Accès refusé: profil enseignant introuvable." },
      });
      return;
    }

    const { status, conseilId, search, gravite, studentId } = req.query;

    const dossiers = await prisma.dossierDisciplinaire.findMany({
      where: {
        ...(!isAdmin && callerEnseignantId ? { enseignantSignalant: callerEnseignantId } : {}),
        ...(status && { status: status as any }),
        ...(conseilId && { conseilId: Number(conseilId) }),
        ...(gravite && { infraction: { gravite: gravite as any } }),
        ...(studentId && { etudiantId: Number(studentId) }),
        ...(search && {
          OR: [
            {
              etudiant: {
                user: {
                  OR: [
                    { nom: { contains: search as string, mode: "insensitive" } },
                    { prenom: { contains: search as string, mode: "insensitive" } },
                  ],
                },
              },
            },
            {
              descriptionSignal_ar: { contains: search as string, mode: "insensitive" },
            },
            {
              descriptionSignal_en: { contains: search as string, mode: "insensitive" },
            },
          ],
        }),
      },
      include: dossierInclude,
      orderBy: { dateSignal: "desc" },
    });

    res.json({ success: true, data: transformDossiers(dossiers) });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/cd/dossiers-disciplinaires/:id
 * GET /api/v1/cd/cases/:id
 * Get a single dossier by ID
 */
export const getDossierHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, error: { message: "Authentification requise." } });
      return;
    }

    const isAdmin = callerIsAdmin(req);
    const callerEnseignantId = isAdmin ? null : await getCallerEnseignantId(req.user.id);

    if (!isAdmin && !callerEnseignantId) {
      res.status(403).json({
        success: false,
        error: { message: "Accès refusé: profil enseignant introuvable." },
      });
      return;
    }

    const dossier = await prisma.dossierDisciplinaire.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        ...dossierInclude,
        conseil: {
          include: {
            membres: {
              include: {
                enseignant: {
                  include: {
                    user: { select: { nom: true, prenom: true } },
                    grade: { select: { id: true, nom_ar: true, nom_en: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!dossier) {
      res.status(404).json({ success: false, error: { message: "Dossier introuvable." } });
      return;
    }

    // If not admin, verify access
    if (!isAdmin && callerEnseignantId && dossier.enseignantSignalant !== callerEnseignantId) {
      // Check if user is a member of the related conseil
      if (dossier.conseilId) {
        const isMember = dossier.conseil?.membres.some((m: any) => m.enseignantId === callerEnseignantId);
        if (!isMember) {
          res.status(403).json({
            success: false,
            error: { message: "Accès refusé à ce dossier." },
          });
          return;
        }
      } else {
        // Dossier not attached to any conseil and user is not the reporter
        res.status(403).json({
          success: false,
          error: { message: "Accès refusé à ce dossier." },
        });
        return;
      }
    }

    // Determine access control for the related conseil if present
    let conseilAccessControl = null;
    if (dossier.conseil) {
      const userMember = dossier.conseil.membres.find((m: any) => m.enseignantId === callerEnseignantId);
      const isPresident = userMember?.role === "president";
      const canMakeDecisions = isAdmin || isPresident;

      conseilAccessControl = {
        isAdmin,
        isPresident,
        canMakeDecisions,
        isViewOnly: !canMakeDecisions && (isAdmin || callerEnseignantId),
        userRole: userMember?.role || (isAdmin ? "admin" : null),
      };
    }

    // Add access control metadata to response
    const responseData = transformDossier({
      ...dossier,
      conseil: dossier.conseil
        ? {
            ...dossier.conseil,
            _accessControl: conseilAccessControl,
          }
        : null,
    });

    res.json({ success: true, data: responseData });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/cd/dossiers-disciplinaires
 * POST /api/v1/cd/cases
 * Create a new disciplinary dossier
 */
export const createDossierHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      etudiantId,
      studentId,
      infractionId,
      typeInfraction,
      descriptionSignal,
      description,
      reason,
      dateSignal,
      studentIds,
      titre,
    } = req.body;
    // Note: enseignantSignalant and conseilId are intentionally NOT read from
    // the body. The reporter is always derived from the JWT, and a freshly
    // created dossier is never pre-attached to a conseil.

    if (!req.user?.id) {
      res.status(401).json({ success: false, error: { message: "Authentification requise." } });
      return;
    }

    // Handle multiple ways to pass student ID
    const studentIdToUse = etudiantId || studentId;
    const studentIdsArray = Array.isArray(studentIds)
      ? studentIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
      : Number.isInteger(Number(studentIdToUse)) && Number(studentIdToUse) > 0
      ? [Number(studentIdToUse)]
      : [];

    if (!studentIdsArray.length) {
      res.status(400).json({
        success: false,
        error: { message: "etudiantId ou studentId est obligatoire." },
      });
      return;
    }

    // Reporter id is *always* derived from the authenticated caller. Never
    // accept it from the body — that would let any logged-in user impersonate
    // another teacher as the signalant.
    const enseignant = await prisma.enseignant.findUnique({
      where: { userId: req.user.id },
      select: { id: true },
    });

    // Handle infraction - either use provided ID or create from typeInfraction
    let infractionIdToUse = infractionId;

    if (!infractionIdToUse && typeInfraction) {
      const validLevels = ["faible", "moyenne", "grave", "tres_grave"];
      if (!validLevels.includes(typeInfraction)) {
        res.status(400).json({
          success: false,
          error: { message: "typeInfraction must be one of: faible, moyenne, grave, tres_grave." },
        });
        return;
      }

      // Try to find existing infraction by name
      const existingInfraction = await prisma.infraction.findFirst({
        where: {
          OR: [{ nom_ar: typeInfraction }, { nom_en: typeInfraction }],
        },
      });

      if (existingInfraction) {
        infractionIdToUse = existingInfraction.id;
      } else {
        const newInfraction = await prisma.infraction.create({
          data: {
            nom_ar: typeInfraction,
            nom_en: typeInfraction,
            gravite: typeInfraction as any,
          },
        });
        infractionIdToUse = newInfraction.id;
      }
    }

    if (!infractionIdToUse) {
      res.status(400).json({
        success: false,
        error: { message: "infractionId ou typeInfraction est obligatoire." },
      });
      return;
    }

    const descriptionToUse = descriptionSignal || description || reason || titre || "";
    // Note: Description is now optional. The violation type (infraction) is the main reason.

    // Create dossiers for each student
    const dossiers = await Promise.all(
      studentIdsArray.map((eid) =>
        prisma.dossierDisciplinaire.create({
          data: {
            etudiantId: eid,
            enseignantSignalant: enseignant?.id ?? null,
            infractionId: infractionIdToUse!,
            descriptionSignal_ar: descriptionToUse,
            descriptionSignal_en: descriptionToUse,
            conseilId: null,
            dateSignal: dateSignal ? new Date(dateSignal) : new Date(),
            status: "signale",
          },
          include: dossierInclude,
        })
      )
    );

    // Return first if single, array if multiple
    const result = studentIdsArray.length === 1 ? transformDossier(dossiers[0]) : transformDossiers(dossiers);

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/cd/dossiers-disciplinaires/:id
 * PATCH /api/v1/cd/cases/:id
 * Update a disciplinary dossier
 * Note: Only admin can change status. Teachers cannot change status manually.
 */
export const updateDossierHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, decisionId, remarqueDecision, dateDecision, conseilId, description } = req.body;
    const isAdmin = callerIsAdmin(req);

    // Only admin can change status
    if (status !== undefined && !isAdmin) {
      res.status(403).json({
        success: false,
        error: { message: "Seul un administrateur peut modifier le statut d'un dossier." },
      });
      return;
    }

    const dossier = await prisma.dossierDisciplinaire.update({
      where: { id: Number(req.params.id) },
      data: {
        ...(status !== undefined && { status }),
        ...(decisionId !== undefined && { decisionId: decisionId ? Number(decisionId) : null }),
        ...(remarqueDecision !== undefined && {
          remarqueDecision_ar: remarqueDecision,
          remarqueDecision_en: remarqueDecision,
        }),
        ...(dateDecision !== undefined && {
          dateDecision: dateDecision ? new Date(dateDecision) : null,
        }),
        ...(conseilId !== undefined && {
          conseilId: conseilId ? Number(conseilId) : null,
        }),
        ...(description !== undefined && {
          descriptionSignal_ar: description,
          descriptionSignal_en: description,
        }),
      },
      include: dossierInclude,
    });

    res.json({ success: true, data: transformDossier(dossier) });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/cd/dossiers-disciplinaires/:id
 * DELETE /api/v1/cd/cases/:id
 * Delete a disciplinary dossier
 */
export const deleteDossierHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const dossierId = Number(req.params.id);
    const dossier = await prisma.dossierDisciplinaire.findUnique({
      where: { id: dossierId },
      select: { id: true, enseignantSignalant: true, status: true },
    });

    if (!dossier) {
      res.status(404).json({ success: false, error: { message: "Dossier introuvable." } });
      return;
    }

    const isAdmin = Array.isArray(req.user?.roles) && req.user.roles.includes('admin');
    const callerEnseignant = await prisma.enseignant.findUnique({
      where: { userId: req.user?.id ?? -1 },
      select: { id: true },
    });
    const callerEnseignantId = callerEnseignant?.id ?? null;

    // Allow admin or the reporting teacher to delete, but only if status is 'signale'
    if (!isAdmin && callerEnseignantId !== dossier.enseignantSignalant) {
      res.status(403).json({
        success: false,
        error: { message: "Accès refusé à ce dossier." },
      });
      return;
    }

    if (dossier.status !== 'signale') {
      res.status(409).json({
        success: false,
        error: { message: "Seuls les dossiers en état 'signale' peuvent être supprimés." },
      });
      return;
    }

    await prisma.dossierDisciplinaire.delete({
      where: { id: dossierId },
    });
    res.json({ success: true, message: "Dossier supprimé." });
  } catch (error) {
    next(error);
  }
};

/* ════════════════════════════════════════════════════════════════
   AUTHORIZATION HELPERS
   ════════════════════════════════════════════════════════════════ */

/**
 * Returns the president's enseignant id if the caller is the president of the
 * given conseil; otherwise returns null. Pass `null` to denote no match.
 */
const getCallerPresidentEnseignantId = async (
  userId: number,
  conseilId: number
): Promise<number | null> => {
  const callerEnseignantId = await getCallerEnseignantId(userId);
  if (!callerEnseignantId) return null;

  const president = await prisma.membreConseil.findFirst({
    where: { conseilId, role: "president" },
    select: { enseignantId: true },
  });

  return president?.enseignantId === callerEnseignantId ? callerEnseignantId : null;
};

/* ════════════════════════════════════════════════════════════════
   CONSEIL DISCIPLINAIRE HANDLERS
   ════════════════════════════════════════════════════════════════ */

/**
 * GET /api/v1/cd/conseils
 * List all conseils with optional filters
 */
export const listConseilsHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, error: { message: "Authentification requise." } });
      return;
    }

    const isAdmin = callerIsAdmin(req);
    const callerEnseignantId = isAdmin ? null : await getCallerEnseignantId(req.user.id);

    if (!isAdmin && !callerEnseignantId) {
      res.status(403).json({
        success: false,
        error: { message: "Accès refusé: profil enseignant introuvable." },
      });
      return;
    }

    const { status, annee } = req.query;

    const conseils = await prisma.conseilDisciplinaire.findMany({
      where: {
        ...(!isAdmin && callerEnseignantId ? { membres: { some: { enseignantId: callerEnseignantId } } } : {}),
        ...(status && { status: status as any }),
        ...(annee && { anneeUniversitaire: annee as string }),
      },
      include: conseilInclude,
      orderBy: { dateReunion: "desc" },
    });

    // Transform dossiers in conseils to include formatted decisions
    const transformedConseils = conseils.map((conseil: any) => ({
      ...conseil,
      dossiers: transformDossiers(conseil.dossiers),
    }));

    res.json({ success: true, data: transformedConseils });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/cd/conseils/:id
 * Get a single conseil by ID
 */
export const getConseilHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, error: { message: "Authentification requise." } });
      return;
    }

    const isAdmin = callerIsAdmin(req);
    const callerEnseignantId = isAdmin ? null : await getCallerEnseignantId(req.user.id);

    // Non-admins must be a member of the conseil
    if (!isAdmin && !callerEnseignantId) {
      res.status(403).json({
        success: false,
        error: { message: "Accès refusé: profil enseignant introuvable." },
      });
      return;
    }

    const conseil = await prisma.conseilDisciplinaire.findUnique({
      where: { id: Number(req.params.id) },
      include: conseilInclude,
    });

    if (!conseil) {
      res.status(404).json({ success: false, error: { message: "Conseil introuvable." } });
      return;
    }

    // Check if user is a member or admin
    const isMember = isAdmin || conseil.membres.some((m: any) => m.enseignantId === callerEnseignantId);
    
    if (!isMember) {
      res.status(403).json({
        success: false,
        error: { message: "Accès refusé à ce conseil." },
      });
      return;
    }

    // Determine user's role and permissions
    const userMember = conseil.membres.find((m: any) => m.enseignantId === callerEnseignantId);
    const isPresident = userMember?.role === "president";
    const canMakeDecisions = isAdmin || isPresident;

    // Add access control metadata to dossiers
    const dossiersWithAccess = conseil.dossiers.map((dossier: any) => ({
      ...transformDossier(dossier),
      _accessControl: {
        canMakeDecisions,
        isViewOnly: !canMakeDecisions,
      },
    }));

    // Add access control metadata to response
    const responseData = {
      ...conseil,
      dossiers: dossiersWithAccess,
      _accessControl: {
        isAdmin,
        isPresident,
        canMakeDecisions,
        isViewOnly: !canMakeDecisions && isMember,
        userRole: userMember?.role || (isAdmin ? "admin" : null),
      },
    };

    res.json({ success: true, data: responseData });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/cd/conseils
 * Create a new conseil
 */
export const createConseilHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      dateReunion,
      heure,
      lieu,
      anneeUniversitaire,
      description_ar,
      description_en,
      dossierIds = [],
      membres = [],
      presidentId,
    } = req.body;

    if (!dateReunion || !anneeUniversitaire) {
      res.status(400).json({
        success: false,
        error: { message: "dateReunion et anneeUniversitaire sont obligatoires." },
      });
      return;
    }

    const dossierIdList: number[] = Array.isArray(dossierIds)
      ? dossierIds.map((id: unknown) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
      : [];

    if (dossierIdList.length === 0) {
      res.status(400).json({
        success: false,
        error: { message: "Au moins un dossier (dossierIds) est obligatoire." },
      });
      return;
    }

    const presidentEnseignantId = Number(presidentId);
    if (!Number.isInteger(presidentEnseignantId) || presidentEnseignantId <= 0) {
      res.status(400).json({
        success: false,
        error: { message: "presidentId est obligatoire." },
      });
      return;
    }

    const additionalMemberIds: number[] = Array.isArray(membres)
      ? membres
          .map((m: { enseignantId?: unknown } | number) =>
            Number(typeof m === "object" && m !== null ? m.enseignantId : m)
          )
          .filter((id) => Number.isInteger(id) && id > 0)
      : [];

    if (
      additionalMemberIds.length !== MAX_ADDITIONAL_COUNCIL_MEMBERS
    ) {
      res.status(400).json({
        success: false,
        error: {
          message: `Le conseil doit contenir exactement ${MAX_ADDITIONAL_COUNCIL_MEMBERS} membres supplémentaires.`,
        },
      });
      return;
    }

    // Load dossiers to derive the rapporteur and validate their state
    const dossiers = await prisma.dossierDisciplinaire.findMany({
      where: { id: { in: dossierIdList } },
      select: { id: true, status: true, enseignantSignalant: true, conseilId: true },
    });

    if (dossiers.length !== dossierIdList.length) {
      res.status(404).json({
        success: false,
        error: { message: "Un ou plusieurs dossiers introuvables." },
      });
      return;
    }

    const ineligible = dossiers.find((d: DossierSignalantRow) => d.status !== "signale" || d.conseilId !== null);
    if (ineligible) {
      res.status(409).json({
        success: false,
        error: { message: `Dossier ${ineligible.id} n'est pas dans l'état 'signale' ou est déjà rattaché à un conseil.` },
      });
      return;
    }

    const reporters: number[] = Array.from(
      new Set(dossiers.map((d: DossierSignalantRow) => d.enseignantSignalant).filter((id: unknown): id is number => typeof id === "number" && Number.isInteger(id) && id > 0))
    );

    if (reporters.length !== 1) {
      res.status(409).json({
        success: false,
        error: {
          message:
            reporters.length === 0
              ? "Aucun enseignant signalant trouvé pour les dossiers."
              : "Tous les dossiers d'un même conseil doivent partager le même enseignant signalant.",
        },
      });
      return;
    }

    const rapporteurEnseignantId = reporters[0];

    // Reporter ≠ president (covers admin-as-reporter case too)
    if (rapporteurEnseignantId === presidentEnseignantId) {
      res.status(409).json({
        success: false,
        error: { message: "Le signalant ne peut pas présider le conseil." },
      });
      return;
    }

    // President must not be in additional members; members must be distinct
    const memberSet = new Set(additionalMemberIds);
    if (memberSet.size !== additionalMemberIds.length) {
      res.status(409).json({
        success: false,
        error: { message: "Les membres supplémentaires doivent être distincts." },
      });
      return;
    }
    if (memberSet.has(presidentEnseignantId) || memberSet.has(rapporteurEnseignantId)) {
      res.status(409).json({
        success: false,
        error: { message: "Le président et le rapporteur ne peuvent pas être réutilisés comme membres." },
      });
      return;
    }

    const conseil = await prisma.$transaction(async (tx: any) => {
      const newConseil = await tx.conseilDisciplinaire.create({
        data: {
          dateReunion: new Date(dateReunion),
          heure: heure ? new Date(`1970-01-01T${heure}:00`) : null,
          lieu,
          anneeUniversitaire,
          description_ar: description_ar || description_en,
          description_en: description_en || description_ar,
        },
      });

      await tx.membreConseil.createMany({
        data: [
          { conseilId: newConseil.id, enseignantId: presidentEnseignantId, role: "president" },
          { conseilId: newConseil.id, enseignantId: rapporteurEnseignantId, role: "rapporteur" },
          ...additionalMemberIds.map((enseignantId) => ({
            conseilId: newConseil.id,
            enseignantId,
            role: "membre" as const,
          })),
        ],
      });

      await tx.dossierDisciplinaire.updateMany({
        where: { id: { in: dossierIdList } },
        data: { conseilId: newConseil.id, status: "en_instruction" },
      });

      return tx.conseilDisciplinaire.findUnique({
        where: { id: newConseil.id },
        include: conseilInclude,
      });
    });

    // Transform dossiers to include formatted decisions
    const transformedConseil = {
      ...conseil,
      dossiers: transformDossiers(conseil.dossiers),
    };

    res.status(201).json({ success: true, data: transformedConseil });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/cd/conseils/:id
 * Update a conseil
 */
export const updateConseilHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const conseilId = Number(req.params.id);
    if (!Number.isInteger(conseilId) || conseilId <= 0) {
      res.status(400).json({ success: false, error: { message: "Identifiant du conseil invalide." } });
      return;
    }

    const existing = await prisma.conseilDisciplinaire.findUnique({
      where: { id: conseilId },
      include: {
        membres: {
          select: {
            id: true,
            enseignantId: true,
            role: true,
          },
        },
        dossiers: {
          select: {
            id: true,
            enseignantSignalant: true,
          },
        },
      },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: { message: "Conseil introuvable." } });
      return;
    }

    if (existing.status === "termine") {
      res.status(409).json({
        success: false,
        error: { message: "Un conseil finalisé ne peut pas être modifié." },
      });
      return;
    }

    const { dateReunion, heure, lieu, anneeUniversitaire, description, status, presidentId, membres } = req.body;

    const reporters: number[] = Array.from(
      new Set(
        existing.dossiers
          .map((d: { enseignantSignalant: number | null }) => d.enseignantSignalant)
          .filter((id: unknown): id is number => typeof id === "number" && Number.isInteger(id) && id > 0)
      )
    );

    if (reporters.length !== 1) {
      res.status(409).json({
        success: false,
        error: {
          message:
            reporters.length === 0
              ? "Aucun enseignant signalant trouvé pour ce conseil."
              : "Tous les dossiers d'un même conseil doivent partager le même enseignant signalant.",
        },
      });
      return;
    }

    const rapporteurEnseignantId = reporters[0];
    const currentPresident = existing.membres.find((m: ConseilMemberRow) => m.role === "president");
    const nextPresidentIdCandidate =
      presidentId !== undefined && presidentId !== null
        ? Number(presidentId)
        : currentPresident?.enseignantId;

    if (
      typeof nextPresidentIdCandidate !== "number"
      || !Number.isInteger(nextPresidentIdCandidate)
      || nextPresidentIdCandidate <= 0
    ) {
      res.status(400).json({
        success: false,
        error: { message: "presidentId est obligatoire." },
      });
      return;
    }

    const nextPresidentId: number = nextPresidentIdCandidate;

    if (nextPresidentId === rapporteurEnseignantId) {
      res.status(409).json({
        success: false,
        error: { message: "Le signalant ne peut pas présider le conseil." },
      });
      return;
    }

    const additionalMemberIds: number[] = Array.isArray(membres)
      ? membres
          .map((m: { enseignantId?: unknown } | number) =>
            Number(typeof m === "object" && m !== null ? m.enseignantId : m)
          )
          .filter((id: number) => Number.isInteger(id) && id > 0)
      : existing.membres
          .filter((m: ConseilMemberRow) => m.role === "membre")
          .map((m: ConseilMemberRow) => m.enseignantId)
          .filter((id: number) => Number.isInteger(id) && id > 0);

    if (
      additionalMemberIds.length < MIN_ADDITIONAL_COUNCIL_MEMBERS
      || additionalMemberIds.length > MAX_ADDITIONAL_COUNCIL_MEMBERS
    ) {
      res.status(400).json({
        success: false,
        error: {
          message: `Le conseil doit contenir entre ${MIN_ADDITIONAL_COUNCIL_MEMBERS} et ${MAX_ADDITIONAL_COUNCIL_MEMBERS} membres supplémentaires.`,
        },
      });
      return;
    }

    const memberSet = new Set(additionalMemberIds);
    if (memberSet.size !== additionalMemberIds.length) {
      res.status(409).json({
        success: false,
        error: { message: "Les membres supplémentaires doivent être distincts." },
      });
      return;
    }

    if (memberSet.has(nextPresidentId) || memberSet.has(rapporteurEnseignantId)) {
      res.status(409).json({
        success: false,
        error: { message: "Le président et le rapporteur ne peuvent pas être réutilisés comme membres." },
      });
      return;
    }

    const shouldReplaceMembers = presidentId !== undefined || Array.isArray(membres);

    const conseil = await prisma.$transaction(async (tx: any) => {
      await tx.conseilDisciplinaire.update({
        where: { id: conseilId },
        data: {
          ...(dateReunion && { dateReunion: new Date(dateReunion) }),
          ...(heure && { heure: new Date(`1970-01-01T${heure}:00`) }),
          ...(lieu !== undefined && { lieu }),
          ...(anneeUniversitaire && { anneeUniversitaire }),
          ...(description !== undefined && {
            description_ar: description,
            description_en: description,
          }),
          ...(status && { status }),
        },
      });

      if (shouldReplaceMembers) {
        await tx.membreConseil.deleteMany({ where: { conseilId } });

        await tx.membreConseil.createMany({
          data: [
            { conseilId, enseignantId: nextPresidentId, role: "president" },
            { conseilId, enseignantId: rapporteurEnseignantId, role: "rapporteur" },
            ...additionalMemberIds.map((enseignantId) => ({
              conseilId,
              enseignantId,
              role: "membre" as const,
            })),
          ],
        });
      }

      return tx.conseilDisciplinaire.findUnique({
        where: { id: conseilId },
        include: conseilInclude,
      });
    });

    // Transform dossiers to include formatted decisions
    const transformedConseil = {
      ...conseil,
      dossiers: transformDossiers(conseil.dossiers),
    };

    res.json({ success: true, data: transformedConseil });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/cd/conseils/:id
 * Delete a conseil
 */
export const deleteConseilHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const conseilId = Number(req.params.id);
    if (!Number.isInteger(conseilId) || conseilId <= 0) {
      res.status(400).json({ success: false, error: { message: "Identifiant du conseil invalide." } });
      return;
    }

    const existing = await prisma.conseilDisciplinaire.findUnique({
      where: { id: conseilId },
      select: { id: true, status: true },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: { message: "Conseil introuvable." } });
      return;
    }

    if (existing.status === "termine") {
      res.status(409).json({
        success: false,
        error: { message: "Un conseil finalisé ne peut pas être supprimé." },
      });
      return;
    }

    await prisma.$transaction(async (tx: any) => {
      // Defensive cleanup at SQL level to avoid FK RESTRICT races on legacy data.
      await tx.$executeRaw`
        DELETE FROM "membres_conseil"
        WHERE "conseil_id" = ${conseilId}
      `;

      await tx.dossierDisciplinaire.updateMany({
        where: {
          conseilId,
          status: { in: ["en_instruction", "jugement"] },
        },
        data: {
          conseilId: null,
          status: "signale",
        },
      });

      await tx.dossierDisciplinaire.updateMany({
        where: {
          conseilId,
          status: { notIn: ["en_instruction", "jugement"] },
        },
        data: { conseilId: null },
      });

      await tx.conseilDisciplinaire.delete({
        where: { id: conseilId },
      });
    });

    res.json({ success: true, message: "Conseil supprimé." });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/cd/conseils/:id/finaliser
 * Finalize a conseil and record decisions
 */
export const finaliserConseilHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const conseilId = Number(id);
    const { drafts } = req.body as {
      drafts?: Array<{
        caseId: number;
        decision?: string;
        decisionId?: number | string;
        sanctions?: string;
        dateDecision?: string;
      }>;
    };

    if (!req.user?.id) {
      res.status(401).json({ success: false, error: { message: "Authentification requise." } });
      return;
    }

    const callerPresidentId = await getCallerPresidentEnseignantId(req.user.id, conseilId);
    if (!callerPresidentId) {
      res.status(403).json({
        success: false,
        error: { message: "Seul le président du conseil peut finaliser la décision." },
      });
      return;
    }

    await prisma.$transaction(async (tx: any) => {
      // Transition conseil to "jugement" first if still planned, then to "termine" when finalizing
      await tx.conseilDisciplinaire.update({
        where: { id: conseilId },
        data: { status: "termine" },
      });

      // Process each decision
      if (Array.isArray(drafts) && drafts.length > 0) {
        for (const d of drafts) {
          let decisionRecord = null as any;

          if (d.decisionId) {
            decisionRecord = await tx.decision.findUnique({
              where: { id: Number(d.decisionId) },
            });
          }

          if (!decisionRecord && d.decision) {
            decisionRecord = await tx.decision.findFirst({
              where: {
                OR: [
                  { nom_ar: d.decision },
                  { nom_en: d.decision },
                ],
              },
            });
          }

          if (!decisionRecord && d.decision) {
            decisionRecord = await tx.decision.create({
              data: {
                nom_ar: d.decision,
                nom_en: d.decision,
                description_ar: d.sanctions,
                description_en: d.sanctions,
              },
            });
          }

          if (!decisionRecord) {
            continue;
          }

          // Update dossier with decision - always set status to "traite" (treated/closed) when finalizing
          await tx.dossierDisciplinaire.update({
            where: { id: d.caseId },
            data: {
              decisionId: decisionRecord.id,
              remarqueDecision_ar: d.sanctions || "",
              remarqueDecision_en: d.sanctions || "",
              dateDecision: d.dateDecision ? new Date(d.dateDecision) : new Date(),
              status: "traite",
            },
          });
        }
      }
    });

    res.json({ success: true, message: "Conseil finalisé et décisions enregistrées." });
  } catch (error) {
    next(error);
  }
};

/* ════════════════════════════════════════════════════════════════
   MEMBRE CONSEIL HANDLERS
   ════════════════════════════════════════════════════════════════ */

/**
 * POST /api/v1/cd/conseils/:cid/membres
 * POST /api/v1/cd/membres-conseil
 * Add a member row into membres_conseil
 */
export const addMembreHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const conseilIdFromPath = Number(req.params.cid);
    const { conseilId: conseilIdFromBody, enseignantId, role } = req.body as {
      conseilId?: number;
      enseignantId: number;
      role?: string;
    };
    const conseilId = Number.isInteger(conseilIdFromPath) && conseilIdFromPath > 0
      ? conseilIdFromPath
      : Number(conseilIdFromBody);
    const normalizedRole = String(role || "membre").toLowerCase() as "president" | "rapporteur" | "membre";

    if (!conseilId || !enseignantId) {
      res.status(400).json({
        success: false,
        error: { message: "conseilId et enseignantId sont obligatoires pour membres_conseil." },
      });
      return;
    }

    if (!["president", "rapporteur", "membre"].includes(normalizedRole)) {
      res.status(400).json({
        success: false,
        error: { message: "role invalide (president, rapporteur ou membre)." },
      });
      return;
    }

    const existingConseil = await prisma.conseilDisciplinaire.findUnique({
      where: { id: conseilId },
      include: {
        membres: {
          select: {
            id: true,
            enseignantId: true,
            role: true,
          },
        },
        dossiers: {
          select: {
            enseignantSignalant: true,
          },
        },
      },
    });

    if (!existingConseil) {
      res.status(404).json({ success: false, error: { message: "Conseil introuvable." } });
      return;
    }

    if (existingConseil.status === "termine") {
      res.status(409).json({
        success: false,
        error: { message: "Un conseil finalisé ne peut pas être modifié." },
      });
      return;
    }

    const reporters: number[] = Array.from(
      new Set(
        existingConseil.dossiers
          .map((d: { enseignantSignalant: number | null }) => d.enseignantSignalant)
          .filter((id: unknown): id is number => typeof id === "number" && Number.isInteger(id) && id > 0)
      )
    );

    if (reporters.length !== 1) {
      res.status(409).json({
        success: false,
        error: {
          message:
            reporters.length === 0
              ? "Aucun enseignant signalant trouvé pour ce conseil."
              : "Tous les dossiers d'un même conseil doivent partager le même enseignant signalant.",
        },
      });
      return;
    }

    const rapporteurEnseignantId = reporters[0];

    if (normalizedRole === "rapporteur") {
      res.status(409).json({
        success: false,
        error: { message: "Le rapporteur est ajouté automatiquement depuis l'enseignant signalant." },
      });
      return;
    }

    if (enseignantId === rapporteurEnseignantId) {
      res.status(409).json({
        success: false,
        error: { message: "Cet enseignant est le signalant et est ajouté automatiquement comme rapporteur." },
      });
      return;
    }

    const hasRapporteur = existingConseil.membres.some(
      (m: ConseilMemberRow) => m.role === "rapporteur" && m.enseignantId === rapporteurEnseignantId
    );

    const currentMembers = hasRapporteur
      ? existingConseil.membres
      : [
          ...existingConseil.membres,
          { id: -1, enseignantId: rapporteurEnseignantId, role: "rapporteur" as const },
        ];

    if (currentMembers.some((m: ConseilMemberRow) => m.enseignantId === enseignantId)) {
      res.status(409).json({
        success: false,
        error: { message: "Cet enseignant est déjà membre du conseil." },
      });
      return;
    }

    if (normalizedRole === "president" && currentMembers.some((m: ConseilMemberRow) => m.role === "president")) {
      res.status(409).json({
        success: false,
        error: { message: "Ce conseil a déjà un président." },
      });
      return;
    }

    if (
      normalizedRole === "membre"
      && currentMembers.filter((m: ConseilMemberRow) => m.role === "membre").length >= MAX_ADDITIONAL_COUNCIL_MEMBERS
    ) {
      res.status(409).json({
        success: false,
        error: {
          message: `Nombre maximum de membres supplémentaires atteint (${MAX_ADDITIONAL_COUNCIL_MEMBERS}).`,
        },
      });
      return;
    }

    const membre = await prisma.$transaction(async (tx: any) => {
      if (!hasRapporteur) {
        await tx.membreConseil.create({
          data: {
            conseilId,
            enseignantId: rapporteurEnseignantId,
            role: "rapporteur",
          },
        });
      }

      return tx.membreConseil.create({
        data: {
          conseilId,
          enseignantId,
          role: normalizedRole,
        },
        include: {
          enseignant: {
            include: {
              user: { select: { nom: true, prenom: true } },
            },
          },
        },
      });
    });

    res.status(201).json({ success: true, data: membre });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/cd/conseils/:cid/membres/:mid
 * Remove a member from a conseil
 */
export const removeMembreHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.mid);
    if (!id) {
      res.status(400).json({
        success: false,
        error: { message: "Membre ID est obligatoire." },
      });
      return;
    }

    await prisma.membreConseil.delete({
      where: { id },
    });
    res.json({ success: true, message: "Membre supprimé du conseil." });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/cd/conseils/:cid/available-members?q=search_query
 * Get available teachers for a conseil (not already members)
 * Search by name or grade
 */
export const getAvailableMembersHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const conseilId = Number(req.params.cid);
    const { q } = req.query;
    const searchQuery = String(q || "").trim().toLowerCase();

    if (!conseilId) {
      res.status(400).json({
        success: false,
        error: { message: "Conseil ID est obligatoire." },
      });
      return;
    }

    // Get existing members of the conseil
    const existingMembers = await prisma.membreConseil.findMany({
      where: { conseilId },
      select: { enseignantId: true },
    });

    const existingMemberIds = existingMembers.map((m) => m.enseignantId);

    // Build search filter
    const whereCondition = {
      id: { notIn: existingMemberIds },
      ...(searchQuery && searchQuery.length >= 2
        ? {
            OR: [
              { user: { nom: { contains: searchQuery, mode: "insensitive" as const } } },
              { user: { prenom: { contains: searchQuery, mode: "insensitive" as const } } },
              { grade: { nom_ar: { contains: searchQuery, mode: "insensitive" as const } } },
              { grade: { nom_en: { contains: searchQuery, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const availableTeachers = await prisma.enseignant.findMany({
      where: whereCondition,
      select: {
        id: true,
        user: {
          select: {
            nom: true,
            prenom: true,
            email: true,
          },
        },
        grade: {
          select: {
            id: true,
            nom_ar: true,
            nom_en: true,
          },
        },
      },
      orderBy: [{ user: { nom: "asc" } }, { user: { prenom: "asc" } }],
      take: 20,
    });

    const formatted = availableTeachers.map((t: any) => ({
      id: t.id,
      name: [t.user.prenom, t.user.nom].filter(Boolean).join(" ").trim(),
      email: t.user.email,
      grade: t.grade?.nom_en || t.grade?.nom_ar || "Staff",
    }));

    res.json({ success: true, data: formatted });
  } catch (error: any) {
    next(error);
  }
};

/* ════════════════════════════════════════════════════════════════
   INFRACTION HANDLERS
   ════════════════════════════════════════════════════════════════ */

/**
 * GET /api/v1/cd/infractions
 * List all infractions
 */
export const listInfractionsHandler = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const infractions = await prisma.infraction.findMany({
      orderBy: { nom_ar: "asc" },
    });
    res.json({ success: true, data: infractions });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/cd/infractions/:id
 * Get a single infraction
 */
export const getInfractionHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const infraction = await prisma.infraction.findUnique({
      where: { id: Number(req.params.id) },
    });

    if (!infraction) {
      res.status(404).json({ success: false, error: { message: "Infraction introuvable." } });
      return;
    }

    res.json({ success: true, data: infraction });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/cd/infractions
 * Create a new infraction
 */
export const createInfractionHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nom, nom_ar, nom_en, description, description_ar, description_en, gravite } = req.body;

    if (!nom && !nom_ar && !nom_en) {
      res.status(400).json({
        success: false,
        error: { message: "nom ou nom_ar/nom_en est obligatoire." },
      });
      return;
    }

    if (!gravite) {
      res.status(400).json({
        success: false,
        error: { message: "gravite est obligatoire (faible, moyenne, grave, très_grave)." },
      });
      return;
    }

    const infraction = await prisma.infraction.create({
      data: {
        nom_ar: nom_ar || nom,
        nom_en: nom_en || nom,
        description_ar: description_ar || description,
        description_en: description_en || description,
        gravite,
      },
    });

    res.status(201).json({ success: true, data: infraction });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH|PUT /api/v1/cd/infractions/:id
 * Update an infraction
 */
export const updateInfractionHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const infractionId = Number(req.params.id);
    if (!Number.isInteger(infractionId) || infractionId <= 0) {
      res.status(400).json({ success: false, error: { message: "Identifiant de l'infraction invalide." } });
      return;
    }

    const { nom, nom_ar, nom_en, description, description_ar, description_en, gravite } = req.body;

    const payload: {
      nom_ar?: string;
      nom_en?: string;
      description_ar?: string | null;
      description_en?: string | null;
      gravite?: "faible" | "moyenne" | "grave" | "tres_grave";
    } = {};

    if (nom !== undefined || nom_ar !== undefined) {
      payload.nom_ar = String((nom_ar ?? nom) || "").trim();
    }
    if (nom !== undefined || nom_en !== undefined) {
      payload.nom_en = String((nom_en ?? nom) || "").trim();
    }
    if (description !== undefined || description_ar !== undefined) {
      const value = String((description_ar ?? description) || "").trim();
      payload.description_ar = value || null;
    }
    if (description !== undefined || description_en !== undefined) {
      const value = String((description_en ?? description) || "").trim();
      payload.description_en = value || null;
    }
    if (gravite !== undefined) {
      payload.gravite = gravite;
    }

    if (payload.nom_ar !== undefined && !payload.nom_ar) {
      res.status(400).json({ success: false, error: { message: "nom_ar ne peut pas être vide." } });
      return;
    }
    if (payload.nom_en !== undefined && !payload.nom_en) {
      res.status(400).json({ success: false, error: { message: "nom_en ne peut pas être vide." } });
      return;
    }

    const infraction = await prisma.infraction.update({
      where: { id: infractionId },
      data: payload,
    });

    res.json({ success: true, data: infraction });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/cd/infractions/:id
 * Delete an infraction
 */
export const deleteInfractionHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const infractionId = Number(req.params.id);
    if (!Number.isInteger(infractionId) || infractionId <= 0) {
      res.status(400).json({ success: false, error: { message: "Identifiant de l'infraction invalide." } });
      return;
    }

    await prisma.infraction.delete({ where: { id: infractionId } });
    res.json({ success: true, message: "Infraction supprimée." });
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code === "P2003") {
      res.status(409).json({
        success: false,
        error: { message: "Impossible de supprimer cette infraction car elle est utilisée dans des dossiers disciplinaires." },
      });
      return;
    }
    next(error);
  }
};

/* ════════════════════════════════════════════════════════════════
   DECISION HANDLERS
   ════════════════════════════════════════════════════════════════ */

/**
 * GET /api/v1/cd/decisions
 * List all decisions
 */
export const listDecisionsHandler = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const decisions = await prisma.decision.findMany({
      orderBy: { nom_ar: "asc" },
    });
    res.json({ success: true, data: decisions });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/cd/decisions/:id
 * Get a single decision
 */
export const getDecisionHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const decision = await prisma.decision.findUnique({
      where: { id: Number(req.params.id) },
    });

    if (!decision) {
      res.status(404).json({ success: false, error: { message: "Décision introuvable." } });
      return;
    }

    res.json({ success: true, data: decision });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/cd/decisions
 * Create a new decision
 */
export const createDecisionHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nom, nom_ar, nom_en, description, description_ar, description_en, niveauSanction } = req.body;

    if (!nom && !nom_ar && !nom_en) {
      res.status(400).json({
        success: false,
        error: { message: "nom ou nom_ar/nom_en est obligatoire." },
      });
      return;
    }

    const decision = await prisma.decision.create({
      data: {
        nom_ar: nom_ar || nom,
        nom_en: nom_en || nom,
        description_ar: description_ar || description,
        description_en: description_en || description,
        niveauSanction,
      },
    });

    res.status(201).json({ success: true, data: decision });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH|PUT /api/v1/cd/decisions/:id
 * Update a decision catalog entry
 */
export const updateDecisionHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const decisionId = Number(req.params.id);
    if (!Number.isInteger(decisionId) || decisionId <= 0) {
      res.status(400).json({ success: false, error: { message: "Identifiant de la décision invalide." } });
      return;
    }

    const { nom, nom_ar, nom_en, description, description_ar, description_en, niveauSanction } = req.body;

    const payload: {
      nom_ar?: string;
      nom_en?: string;
      description_ar?: string | null;
      description_en?: string | null;
      niveauSanction?: "avertissement" | "blame" | "suspension" | "exclusion" | null;
    } = {};

    if (nom !== undefined || nom_ar !== undefined) {
      payload.nom_ar = String((nom_ar ?? nom) || "").trim();
    }
    if (nom !== undefined || nom_en !== undefined) {
      payload.nom_en = String((nom_en ?? nom) || "").trim();
    }
    if (description !== undefined || description_ar !== undefined) {
      const value = String((description_ar ?? description) || "").trim();
      payload.description_ar = value || null;
    }
    if (description !== undefined || description_en !== undefined) {
      const value = String((description_en ?? description) || "").trim();
      payload.description_en = value || null;
    }
    if (niveauSanction !== undefined) {
      const value = String(niveauSanction || "").trim().toLowerCase();
      if (!value) {
        payload.niveauSanction = null;
      } else if (!["avertissement", "blame", "suspension", "exclusion"].includes(value)) {
        res.status(400).json({
          success: false,
          error: { message: "niveauSanction invalide. Valeurs permises: avertissement, blame, suspension, exclusion." },
        });
        return;
      } else {
        payload.niveauSanction = value as "avertissement" | "blame" | "suspension" | "exclusion";
      }
    }

    if (payload.nom_ar !== undefined && !payload.nom_ar) {
      res.status(400).json({ success: false, error: { message: "nom_ar ne peut pas être vide." } });
      return;
    }
    if (payload.nom_en !== undefined && !payload.nom_en) {
      res.status(400).json({ success: false, error: { message: "nom_en ne peut pas être vide." } });
      return;
    }

    const decision = await prisma.decision.update({
      where: { id: decisionId },
      data: payload,
    });

    res.json({ success: true, data: decision });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/cd/decisions/:id
 * Delete a decision catalog entry
 */
export const deleteDecisionHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const decisionId = Number(req.params.id);
    if (!Number.isInteger(decisionId) || decisionId <= 0) {
      res.status(400).json({ success: false, error: { message: "Identifiant de la décision invalide." } });
      return;
    }

    await prisma.decision.delete({ where: { id: decisionId } });
    res.json({ success: true, message: "Décision supprimée." });
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code === "P2003") {
      res.status(409).json({
        success: false,
        error: { message: "Impossible de supprimer cette décision car elle est utilisée dans des dossiers disciplinaires." },
      });
      return;
    }
    next(error);
  }
};

/* ════════════════════════════════════════════════════════════════
   STUDENT & STATISTICS HANDLERS
   ════════════════════════════════════════════════════════════════ */

/**
 * GET /api/v1/cd/students
 * List all students (for discipline module dropdown)
 */
export const listDisciplineStudentsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = String(req.query.q || "").trim();

    const students = await prisma.etudiant.findMany({
      where: q
        ? {
            OR: [
              { user: { nom: { contains: q, mode: "insensitive" } } },
              { user: { prenom: { contains: q, mode: "insensitive" } } },
              { matricule: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
      select: {
        id: true,
        matricule: true,
        user: { select: { nom: true, prenom: true } },
      },
      take: 50,
    });

    const formatted = students.map((s: { id: number; matricule: string | null; user: { prenom: string; nom: string } }) => ({
      id: s.id,
      matricule: s.matricule,
      fullName: `${s.user.prenom} ${s.user.nom}`,
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/cd/students/:id/profile
 * Get student's disciplinary profile
 */
export const getDisciplineStudentProfileHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = Number(req.params.id);

    const profile = await prisma.etudiant.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { nom: true, prenom: true, email: true } },
        promo: {
          include: {
            specialite: { select: { id: true, nom_ar: true, nom_en: true } },
          },
        },
      },
    });

    if (!profile) {
      res.status(404).json({ success: false, error: { message: "Étudiant introuvable." } });
      return;
    }

    // Get student's dossiers
    const dossiers = await prisma.dossierDisciplinaire.findMany({
      where: { etudiantId: studentId },
      include: {
        infraction: true,
        decision: true,
        conseil: { select: { dateReunion: true } },
      },
      orderBy: { dateSignal: "desc" },
    });

    res.json({
      success: true,
      data: {
        student: profile,
        dossiers,
        stats: {
          totalCases: dossiers.length,
          pendingCases: dossiers.filter((d: { status: string }) => d.status === "signale").length,
          completedCases: dossiers.filter((d: { status: string }) => d.status === "traite").length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/cd/stats
 * Get disciplinary statistics
 */
export const statsHandler = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [totalDossiers, pendingDossiers, completedDossiers, totalConseils, totalInfractions, totalDecisions] =
      await Promise.all([
        prisma.dossierDisciplinaire.count(),
        prisma.dossierDisciplinaire.count({ where: { status: "signale" } }),
        prisma.dossierDisciplinaire.count({ where: { status: "traite" } }),
        prisma.conseilDisciplinaire.count(),
        prisma.infraction.count(),
        prisma.decision.count(),
      ]);

    res.json({
      success: true,
      data: {
        dossiers: {
          total: totalDossiers,
          pending: pendingDossiers,
          completed: completedDossiers,
        },
        conseils: totalConseils,
        infractions: totalInfractions,
        decisions: totalDecisions,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/cd/record-decision
 * Record a decision for a dossier
 */
export const recordDecisionHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { dossierId, decisionId, remarque, dateDecision } = req.body;

    if (!dossierId || !decisionId) {
      res.status(400).json({
        success: false,
        error: { message: "dossierId et decisionId sont obligatoires." },
      });
      return;
    }

    if (!req.user?.id) {
      res.status(401).json({ success: false, error: { message: "Authentification requise." } });
      return;
    }

    const target = await prisma.dossierDisciplinaire.findUnique({
      where: { id: Number(dossierId) },
      select: { conseilId: true },
    });

    if (!target?.conseilId) {
      res.status(409).json({
        success: false,
        error: { message: "Le dossier n'est rattaché à aucun conseil." },
      });
      return;
    }

    const callerPresidentId = await getCallerPresidentEnseignantId(req.user.id, target.conseilId);
    if (!callerPresidentId) {
      res.status(403).json({
        success: false,
        error: { message: "Seul le président du conseil peut enregistrer la décision." },
      });
      return;
    }

    const dossier = await prisma.dossierDisciplinaire.update({
      where: { id: Number(dossierId) },
      data: {
        decisionId: Number(decisionId),
        remarqueDecision_ar: remarque,
        remarqueDecision_en: remarque,
        dateDecision: dateDecision ? new Date(dateDecision) : new Date(),
        status: "traite",
      },
      include: dossierInclude,
    });

    res.json({ success: true, data: dossier });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/cd/staff
 * Get available staff members for discipline council
 */
export const listStaffHandler = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const staff = await prisma.enseignant.findMany({
      select: {
        id: true,
        user: {
          select: {
            nom: true,
            prenom: true,
            email: true,
          },
        },
        grade: {
          select: {
            id: true,
            nom_ar: true,
            nom_en: true,
          },
        },
      },
      orderBy: { user: { nom: 'asc' } },
    });

    const formatted = staff.map((s: { id: number; user: { nom: string; prenom: string; email: string }; grade: { id: number; nom_ar: string | null; nom_en: string | null } | null }) => ({
      id: s.id,
      name: [s.user.prenom, s.user.nom].filter(Boolean).join(' ').trim(),
      email: s.user.email,
      grade: s.grade?.nom_en || s.grade?.nom_ar || 'Staff',
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/cd/staff/search?q=name_or_grade
 * Search staff by name or grade
 */
export const searchStaffHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query;
    const searchQuery = String(q || "").trim().toLowerCase();

    if (!searchQuery || searchQuery.length < 2) {
      res.json({ success: true, data: [] });
      return;
    }

    const staff = await prisma.enseignant.findMany({
      where: {
        OR: [
          { user: { nom: { contains: searchQuery, mode: "insensitive" } } },
          { user: { prenom: { contains: searchQuery, mode: "insensitive" } } },
          { grade: { nom_ar: { contains: searchQuery, mode: "insensitive" } } },
          { grade: { nom_en: { contains: searchQuery, mode: "insensitive" } } },
        ],
      },
      select: {
        id: true,
        user: {
          select: {
            nom: true,
            prenom: true,
            email: true,
          },
        },
        grade: {
          select: {
            id: true,
            nom_ar: true,
            nom_en: true,
          },
        },
      },
      orderBy: [{ user: { nom: "asc" } }, { user: { prenom: "asc" } }],
      take: 20,
    });

    const formatted = staff.map((s: any) => ({
      id: s.id,
      name: [s.user.prenom, s.user.nom].filter(Boolean).join(" ").trim(),
      email: s.user.email,
      grade: s.grade?.nom_en || s.grade?.nom_ar || "Staff",
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/cd/meetings
 * Alias for scheduling meetings (create conseil)
 */
export const scheduleMeetingHandler = createConseilHandler;
