// controllers/user.controller.js

import User from "../models/user.model.js";
import mongoose from "mongoose";
import { ValidateIsAdminFromRefreshToken } from "../outils/token.outils.js";
import nodemailer from "nodemailer";
import {
  userExists,
  comparerPassword,
  userIsAdmin,
  saveUser,
  updateUser,
  getAllUsers,
} from "../outils/user.outils.js";
import {
  calculateExpirationDate,
  genererRandomToken,
  tokenIsExpired,
  verifyToken,
  hasher,
} from "../outils/token.outils.js";
import { getCoursesByUser } from "../outils/userCourse.outils.js";

export const forgottenPasswordUserController = async (req, res) => {
  // Configuration du transporteur Nodemailer
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SYS_EMAIL,
      pass: process.env.SYS_PASSWORD,
    },
  });

  try {
    // 0. Valider les données envoyées dans la requête
    if (!req.body.email) {
      return res
        .status(400)
        .json({ ok: false, message: "user email required" });
    }

    const { email } = req.body || {};

    // 1. Vérifier que l'utilisateur existe bien dans la base de données
    const user = await userExists("email", email);

    if (!user) {
      return res.status(404).json({ ok: false, message: "user not found" });
    }

    // 2. Générer un token sécurisé et le stocker avec l'utilisateur dans la base de données
    const token = await genererRandomToken();

    // Récupérer le temps d'expiration du token (par défaut 1 heure)
    const rawLifetime = process.env.EMAIL_RESET_TOKEN_LIFETIME || 3600000;
    const lifetime = parseInt(rawLifetime, 10);
    const expires = isNaN(lifetime)
      ? calculateExpirationDate("3600000")
      : calculateExpirationDate(lifetime);

    await updateUser(
      "email",
      email,
      null,
      {},
      { resetPasswordToken: token, resetPasswordTokenExpires: expires }
    );

    // 3. Créer le lien de réinitialisation du mot de passe et l'envoyer à l'utilisateur
    const passwordResetLink = `${process.env.FRONTEND}/reset-password2?token=${token}`;

    // 4. Configuration du mail
    const mailOptions = {
      from: process.env.SYS_EMAIL,
      to: email,
      subject: "Réinitialisation de votre mot de passe",
      html: `<p>Cliquez sur le lien suivant pour réinitialiser votre mot de passe :</p>
             <a href="${passwordResetLink}">Réinitialiser mon mot de passe</a>`,
    };

    // 5. Envoyer l'email avec async/await pour un meilleur contrôle
    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      ok: true,
      message: "Email de réinitialisation envoyé avec succès.",
    });
  } catch (error) {
    console.error("Erreur lors de la réinitialisation du mot de passe:", error);
    return res.status(500).json({
      ok: false,
      message: "Erreur serveur lors de l'envoi de l'email de réinitialisation.",
      error: error.message,
    });
  }
};

// Réception du nouveau mot de passe et mise à jour des données de l'utilisateur
export const resetUserPasswordManagementController = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // 0. Validation des données reçues
    if (!token) {
      return res.status(400).json({ ok: false, message: "Token required" });
    }
    // 0. Validation du reset token
    const userResetToken = await userExists("resetPasswordToken", token);
    const expired = tokenIsExpired(userResetToken.resetPasswordTokenExpires); //aqui

    if (expired) {
      return res
        .status(403)
        .json({ ok: false, message: "Invalid or expired token" });
    }
    // 0. Validation des données reçues
    if (!newPassword) {
      return res.status(400).json({ ok: false, message: "Password required" });
    }

    // 1. Recherche de l'utilisateur par token
    const existingUser = await userExists("resetPasswordToken", token);

    if (!existingUser) {
      return res.status(404).json({ ok: false, message: "User not found" });
    }

    const { email } = existingUser;

    // 2. Mise à jour du mot de passe et suppression des champs temporaires
    await updateUser("email", email, newPassword, {
      resetPasswordToken: true,
      resetPasswordTokenExpires: true,
    });

    // 3. Réponse OK
    res.status(200).json({ ok: true, message: "Reset password successful" });
  } catch (error) {
    console.error("Erreur lors de la réinitialisation du mot de passe:", error);
    res.status(500).json({
      ok: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const resetUserPasswordQuestionController = async (req, res) => {
  try {
    // 1. Récuperation du token
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({
        ok: false,
        message: "Token error",
      });
    }

    // 2. Recherche de l'utilisateur avec le token
    const user = await userExists("resetPasswordToken", token);
    if (!user) {
      return res.status(400).json({
        ok: false,
        message: "User not found",
      });
    }

    // 3. Vérification de l'expiration du token
    if (tokenIsExpired(user.resetPasswordTokenExpires)) {
      return res.status(400).json({
        ok: false,
        message: "Expired token",
      });
    }

    // 4. Redirection vers la page de réinitialisation (front-end)
    return res.redirect(
      302,
      `${process.env.FRONTEND}/reset-password2?token=${token}`
    );
  } catch (error) {
    console.error("Erreur dans resetUserPasswordQuestionController:", error);
    return res.status(500).json({
      ok: false,
      message: "Erreur serveur.",
      error: error.message,
    });
  }
};

export const signInController = async (req, res) => {
  const { pseudo, password } = req.body;

  // Validation basique (à remplacer idéalement par Joi/Zod)
  if (!pseudo || !password) {
    return res
      .status(400)
      .json({ ok: false, message: "Pseudo and password are required" });
  }

  try {
    // 1. Vérification si l'utilisateur existe
    const user = await userExists("pseudo", pseudo);

    if (!user) {
      return res.status(404).json({ ok: false, message: "User not found" });
    }

    // 2. Vérification du mot de passe
    const passwordIsValid = await comparerPassword(password, user.password);
    if (!passwordIsValid) {
      return res.status(401).json({ ok: false, message: "Incorrect password" });
    }

    // 3. Création et enregistrement des tokens
    const { accessToken, refreshToken } =
      await user.generateTokensAndSaveUser();

    // Nettoyage de l'objet utilisateur
    const { password: _, ...userWithoutPassword } = user.toObject();

    // Définir le cookie pour retourner le refresh token
    // Options de cookie selon environnement
    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      // secure: isProduction,
      secure: false,
      // sameSite: isProduction ? "Strict" : "Lax",
      sameSite: "Lax",
      maxAge: Number(process.env.COOKIE_LIFETIME) || 7 * 24 * 60 * 60 * 1000, //7d par default
    });

    // SECURITE ++
    res.cookie("accessToken", accessToken, {
      httpOnly: false, // pour pouvoir acceder au cookie depuis js
      // secure: isProduction,
      secure: false,
      // sameSite: isProduction ? "Strict" : "Lax",
      sameSite: "Lax",
      maxAge: Number(process.env.COOKIE_LIFETIME) || 7 * 24 * 60 * 60 * 1000, //7d par default
    });

    res.status(200).json({
      ok: true,
      message: "User connected successfully",
      user: userWithoutPassword,
      // authToken: accessToken,
      isAdmin: userIsAdmin(user.role),
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Création du compte de l'utilisateur
export const registerController = async (req, res) => {
  try {
    const { user } = req.body;

    // Validation du payload
    if (!user) {
      return res.status(400).json({ message: "Missing user" });
    }

    const { pseudo, password } = user;

    if (!pseudo || !password) {
      return res
        .status(400)
        .json({ message: "pseudo and password are required" });
    }

    // Vérification si l'utilisateur existe déjà
    const existingUser = await userExists("pseudo", pseudo);
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" }); // 409 = conflict
    }

    // Hash du mot de passe
    const hashedPassword = await hasher(password);

    // Création du nouvel utilisateur
    const newUser = new User({
      ...user,
      password: hashedPassword,
    });

    // Sauvegarde en base
    await saveUser(newUser);

    // Nettoyage avant envoi (pas de mot de passe)
    const { password: _, ...userWithoutPassword } = newUser.toObject();

    // on ne renvoie pas de cookie avec refreshtoken parce que on est renvoyé
    // vers la page de login
    return res.status(201).json({
      ok: true,
      message: "User created successfully.",
      user: userWithoutPassword,
    });
  } catch (err) {
    console.error("Erreur lors de l’enregistrement utilisateur:", err);
    return res.status(500).json({
      ok: false,
      message: "User creation failed",
      error: err.message,
    });
  }
};

export const logoutController = (req, res) => {
  const isProduction = process.env.NODE_ENV === "production";

  const cookieOptions = {
    httpOnly: true,
    // secure: isProduction,
    secure: false,
    // sameSite: isProduction ? "Strict" : "Lax",
    sameSite: "Lax",
  };

  res.clearCookie("refreshToken", cookieOptions);
  res.clearCookie("accessToken", {
    ...cookieOptions,
    httpOnly: false, // correspond à la création du accessToken
  });

  res.status(200).json({ ok: true, message: "User logged out successfully" });
};

// retourns user info
export const userInfoController = async (req, res) => {
  try {
    // 1. Récupérer le token d'accès depuis les cookies
    const accessToken = req.cookies?.accessToken;

    if (!accessToken) {
      return res.status(401).json({
        ok: false,
        message: "Access token required",
      });
    }
    // 2. Vérifier et décoder le token
    let decoded;
    try {
      decoded = verifyToken(accessToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        ok: false,
        message: "invalid or expired token",
      });
    }
    // 3. Vérifier si l'utilisateur existe
    const user = await userExists("_id", decoded._id);
    if (!user) {
      return res.status(401).json({
        ok: false,
        message: "unknown user",
      });
    }
    // 4. Retourner les infos de l'utilisateur
    const { name, first_name, email, phone, address, pseudo, _id } = user;

    return res.status(200).json({
      ok: true,
      user: {
        name,
        first_name,
        email,
        phone,
        address,
        pseudo,
        _id,
      },
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const saveUserInfoController = async (req, res) => {
  try {
    // 1. Récuperer les données à sauvegarder
    const { name, first_name, email, phone, address } = req.body;
    if (!name || !first_name || !email || !phone || !address) {
      return res.status(400).json({ ok: false, message: "field required" });
    }

    // 2. Récupérer le token d'accès depuis les cookies pour identifier l'utilisateur à mettre à jour
    const accessToken = req.cookies?.accessToken;

    if (!accessToken) {
      return res.status(401).json({
        ok: false,
        message: "Access token required",
      });
    }
    // 3. Vérifier et décoder le token
    let decoded;
    try {
      decoded = verifyToken(accessToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        ok: false,
        message: "invalid or expired token",
      });
    }
    // 4. Vérifier si l'utilisateur existe
    const user = await userExists("_id", decoded._id);
    if (!user) {
      return res.status(401).json({
        ok: false,
        message: "unknown user",
      });
    }

    // 5. Mettre à jour l'utilisateur
    await updateUser(
      "_id",
      user._id, // ou user.mail, ou user.pseudo tous les trois sont uniques
      null,
      {},
      { name, first_name, email, phone, address }
    );
    return res.status(200).json({
      ok: true,
      message: "user update successful",
      user: {
        name,
        first_name,
        email,
        phone,
        address,
      },
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const deleteUserController = async (req, res) => {
  try {
    const userId = req.userId;

    // Supprimer l'utilisateur
    await User.findByIdAndDelete(userId);

    // Supprimer les cookies
    res.clearCookie("accessToken", {
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    });

    res.status(200).json({ message: "Compte supprimé avec succès." });
  } catch (err) {
    console.error("Erreur lors de la suppression du compte :", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// Récupérer tous les cours
export const getAllUsersController = async (req, res) => {
  try {
    const usersList = await getAllUsers();
    res.status(200).json({
      ok: true,
      message: "users gathering ok",
      users: usersList,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "server error",
      users: [],
    });
  }
};

export const getUserCoursesController = async (req, res) => {
  if (!req.params.id) {
    throw new Error("user required");
  }
  const userToFetchCourses = req.params.id;

  if (!req.cookies.refreshToken) {
    return res.status(401).json({ ok: false, message: "Token required" });
  }
  const refreshToken = req.cookies.refreshToken;

  const { ok, status, message } = await ValidateIsAdminFromRefreshToken(
    refreshToken
  );

  if (!ok) {
    return {
      ok,
      status,
      message,
    };
  }

  try {
    const userCoursesList = await getCoursesByUser(userToFetchCourses);
    res.status(200).json({
      ok: true,
      message: "users courses gathering ok",
      data: userCoursesList,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "server error",
      data: [],
    });
  }
};
