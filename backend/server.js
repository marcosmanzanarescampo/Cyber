import express from "express";
import UserRouter from "./routes/user.routes.js";
import CoursRouter from "./routes/course.routes.js";
import UserCourseRouter from "./routes/userCourse.routes.js";
import authRouter from "./routes/auth.routes.js";
import createAdminUser from "./outils/createAdminUser.js";
import connectDB from "./config/db.js";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cookieParser());
app.use(
  cors({
    origin: process.env.FRONTEND,
    credentials: true,
  })
);
// Pour parser les JSON
app.use(express.json());
// Pour parser les formulaires (si tu envoies avec enctype=urlencoded)
app.use(express.urlencoded({ extended: true }));
// CORS pour les fichiers statiques
app.use("/uploads", (req, res, next) => {
  res.header("Access-Control-Allow-Origin", process.env.FRONTEND);
  res.header("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

const port = process.env.BACKEND_PORT || 5000;

// conexion à la BBDD
await connectDB();

// Création de l'utilisateur administrateur
await createAdminUser();

// Middlewares

// Permet d’accéder à tous les fichiers HTML dans le dossier front. utilisé pour la rédirection vers reset-password
const frontPath = path.join(__dirname, "../frontend/dist");
app.use(express.static(frontPath));

// Pour gérer le fallback des routes côté client (React Router)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
});

// user routes
app.use("/user", UserRouter);
// cours routes
app.use("/course", CoursRouter);
// userCours routes
app.use("/userCourse", UserCourseRouter);
// Refresh token
app.use("/auth", authRouter);
// lancer le serveur on port 5000
app.listen(port, () => console.log("\x1b[32m%s\x1b[0m", "Server ready"));
