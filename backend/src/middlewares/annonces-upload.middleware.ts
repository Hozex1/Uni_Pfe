import multer from "multer";
import {
  createDiskStorage,
  createMimeAndExtensionFileFilter,
} from "../shared/local-upload.service";

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const allowedExtensions = new Set([".pdf", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".doc", ".docx"]);

const upload = multer({
  storage: createDiskStorage("others", "annonces"),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
  fileFilter: createMimeAndExtensionFileFilter(
    allowedMimeTypes,
    allowedExtensions,
    "Only JPG, PNG, GIF, PDF, and Word files are allowed"
  ),
});

export default upload;
