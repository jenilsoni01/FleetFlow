import crypto from "crypto";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { bcyrptPassword } from "../utils/bcrypt.js"; // Assuming you have this helper

const accessTokenOptions = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === "production" ? "Strict" : "Lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 15 * 60 * 1000, // 15 minutes
};

const refreshTokenOptions = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === "production" ? "Strict" : "Lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

const generateAccessToken = (userId) => {
  const secret = process.env.JWT_ACCESS_SECRET;

  if (!secret) {
    throw new Error("JWT_ACCESS_SECRET is not set");
  }

  return jwt.sign({ id: userId }, secret, { expiresIn: "15m" });
};

const generateRefreshToken = (userId) => {
  const secret = process.env.JWT_REFRESH_SECRET;

  if (!secret) {
    throw new Error("JWT_REFRESH_SECRET is not set");
  }

  return jwt.sign({ id: userId }, secret, { expiresIn: "7d" });
};

const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const registerUser = asyncHandler(async (req, res) => {
  
  const { userName, email, password, role } = req.body;

  // 2. Check if all required fields are present
  if (!userName || !email || !password || !role) {
    throw new ApiError(400, "userName, Email, Password, and Role are required");
  }

  // 3. Check if user already exists in MongoDB
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new ApiError(400, "User with this email already exists");
  }

  // 5. Hash Password
  const hashedPassword = await bcyrptPassword(password);

  // 6. Create the new user in MongoDB
  const newUser = await User.create({
    userName : userName,
    email : email,
    password: hashedPassword,
    role : role, // e.g., 'MANAGER', 'DISPATCHER', 'DRIVER'
  });

  if (!newUser) {
    throw new ApiError(500, "Error creating new user");
  }

  // 7. FLEETFLOW SPECIFIC LOGIC: 
  // If the registered user is a Driver, initialize their Driver Profile
  if (role === "DRIVER") {
    await DriverProfile.create({
      user_id: newUser._id,
      status: "OFF_DUTY", 
      safety_score: 100 // Default starting score
    });
  }

  // 8. Generate Tokens (assuming your helper takes the MongoDB ObjectId)
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    newUser._id 
  );

  // 9. Remove password from the response object for security
  const createdUser = await User.findById(newUser._id).select("-password");

  // 10. Send Response
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  return res
    .status(201)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(
      new ApiResponse(
        201,
        { user: createdUser, refreshToken, accessToken },
        "User registered successfully"
      )
    );
});

const logInUser = asyncHandler(async (req, res, next) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      throw new ApiError(400, "idToken is required");
    }

    const client = getOAuthClient();
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      throw new ApiError(401, "Invalid Google token");
    }

    const email = payload.email.toLowerCase();

    if (!email.endsWith(allowedDomain)) {
      throw new ApiError(403, "Unauthorized domain");
    }

    const name = payload.name || "";

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        name,
        email,
      });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = hashToken(refreshToken);

    await user.save();

    return res
      .status(200)
      .cookie("accessToken", accessToken, accessTokenOptions)
      .cookie("refreshToken", refreshToken, refreshTokenOptions)
      .json(
        new ApiResponse(
          200,
          {
            id: user._id,
            name: user.name,
            email: user.email,
          },
          "Login successful",
        ),
      );
  } catch (error) {
    throw new ApiError(
      error.status || 500,
      error.message || "Internal Server Error",
    );
  }
});

const logOutUser = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;

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
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const user = await User.findById(decoded?.id);

    if (!user || !user.refreshToken) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (hashToken(refreshToken) !== user.refreshToken) {
      throw new ApiError(401, "Refresh token does not match");
    }

    const newAccessToken = generateAccessToken(user._id);
    console.log(newAccessToken);
    return res
      .status(200)
      .cookie("accessToken", newAccessToken, accessTokenOptions)
      .json(new ApiResponse(200, {}, "Access token refreshed successfully"));
  } catch (error) {
    throw new ApiError(
      error.status || 401,
      error.message || "Invalid refresh token",
    );
  }
});

export { logInUser, logOutUser, refreshAccessToken };
