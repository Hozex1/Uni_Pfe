import prisma from "../../config/database";
import { AlertAudience, AlertLevel, Prisma } from "@prisma/client";
import logger from "../../utils/logger";

const ALLOWED_AUDIENCES: AlertAudience[] = ["all", "etudiants", "enseignants", "admins"];
const ALLOWED_LEVELS: AlertLevel[] = ["info", "warning", "critical"];

const normalizeAudience = (value: unknown): AlertAudience => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if ((ALLOWED_AUDIENCES as string[]).includes(normalized)) {
      return normalized as AlertAudience;
    }
  }
  return "all";
};

const normalizeLevel = (value: unknown): AlertLevel => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if ((ALLOWED_LEVELS as string[]).includes(normalized)) {
      return normalized as AlertLevel;
    }
  }
  return "info";
};

export interface CreateAlertInput {
  titre: string;
  message: string;
  audience?: string;
  level?: string;
  startsAt?: Date | null;
  endsAt?: Date | null;
  active?: boolean;
}

export interface UpdateAlertInput extends Partial<CreateAlertInput> {}

const alertInclude = {
  createdBy: {
    select: { id: true, nom: true, prenom: true, email: true },
  },
} satisfies Prisma.AlertInclude;

export const createAlert = async (input: CreateAlertInput, createdById: number) => {
  const titre = input.titre.trim();
  const message = input.message.trim();

  if (!titre || !message) {
    throw new Error("Titre et message sont obligatoires");
  }

  if (input.startsAt && input.endsAt && input.startsAt > input.endsAt) {
    throw new Error("La date de début doit précéder la date de fin");
  }

  const alert = await prisma.alert.create({
    data: {
      titre,
      message,
      audience: normalizeAudience(input.audience),
      level: normalizeLevel(input.level),
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
      active: input.active ?? true,
      createdById,
    },
    include: alertInclude,
  });

  logger.info(`Alert created: ${alert.id}`);
  return alert;
};

export interface ListAlertsFilters {
  audience?: AlertAudience | "any";
  activeOnly?: boolean;
  now?: Date;
}

export const listAlerts = async (filters: ListAlertsFilters = {}) => {
  const where: Prisma.AlertWhereInput = {};

  if (filters.activeOnly) {
    const now = filters.now ?? new Date();
    where.active = true;
    where.AND = [
      { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
      { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
    ];
  }

  if (filters.audience && filters.audience !== "any") {
    where.OR = [{ audience: "all" }, { audience: filters.audience }];
  }

  return prisma.alert.findMany({
    where,
    include: alertInclude,
    orderBy: [{ level: "desc" }, { createdAt: "desc" }],
  });
};

export const getAlertById = async (id: number) => {
  const alert = await prisma.alert.findUnique({
    where: { id },
    include: alertInclude,
  });
  if (!alert) throw new Error("Alert not found");
  return alert;
};

export const updateAlert = async (id: number, input: UpdateAlertInput) => {
  if (input.startsAt && input.endsAt && input.startsAt > input.endsAt) {
    throw new Error("La date de début doit précéder la date de fin");
  }

  const data: Prisma.AlertUpdateInput = {};
  if (typeof input.titre === "string") data.titre = input.titre.trim();
  if (typeof input.message === "string") data.message = input.message.trim();
  if (input.audience !== undefined) data.audience = normalizeAudience(input.audience);
  if (input.level !== undefined) data.level = normalizeLevel(input.level);
  if (input.startsAt !== undefined) data.startsAt = input.startsAt;
  if (input.endsAt !== undefined) data.endsAt = input.endsAt;
  if (input.active !== undefined) data.active = input.active;

  const alert = await prisma.alert.update({
    where: { id },
    data,
    include: alertInclude,
  });
  logger.info(`Alert updated: ${id}`);
  return alert;
};

export const deleteAlert = async (id: number) => {
  await prisma.alert.delete({ where: { id } });
  logger.info(`Alert deleted: ${id}`);
};

const audienceForCoreRole = (coreRole: string | null): AlertAudience | "any" => {
  if (coreRole === "etudiant") return "etudiants";
  if (coreRole === "enseignant") return "enseignants";
  if (coreRole === "admin") return "admins";
  return "any";
};

export const getActiveAlertsForUser = async (coreRole: string | null) => {
  return listAlerts({
    activeOnly: true,
    audience: audienceForCoreRole(coreRole),
  });
};
