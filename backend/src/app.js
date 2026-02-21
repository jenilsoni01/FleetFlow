import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ApiError } from "./utils/ApiError.js";
const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Set-Cookie"],
  }),
);

app.use(express.json());
app.use(cookieParser());



import authRouter from "./routers/auth.routes.js";
import userRouter from "./routers/user.routes.js";
import cplrouter from "./routers/CPL_2026/registerCpl.routes.js"
import cfRouter from "./routers/CPL_2026/codeforces.routes.js"
// auth routes
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/cpl", cplrouter);
app.use("/api/cf", cfRouter);


export default app;
