import { Response } from "express";
import { AuthRequest } from "../../middlewares/auth.middleware";
import {
  createAlert,
  deleteAlert,
  getActiveAlertsForUser,
  getAlertById,
  listAlerts,
  updateAlert,
} from "./alerts.service";
import logger from "../../utils/logger";

const parseDate = (value: unknown): Date | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const parseBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
};

const parseId = (raw: unknown): number | null => {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export const listAlertsHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const activeOnly = parseBoolean(req.query.activeOnly);
    const data = await listAlerts({ activeOnly: activeOnly === true });
    res.status(200).json({ success: true, data, count: data.length });
  } catch (error) {
    logger.error("listAlertsHandler", error);
    res.status(500).json({ success: false, message: "Erreur lors de la récupération des alertes" });
  }
};

export const getActiveAlertsHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await getActiveAlertsForUser(req.user?.coreRole ?? null);
    res.status(200).json({ success: true, data, count: data.length });
  } catch (error) {
    logger.error("getActiveAlertsHandler", error);
    res.status(500).json({ success: false, message: "Erreur lors de la récupération des alertes actives" });
  }
};

export const getAlertHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ success: false, message: "ID invalide" });
    return;
  }

  try {
    const data = await getAlertById(id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error instanceof Error ? error.message : "Alerte introuvable",
    });
  }
};

export const createAlertHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ success: false, message: "Authentication required" });
    return;
  }

  const { titre, message, audience, level, startsAt, endsAt, active } = req.body ?? {};
  const normalizedTitre = typeof titre === "string" ? titre.trim() : "";
  const normalizedMessage = typeof message === "string" ? message.trim() : "";

  if (!normalizedTitre || !normalizedMessage) {
    res.status(400).json({ success: false, message: "Titre et message sont obligatoires" });
    return;
  }

  try {
    const parsedStartsAt = parseDate(startsAt);
    const parsedEndsAt = parseDate(endsAt);

    const data = await createAlert(
      {
        titre: normalizedTitre,
        message: normalizedMessage,
        audience: typeof audience === "string" ? audience : undefined,
        level: typeof level === "string" ? level : undefined,
        startsAt: parsedStartsAt ?? null,
        endsAt: parsedEndsAt ?? null,
        active: parseBoolean(active),
      },
      req.user.id
    );

    res.status(201).json({ success: true, message: "Alerte créée", data });
  } catch (error) {
    logger.error("createAlertHandler", error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Erreur lors de la création de l'alerte",
    });
  }
};

export const updateAlertHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ success: false, message: "ID invalide" });
    return;
  }

  const { titre, message, audience, level, startsAt, endsAt, active } = req.body ?? {};

  try {
    const data = await updateAlert(id, {
      titre: typeof titre === "string" ? titre : undefined,
      message: typeof message === "string" ? message : undefined,
      audience: typeof audience === "string" ? audience : undefined,
      level: typeof level === "string" ? level : undefined,
      startsAt: parseDate(startsAt),
      endsAt: parseDate(endsAt),
      active: parseBoolean(active),
    });

    res.status(200).json({ success: true, message: "Alerte mise à jour", data });
  } catch (error) {
    logger.error("updateAlertHandler", error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Erreur lors de la mise à jour",
    });
  }
};

export const deleteAlertHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ success: false, message: "ID invalide" });
    return;
  }

  try {
    await deleteAlert(id);
    res.status(200).json({ success: true, message: "Alerte supprimée" });
  } catch (error) {
    logger.error("deleteAlertHandler", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Erreur lors de la suppression",
    });
  }
};
