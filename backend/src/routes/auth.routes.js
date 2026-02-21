import { Router } from "express";
import { logInUser, refreshAccessToken, logOutUser } from "../controllers/auth.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { initiateCodeforcesAuth, codeforcesCallback, unlinkCodeforcesAccount } from "../controllers/codeforces.controller.js";

const router = Router();

// Google OAuth routes
router.route("/login").post(logInUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/logout").post(verifyJwt, logOutUser);

// Codeforces OAuth
router.route('/codeforces').get(verifyJwt, initiateCodeforcesAuth);
router.route('/codeforces/callback').get(codeforcesCallback);
router.route('/codeforces/unlink').post(verifyJwt, unlinkCodeforcesAccount);


export default router;