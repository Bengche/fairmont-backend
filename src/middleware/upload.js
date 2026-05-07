import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function ensureDir(subdir) {
  const uploadsDir = path.join(__dirname, "..", "..", "uploads", subdir);
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  return uploadsDir;
}

function createUploader({ subdir, prefix, allowedExts, allowedMimes, maxFileSize, errorMessage }) {
  const uploadsDir = ensureDir(subdir);

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const safeName = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, safeName);
    },
  });

  const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext) && allowedMimes.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error(errorMessage), false);
  };

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: maxFileSize },
  });
}

export const uploadReceipt = createUploader({
  subdir: "receipts",
  prefix: "receipt",
  allowedExts: [".pdf", ".jpg", ".jpeg", ".png"],
  allowedMimes: ["application/pdf", "image/jpeg", "image/png"],
  maxFileSize: 10 * 1024 * 1024,
  errorMessage: "Only PDF, JPG, and PNG files are accepted.",
});

export const uploadRoomImage = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowedExts = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".jfif"];
    const allowedMimes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
      "image/jfif",
      "image/pjpeg",
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext) && allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, WEBP, AVIF, and JFIF files are accepted."), false);
    }
  },
  limits: { fileSize: 15 * 1024 * 1024 },
});

/**
 * Upload a buffer to Cloudinary and return the secure URL.
 * @param {Buffer} buffer
 * @param {string} folder  - Cloudinary folder name
 * @returns {Promise<string>} secure_url
 */
export function uploadBufferToCloudinary(buffer, folder = "rooms") {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      },
    );
    stream.end(buffer);
  });
}
