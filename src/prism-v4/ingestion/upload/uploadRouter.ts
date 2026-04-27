import { Router } from "express";
import multer from "multer";
import { handleDocumentUpload } from "./uploadController";
import { validateUpload } from "./uploadValidator";

const upload = multer({ storage: multer.memoryStorage() });

export const uploadRouter = Router();

uploadRouter.post(
  "/upload",
  upload.single("file"),
  validateUpload,
  handleDocumentUpload
);
