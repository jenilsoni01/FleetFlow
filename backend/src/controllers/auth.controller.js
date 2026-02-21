import crypto from "crypto";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

const accessTokenOptions = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === "production" ? "Strict" : "Lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 24 * 60 * 60 * 1000, // 1 day
};

const refreshTokenOptions = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === "production" ? "Strict" : "Lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const generateAccessAndRefreshTokens = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(500, "User not found after creation");

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = hashToken(refreshToken);
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

const registerUser = asyncHandler(async (req, res) => {
  const { userName, email, password, role } = req.body;

  if (!userName || !email || !password || !role) {
    throw new ApiError(400, "userName, Email, Password, and Role are required");
  }

  const normalizedEmail = email.toLowerCase().trim(); 

  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw new ApiError(400, "User with this email already exists");
  }

  const newUser = await User.create({
    userName: userName,
    email: normalizedEmail,
    password: password,
    role: role, 
  });


  if (!newUser) {
    throw new ApiError(500, "Error creating new user");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    newUser._id,
  );

  const createdUser = await User.findById(newUser._id).select(
    "-password -refreshToken",
  );

  return res
    .status(201)
    .cookie("refreshToken", refreshToken, refreshTokenOptions)
    .cookie("accessToken", accessToken, accessTokenOptions)
    .json(
      new ApiResponse(
        201,
        { user: createdUser, refreshToken, accessToken },
        "User registered successfully",
      ),
    );
});

const logInUser = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }
  const normalizedEmail = email.toLowerCase().trim(); 
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id,
  );
  return res
    .status(200)
    .cookie("accessToken", accessToken, accessTokenOptions)
    .cookie("refreshToken", refreshToken, refreshTokenOptions)
    .json(
      new ApiResponse(
        200,
        {
          id: user._id,
          userName: user.userName,
          email: user.email,
          role: user.role,
          accessToken,
          refreshToken,
        },
        "User logged in successfully",
      ),
    );
});

const logOutUser = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  await User.findByIdAndUpdate(userId, { $unset: { refreshToken: "" } });

  const clearCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "Strict" : "Lax",
  };

  return res
    .status(200)
    .clearCookie("accessToken", clearCookieOptions)
    .clearCookie("refreshToken", clearCookieOptions)
    .json(new ApiResponse(200, {}, "Logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res, next) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    throw new ApiError(401, "Refresh token is missing");
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(decoded?._id);

    if (!user || !user.refreshToken) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (hashToken(refreshToken) !== user.refreshToken) {
      throw new ApiError(401, "Refresh token does not match");
    }
    const newAccessToken = user.generateAccessToken();

    return res
      .status(200)
      .cookie("accessToken", newAccessToken, accessTokenOptions)
      .json(new ApiResponse(200, {}, "Access token refreshed successfully"));
  } catch (error) {
    throw new ApiError(
      error.statusCode || 401,
      error.message || "Invalid refresh token",
    );
  }
});

export { registerUser, logInUser, logOutUser, refreshAccessToken };
