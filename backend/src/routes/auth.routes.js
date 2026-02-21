import { Router } from "express";
import {
  registerUser,
  logInUser,
  refreshAccessToken,
  logOutUser,
} from "../controllers/auth.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

// Auth routes
router.route("/register").post(registerUser);
router.route("/login").post(logInUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/logout").post(verifyJwt, logOutUser);

export default router;
