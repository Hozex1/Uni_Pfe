import {
  Prisma,
  RoleJury,
  RoleMembre,
  StatusGroupSujet,
  StatusSujet,
  TypeProjet,
} from "@prisma/client";
import prisma from "../../config/database";
import logger from "../../utils/logger";

const toNumber = (value: Prisma.Decimal | null | undefined): number | null => {
  if (value == null) {
    return null;
  }
  return Number(value);
};

const getAcademicYear = () => {
  const year = new Date().getFullYear();
  return `${year}/${year + 1}`;
};

const parseTypeProjet = (value?: string): TypeProjet | undefined => {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  const candidates = Object.values(TypeProjet);
  return candidates.includes(normalized as TypeProjet)
    ? (normalized as TypeProjet)
    : undefined;
};

const parseSujetStatus = (value?: string): StatusSujet | undefined => {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  const candidates = Object.values(StatusSujet);
  return candidates.includes(normalized as StatusSujet)
    ? (normalized as StatusSujet)
    : undefined;
};

const parseChoiceStatus = (value?: string): StatusGroupSujet | undefined => {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  const candidates = Object.values(StatusGroupSujet);
  return candidates.includes(normalized as StatusGroupSujet)
    ? (normalized as StatusGroupSujet)
    : undefined;
};

const parseRoleMembre = (value?: string): RoleMembre => {
  if (!value) {
    return RoleMembre.membre;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === RoleMembre.chef_groupe ? RoleMembre.chef_groupe : RoleMembre.membre;
};

const parseRoleJury = (value?: string): RoleJury => {
  if (!value) {
    return RoleJury.examinateur;
  }

  const normalized = value.trim().toLowerCase();
  const candidates = Object.values(RoleJury);
  return candidates.includes(normalized as RoleJury)
    ? (normalized as RoleJury)
    : RoleJury.examinateur;
};

const resolveEnseignantId = async (idOrUserId: number): Promise<number> => {
  const direct = await prisma.enseignant.findUnique({
    where: { id: idOrUserId },
    select: { id: true },
  });

  if (direct) {
    return direct.id;
  }

  const byUser = await prisma.enseignant.findUnique({
    where: { userId: idOrUserId },
    select: { id: true },
  });

  if (!byUser) {
    throw new Error("Enseignant introuvable");
  }

  return byUser.id;
};

const resolveEtudiantId = async (idOrUserId: number): Promise<number> => {
  const direct = await prisma.etudiant.findUnique({
    where: { id: idOrUserId },
    select: { id: true },
  });

  if (direct) {
    return direct.id;
  }

  const byUser = await prisma.etudiant.findUnique({
    where: { userId: idOrUserId },
    select: { id: true },
  });

  if (!byUser) {
    throw new Error("Etudiant introuvable");
  }

  return byUser.id;
};

type SubjectWithRelations = Prisma.PfeSujetGetPayload<{
  include: {
    enseignant: {
      include: {
        user: true;
      };
    };
    promo: true;
    groupsPfe: {
      select: {
        id: true;
      };
    };
  };
}>;

const mapSubject = (subject: SubjectWithRelations) => ({
  id: subject.id,
  titre: subject.titre_ar || subject.titre_en || `Sujet ${subject.id}`,
  titre_ar: subject.titre_ar,
  titre_en: subject.titre_en,
  description: subject.description_ar || subject.description_en || "",
  description_ar: subject.description_ar,
  description_en: subject.description_en,
  keywords: subject.keywords_ar || subject.keywords_en || "",
  keywords_ar: subject.keywords_ar,
  keywords_en: subject.keywords_en,
  enseignantId: subject.enseignantId,
  enseignantUserId: subject.enseignant.userId,
  enseignant: `${subject.enseignant.user.prenom} ${subject.enseignant.user.nom}`,
  promoId: subject.promoId,
  promo: subject.promo.nom_ar || subject.promo.nom_en || `Promo ${subject.promo.id}`,
  type_projet: subject.typeProjet,
  status: subject.status,
  annee_universitaire: subject.anneeUniversitaire,
  max_grps: subject.maxGrps,
  created_at: subject.createdAt,
  groups_count: subject.groupsPfe.length,
});

type GroupWithRelations = Prisma.GroupPfeGetPayload<{
  include: {
    sujetFinal: {
      include: {
        enseignant: {
          include: {
            user: true;
          };
        };
      };
    };
    coEncadrant: {
      include: {
        user: true;
      };
    };
    groupMembers: {
      include: {
        etudiant: {
          include: {
            user: true;
          };
        };
      };
    };
    pfeJury: {
      include: {
        enseignant: {
          include: {
            user: true;
          };
        };
      };
    };
    groupSujets: {
      include: {
        sujet: true;
      };
      orderBy: {
        ordre: "asc";
      };
    };
  };
}>;

const mapGroup = (group: GroupWithRelations) => ({
  id: group.id,
  nom: group.nom_ar || group.nom_en || `Groupe ${group.id}`,
  nom_ar: group.nom_ar,
  nom_en: group.nom_en,
  sujetFinalId: group.sujetFinalId,
  sujet: group.sujetFinal?.titre_ar || group.sujetFinal?.titre_en || null,
  encadrant:
    group.sujetFinal?.enseignant?.user
      ? `${group.sujetFinal.enseignant.user.prenom} ${group.sujetFinal.enseignant.user.nom}`
      : null,
  coEncadrantId: group.coEncadrantId,
  co_encadrant:
    group.coEncadrant?.user
      ? `${group.coEncadrant.user.prenom} ${group.coEncadrant.user.nom}`
      : null,
  date_creation: group.dateCreation,
  date_affectation: group.dateAffectation,
  date_soutenance: group.dateSoutenance,
  salle: group.salleSoutenance,
  note: toNumber(group.note),
  mention: group.mention,
  members: group.groupMembers.map((member) => ({
    id: member.etudiant.id,
    etudiantId: member.etudiant.id,
    etudiantUserId: member.etudiant.userId,
    name: `${member.etudiant.user.prenom} ${member.etudiant.user.nom}`,
    role: member.role,
  })),
  choix: group.groupSujets.map((choice) => ({
    id: choice.id,
    sujetId: choice.sujetId,
    sujet: choice.sujet.titre_ar || choice.sujet.titre_en || `Sujet ${choice.sujetId}`,
    ordre: choice.ordre,
    status: choice.status,
  })),
  jury: group.pfeJury
    .filter((jury) => Boolean(jury.enseignant?.user))
    .map((jury) => ({
      id: jury.id,
      enseignantId: jury.enseignantId,
      name: `${jury.enseignant?.user?.prenom || ""} ${jury.enseignant?.user?.nom || ""}`.trim(),
      role: jury.role,
    })),
});

type ChoiceWithRelations = Prisma.GroupSujetGetPayload<{
  include: {
    group: true;
    sujet: true;
  };
}>;

const mapChoice = (choice: ChoiceWithRelations) => ({
  id: choice.id,
  groupId: choice.groupId,
  sujetId: choice.sujetId,
  group: choice.group.nom_ar || choice.group.nom_en || `Groupe ${choice.group.id}`,
  sujet: choice.sujet.titre_ar || choice.sujet.titre_en || `Sujet ${choice.sujet.id}`,
  ordre: choice.ordre,
  status: choice.status,
});

type JuryWithRelations = Prisma.PfeJuryGetPayload<{
  include: {
    group: true;
    enseignant: {
      include: {
        user: true;
      };
    };
  };
}>;

const mapJury = (jury: JuryWithRelations) => ({
  id: jury.id,
  groupId: jury.groupId,
  group: jury.group?.nom_ar || jury.group?.nom_en || (jury.groupId ? `Groupe ${jury.groupId}` : "—"),
  enseignantId: jury.enseignantId,
  enseignant:
    jury.enseignant?.user
      ? `${jury.enseignant.user.prenom} ${jury.enseignant.user.nom}`
      : "—",
  role: jury.role,
});

export interface AdminSujetFilters {
  promoId?: number;
  enseignantId?: number;
  status?: string;
}

export interface AdminCreateSujetInput {
  titre: string;
  description: string;
  keywords?: string;
  workplan?: string;
  bibliographie?: string;
  typeProjet?: string;
  enseignantId: number;
  promoId: number;
  anneeUniversitaire?: string;
  maxGrps?: number;
}

export interface AdminUpdateSujetInput {
  titre?: string;
  description?: string;
  keywords?: string;
  workplan?: string;
  bibliographie?: string;
  typeProjet?: string;
  status?: string;
  enseignantId?: number;
  promoId?: number;
  anneeUniversitaire?: string;
  maxGrps?: number;
}

export const listSujetsForAdmin = async (filters: AdminSujetFilters = {}) => {
  const where: Prisma.PfeSujetWhereInput = {};

  if (filters.promoId) {
    where.promoId = filters.promoId;
  }

  if (filters.enseignantId) {
    where.enseignantId = filters.enseignantId;
  }

  const status = parseSujetStatus(filters.status);
  if (status) {
    where.status = status;
  }

  const subjects = await prisma.pfeSujet.findMany({
    where,
    include: {
      enseignant: {
        include: { user: true },
      },
      promo: true,
      groupsPfe: {
        select: { id: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return subjects.map(mapSubject);
};

export const createSujetForAdmin = async (input: AdminCreateSujetInput) => {
  const titre = input.titre?.trim();
  const description = input.description?.trim();

  if (!titre) {
    throw new Error("Le titre du sujet est requis");
  }

  if (!description) {
    throw new Error("La description du sujet est requise");
  }

  if (!Number.isInteger(input.promoId) || input.promoId <= 0) {
    throw new Error("promoId invalide");
  }

  const promo = await prisma.promo.findUnique({
    where: { id: input.promoId },
    select: { id: true },
  });

  if (!promo) {
    throw new Error("Promo introuvable");
  }

  const enseignantId = await resolveEnseignantId(input.enseignantId);

  const anneeUniversitaire = input.anneeUniversitaire?.trim() || getAcademicYear();

  const subjectsCount = await prisma.pfeSujet.count({
    where: {
      enseignantId,
      anneeUniversitaire,
    },
  });

  if (subjectsCount >= 3) {
    throw new Error("Un enseignant ne peut pas proposer plus de 3 sujets par annee universitaire");
  }

  const typeProjet = parseTypeProjet(input.typeProjet) || TypeProjet.application;

  const created = await prisma.pfeSujet.create({
    data: {
      titre_ar: titre,
      titre_en: titre,
      description_ar: description,
      description_en: description,
      keywords_ar: input.keywords?.trim() || null,
      keywords_en: input.keywords?.trim() || null,
      workplan_ar: input.workplan?.trim() || null,
      workplan_en: input.workplan?.trim() || null,
      bibliographie_ar: input.bibliographie?.trim() || null,
      bibliographie_en: input.bibliographie?.trim() || null,
      typeProjet,
      status: StatusSujet.propose,
      enseignantId,
      promoId: input.promoId,
      anneeUniversitaire,
      maxGrps: Number.isInteger(input.maxGrps) && (input.maxGrps || 0) > 0 ? Number(input.maxGrps) : 1,
    },
    include: {
      enseignant: {
        include: { user: true },
      },
      promo: true,
      groupsPfe: {
        select: { id: true },
      },
    },
  });

  logger.info(`PFE admin created subject ${created.id}`);
  return mapSubject(created);
};

export const updateSujetForAdmin = async (id: number, input: AdminUpdateSujetInput) => {
  const existing = await prisma.pfeSujet.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Sujet PFE introuvable");
  }

  const data: Prisma.PfeSujetUpdateInput = {};

  if (input.titre !== undefined) {
    const titre = input.titre.trim();
    if (!titre) {
      throw new Error("Le titre ne peut pas etre vide");
    }
    data.titre_ar = titre;
    data.titre_en = titre;
  }

  if (input.description !== undefined) {
    const description = input.description.trim();
    if (!description) {
      throw new Error("La description ne peut pas etre vide");
    }
    data.description_ar = description;
    data.description_en = description;
  }

  if (input.keywords !== undefined) {
    const keywords = input.keywords.trim();
    data.keywords_ar = keywords || null;
    data.keywords_en = keywords || null;
  }

  if (input.workplan !== undefined) {
    const workplan = input.workplan.trim();
    data.workplan_ar = workplan || null;
    data.workplan_en = workplan || null;
  }

  if (input.bibliographie !== undefined) {
    const bibliographie = input.bibliographie.trim();
    data.bibliographie_ar = bibliographie || null;
    data.bibliographie_en = bibliographie || null;
  }

  if (input.typeProjet !== undefined) {
    const typeProjet = parseTypeProjet(input.typeProjet);
    if (!typeProjet) {
      throw new Error("typeProjet invalide");
    }
    data.typeProjet = typeProjet;
  }

  if (input.status !== undefined) {
    const status = parseSujetStatus(input.status);
    if (!status) {
      throw new Error("status invalide");
    }
    data.status = status;
  }

  if (input.enseignantId !== undefined) {
    data.enseignant = {
      connect: {
        id: await resolveEnseignantId(input.enseignantId),
      },
    };
  }

  if (input.promoId !== undefined) {
    if (!Number.isInteger(input.promoId) || input.promoId <= 0) {
      throw new Error("promoId invalide");
    }

    const promo = await prisma.promo.findUnique({
      where: { id: input.promoId },
      select: { id: true },
    });

    if (!promo) {
      throw new Error("Promo introuvable");
    }

    data.promo = {
      connect: {
        id: input.promoId,
      },
    };
  }

  if (input.anneeUniversitaire !== undefined) {
    const anneeUniversitaire = input.anneeUniversitaire.trim();
    if (!anneeUniversitaire) {
      throw new Error("anneeUniversitaire invalide");
    }
    data.anneeUniversitaire = anneeUniversitaire;
  }

  if (input.maxGrps !== undefined) {
    if (!Number.isInteger(input.maxGrps) || input.maxGrps <= 0) {
      throw new Error("maxGrps doit etre un entier positif");
    }
    data.maxGrps = input.maxGrps;
  }

  if (!Object.keys(data).length) {
    throw new Error("Aucune donnee a mettre a jour");
  }

  const updated = await prisma.pfeSujet.update({
    where: { id },
    data,
    include: {
      enseignant: {
        include: { user: true },
      },
      promo: true,
      groupsPfe: {
        select: { id: true },
      },
    },
  });

  logger.info(`PFE admin updated subject ${id}`);
  return mapSubject(updated);
};

export const deleteSujetForAdmin = async (id: number) => {
  const existing = await prisma.pfeSujet.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Sujet PFE introuvable");
  }

  const [groupCount, choiceCount] = await Promise.all([
    prisma.groupPfe.count({ where: { sujetFinalId: id } }),
    prisma.groupSujet.count({ where: { sujetId: id } }),
  ]);

  if (groupCount > 0 || choiceCount > 0) {
    throw new Error("Ce sujet est deja lie a des groupes/voeux et ne peut pas etre supprime");
  }

  await prisma.pfeSujet.delete({ where: { id } });
  logger.info(`PFE admin deleted subject ${id}`);

  return { id };
};

export const setSujetStatusForAdmin = async (id: number, status: StatusSujet) => {
  const updated = await prisma.pfeSujet.update({
    where: { id },
    data: { status },
    include: {
      enseignant: {
        include: { user: true },
      },
      promo: true,
      groupsPfe: {
        select: { id: true },
      },
    },
  });

  return mapSubject(updated);
};

export const listPendingSujetsForAdmin = async () => {
  const pending = await prisma.pfeSujet.findMany({
    where: { status: StatusSujet.propose },
    include: {
      enseignant: {
        include: { user: true },
      },
      promo: true,
      groupsPfe: {
        select: { id: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return pending.map(mapSubject);
};

const getGroupInclude = {
  sujetFinal: {
    include: {
      enseignant: {
        include: { user: true },
      },
    },
  },
  coEncadrant: {
    include: {
      user: true,
    },
  },
  groupMembers: {
    include: {
      etudiant: {
        include: {
          user: true,
        },
      },
    },
  },
  pfeJury: {
    include: {
      enseignant: {
        include: { user: true },
      },
    },
  },
  groupSujets: {
    include: {
      sujet: true,
    },
    orderBy: {
      ordre: "asc" as const,
    },
  },
};

export interface AdminCreateGroupInput {
  nom?: string;
  nomEn?: string;
  sujetFinalId: number;
  coEncadrantId?: number;
  dateSoutenance?: Date | null;
  salleSoutenance?: string;
}

export const listGroupsForAdmin = async () => {
  const groups = await prisma.groupPfe.findMany({
    include: getGroupInclude,
    orderBy: { id: "desc" },
  });

  return groups.map(mapGroup);
};

export const getGroupByIdForAdmin = async (id: number) => {
  const group = await prisma.groupPfe.findUnique({
    where: { id },
    include: getGroupInclude,
  });

  if (!group) {
    throw new Error("Groupe PFE introuvable");
  }

  return mapGroup(group);
};

export const createGroupForAdmin = async (input: AdminCreateGroupInput) => {
  if (!Number.isInteger(input.sujetFinalId) || input.sujetFinalId <= 0) {
    throw new Error("sujetFinalId invalide");
  }

  const sujet = await prisma.pfeSujet.findUnique({
    where: { id: input.sujetFinalId },
    select: { id: true, enseignantId: true },
  });

  if (!sujet) {
    throw new Error("Sujet final introuvable");
  }

  const coEncadrantId = input.coEncadrantId
    ? await resolveEnseignantId(input.coEncadrantId)
    : sujet.enseignantId;

  const created = await prisma.groupPfe.create({
    data: {
      nom_ar: input.nom?.trim() || `Groupe ${sujet.id}`,
      nom_en: input.nomEn?.trim() || null,
      sujetFinalId: sujet.id,
      coEncadrantId,
      dateCreation: new Date(),
      dateSoutenance: input.dateSoutenance || null,
      salleSoutenance: input.salleSoutenance?.trim() || null,
    },
    include: getGroupInclude,
  });

  logger.info(`PFE admin created group ${created.id}`);
  return mapGroup(created);
};

export const deleteGroupForAdmin = async (id: number) => {
  const existing = await prisma.groupPfe.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Groupe PFE introuvable");
  }

  await prisma.$transaction(async (tx) => {
    await tx.pfeJury.deleteMany({ where: { groupId: id } });
    await tx.groupSujet.deleteMany({ where: { groupId: id } });
    await tx.groupMember.deleteMany({ where: { groupId: id } });
    await tx.groupPfe.delete({ where: { id } });
  });

  logger.info(`PFE admin deleted group ${id}`);
  return { id };
};

export interface AdminAddGroupMemberInput {
  etudiantId: number;
  role?: string;
}

export const addGroupMemberForAdmin = async (
  groupId: number,
  input: AdminAddGroupMemberInput
) => {
  const MAX_GROUP_MEMBERS = 3;

  const group = await prisma.groupPfe.findUnique({
    where: { id: groupId },
    include: {
      groupMembers: true,
    },
  });

  if (!group) {
    throw new Error("Groupe PFE introuvable");
  }

  if (group.groupMembers.length >= MAX_GROUP_MEMBERS) {
    throw new Error("Un groupe ne peut pas avoir plus de 3 membres");
  }

  const etudiantId = await resolveEtudiantId(input.etudiantId);

  const alreadyInAnyGroup = await prisma.groupMember.findFirst({
    where: {
      etudiantId,
    },
    select: {
      id: true,
    },
  });

  if (alreadyInAnyGroup) {
    throw new Error("Cet etudiant est deja assigne a un autre groupe");
  }

  const created = await prisma.groupMember.create({
    data: {
      groupId,
      etudiantId,
      role: parseRoleMembre(input.role),
    },
    include: {
      etudiant: {
        include: {
          user: true,
        },
      },
      group: true,
    },
  });

  logger.info(`PFE admin added student ${etudiantId} to group ${groupId}`);
  return {
    id: created.id,
    groupId: created.groupId,
    etudiantId: created.etudiantId,
    role: created.role,
    etudiant: {
      id: created.etudiant.id,
      userId: created.etudiant.userId,
      nom: created.etudiant.user.nom,
      prenom: created.etudiant.user.prenom,
      email: created.etudiant.user.email,
    },
  };
};

export const assignSujetFromChoicesForAdmin = async (
  groupId: number,
  requesterEtudiantId?: number
) => {
  const group = await prisma.groupPfe.findUnique({
    where: { id: groupId },
    select: { id: true },
  });

  if (!group) {
    throw new Error("Groupe PFE introuvable");
  }

  if (requesterEtudiantId) {
    const etudiantId = await resolveEtudiantId(requesterEtudiantId);

    const isLeader = await prisma.groupMember.findFirst({
      where: {
        groupId,
        etudiantId,
        role: RoleMembre.chef_groupe,
      },
      select: { id: true },
    });

    if (!isLeader) {
      throw new Error("Seul le chef du groupe peut demander l'affectation automatique");
    }
  }

  const choices = await prisma.groupSujet.findMany({
    where: { groupId },
    orderBy: { ordre: "asc" },
    include: {
      sujet: {
        select: {
          id: true,
          maxGrps: true,
          groupsPfe: {
            select: { id: true },
          },
        },
      },
    },
  });

  if (!choices.length) {
    throw new Error("Aucun voeu enregistre pour ce groupe");
  }

  const acceptedChoice = choices.find((choice) => choice.sujet.groupsPfe.length < choice.sujet.maxGrps);

  if (!acceptedChoice) {
    throw new Error("Aucun sujet disponible pour affectation automatique");
  }

  const updatedGroup = await prisma.$transaction(async (tx) => {
    const updated = await tx.groupPfe.update({
      where: { id: groupId },
      data: {
        sujetFinalId: acceptedChoice.sujetId,
        dateAffectation: new Date(),
      },
      include: getGroupInclude,
    });

    await tx.groupSujet.update({
      where: { id: acceptedChoice.id },
      data: { status: StatusGroupSujet.accepte },
    });

    await tx.groupSujet.updateMany({
      where: {
        groupId,
        id: { not: acceptedChoice.id },
      },
      data: { status: StatusGroupSujet.refuse },
    });

    await tx.pfeSujet.update({
      where: { id: acceptedChoice.sujetId },
      data: { status: StatusSujet.affecte },
    });

    return updated;
  });

  logger.info(`PFE admin auto-assigned subject ${acceptedChoice.sujetId} to group ${groupId}`);
  return mapGroup(updatedGroup);
};

export interface AdminCreateChoiceInput {
  sujetId: number;
  ordre: number;
}

export const listChoicesForAdmin = async () => {
  const choices = await prisma.groupSujet.findMany({
    include: {
      group: true,
      sujet: true,
    },
    orderBy: [{ groupId: "asc" }, { ordre: "asc" }],
  });

  return choices.map(mapChoice);
};

export const createChoiceForAdmin = async (groupId: number, input: AdminCreateChoiceInput) => {
  if (!Number.isInteger(input.sujetId) || input.sujetId <= 0) {
    throw new Error("sujetId invalide");
  }

  if (!Number.isInteger(input.ordre) || input.ordre <= 0) {
    throw new Error("ordre invalide");
  }

  const group = await prisma.groupPfe.findUnique({
    where: { id: groupId },
    select: { id: true },
  });

  if (!group) {
    throw new Error("Groupe PFE introuvable");
  }

  const subject = await prisma.pfeSujet.findUnique({
    where: { id: input.sujetId },
    select: { id: true },
  });

  if (!subject) {
    throw new Error("Sujet PFE introuvable");
  }

  const created = await prisma.groupSujet.create({
    data: {
      groupId,
      sujetId: input.sujetId,
      ordre: input.ordre,
      status: StatusGroupSujet.en_attente,
    },
    include: {
      group: true,
      sujet: true,
    },
  });

  logger.info(`PFE admin created choice ${created.id} for group ${groupId}`);
  return mapChoice(created);
};

export const updateChoiceStatusForAdmin = async (choiceId: number, statusValue: string) => {
  const status = parseChoiceStatus(statusValue);
  if (!status) {
    throw new Error("Status de voeu invalide");
  }

  const updated = await prisma.groupSujet.update({
    where: { id: choiceId },
    data: { status },
    include: {
      group: true,
      sujet: true,
    },
  });

  return mapChoice(updated);
};

export const deleteChoiceForAdmin = async (choiceId: number) => {
  const existing = await prisma.groupSujet.findUnique({
    where: { id: choiceId },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Voeu introuvable");
  }

  await prisma.groupSujet.delete({ where: { id: choiceId } });
  logger.info(`PFE admin deleted choice ${choiceId}`);

  return { id: choiceId };
};

export const listJuryForAdmin = async (groupId?: number) => {
  const where: Prisma.PfeJuryWhereInput = {};

  if (groupId) {
    where.groupId = groupId;
  }

  const jury = await prisma.pfeJury.findMany({
    where,
    include: {
      group: true,
      enseignant: {
        include: {
          user: true,
        },
      },
    },
    orderBy: { id: "desc" },
  });

  return jury.map(mapJury);
};

export interface AdminAddJuryInput {
  enseignantId: number;
  role?: string;
}

export const addJuryMemberForAdmin = async (groupId: number, input: AdminAddJuryInput) => {
  const group = await prisma.groupPfe.findUnique({
    where: { id: groupId },
    select: { id: true },
  });

  if (!group) {
    throw new Error("Groupe PFE introuvable");
  }

  const enseignantId = await resolveEnseignantId(input.enseignantId);

  const alreadyAssigned = await prisma.pfeJury.findFirst({
    where: {
      enseignantId,
      AND: [
        { groupId: { not: null } },
        { groupId: { not: groupId } },
      ],
    },
    select: { id: true, groupId: true },
  });

  if (alreadyAssigned) {
    throw new Error("Cet enseignant est deja membre du jury d'un autre groupe");
  }

  const created = await prisma.pfeJury.create({
    data: {
      groupId,
      enseignantId,
      role: parseRoleJury(input.role),
    },
    include: {
      group: true,
      enseignant: {
        include: {
          user: true,
        },
      },
    },
  });

  logger.info(`PFE admin added jury member ${created.id} to group ${groupId}`);
  return mapJury(created);
};

export const updateJuryRoleForAdmin = async (juryId: number, roleValue: string) => {
  const role = parseRoleJury(roleValue);

  const updated = await prisma.pfeJury.update({
    where: { id: juryId },
    data: { role },
    include: {
      group: true,
      enseignant: {
        include: {
          user: true,
        },
      },
    },
  });

  return mapJury(updated);
};

export const deleteJuryMemberForAdmin = async (juryId: number) => {
  const existing = await prisma.pfeJury.findUnique({
    where: { id: juryId },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Membre du jury introuvable");
  }

  await prisma.pfeJury.delete({ where: { id: juryId } });
  logger.info(`PFE admin deleted jury member ${juryId}`);

  return { id: juryId };
};
