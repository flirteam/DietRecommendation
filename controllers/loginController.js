const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const jwt = require('jsonwebtoken');
const { generateTokens } = require("../utils/tokenUtils");
const dbConnect = require("../config/dbConnect");
require("dotenv").config();

// POST Login user handler
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const hashedPassword = crypto.createHash("sha256").update(password).digest("hex");

  try {
    const [results] = await dbConnect.query(
      "SELECT id, email, username FROM users WHERE email = ? AND password = ?",
      [email, hashedPassword]
    );

    if (results.length > 0) {
      const user = results[0];
      const { accessToken, refreshToken } = generateTokens(user);

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
      });

      return res.status(200).json({
        message: "Login successful.",
        accessToken,
        user: { id: user.id, email: user.email, username: user.username },
      });
    } else {
      return res.status(401).json({ message: "Invalid email or password." });
    }
  } catch (error) {
    console.error("Database error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

const getUserById = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required." });
  }

  try {
    const [results] = await dbConnect.query(
      "SELECT id, email, username FROM users WHERE id = ?",
      [userId]
    );

    if (results.length > 0) {
      return res.status(200).json({
        message: "User found.",
        user: results[0],
      });
    } else {
      return res.status(404).json({ message: "User not found." });
    }
  } catch (error) {
    console.error("Database error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// POST: Register User
const registerUser = asyncHandler(async (req, res) => {
  const { email, username, password, password2, birthdate } = req.body;

  if (!email || !username || !password || !password2 || !birthdate) {
    return res.status(400).json({ message: "All fields are required." });
  }

  if (password !== password2) {
    return res.status(400).json({ message: "Passwords do not match." });
  }

  const hashedPassword = crypto.createHash("sha256").update(password).digest("hex");

  try {
    // 생년월일을 TIMESTAMP 형식으로 변환하여 저장
    await dbConnect.query(
      "INSERT INTO users (email, password, username, birthdate) VALUES (?, ?, ?, ?)",
      [email, hashedPassword, username, birthdate]
    );

    return res.status(201).json({ message: "User registered successfully." });
  } catch (error) {
    console.error("Database error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

const getUserByToken = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  console.log(userId);
 
  try {
    const [results] = await dbConnect.query(
      "SELECT id, email, username FROM users WHERE id = ?",
      [userId]
    );
 
    if (results.length > 0) {
      return res.status(200).json({
        user: results[0]
      });
    }
 
    return res.status(404).json({ 
      message: "User not found",
      userId: userId // 이 부분 추가
    });
    
  } catch (error) {
    console.error("Database error:", error);
    return res.status(500).json({ 
      message: "Server error",
      userId: userId, // 여기도 추가
      error: error.message 
    });
  }
});
 
 module.exports = { loginUser, getUserById, registerUser, getUserByToken };