const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { generateTokens } = require("../utils/tokenUtils");
const dbConnect = require("../config/dbConnect");
require("dotenv").config();


// 비밀번호 해싱
const hashPassword = async (password) => {
  const saltRounds = 10; // Spring Boot와 동일하게 설정
  return await bcrypt.hash(password, saltRounds);
};

// POST Login user handler
const Login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  try {
    // 사용자 계정 정보 조회
    const [userResults] = await dbConnect.query(
      "SELECT id, email, password, username, birthdate FROM users WHERE email = ?",
      [email]
    );

    if (userResults.length === 0) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const user = userResults[0];

    // 비밀번호 검증
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const { accessToken, refreshToken } = generateTokens(user);

    return res.status(200).json({
      message: "Login successful.",
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        birthdate: user.birthdate,
      },
    });
  } catch (error) {
    console.error("Database error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

// POST: Register User
const registerUser = asyncHandler(async (req, res) => {
  const { email, username, password, password2, birthdate } = req.body;

  if (!email || !username || !password || !password2) {
    return res.status(400).json({ message: "All fields are required." });
  }

  if (password !== password2) {
    return res.status(400).json({ message: "Passwords do not match." });
  }

  try {
    const hashedPassword = await hashPassword(password); // 비밀번호 해싱

    await dbConnect.query(
      "INSERT INTO users (email, password, username, birthdate) VALUES (?, ?, ?, ?)",
      [email, hashedPassword, username, birthdate || "2000-01-01"]
    );

    return res.status(201).json({ message: "User registered successfully." });
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
      "SELECT id, email, username, birthdate FROM users WHERE id = ?",
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

// GET: User by Token
const getUserByToken = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  try {
    const [results] = await dbConnect.query(
      "SELECT id, email, username, birthdate FROM users WHERE id = ?",
      [userId]
    );

    if (results.length > 0) {
      return res.status(200).json({
        user: results[0],
      });
    }

    return res.status(404).json({ message: "User not found", userId });
  } catch (error) {
    console.error("Database error:", error);
    return res.status(500).json({ message: "Server error.", error: error.message });
  }
});

const updateUserByToken = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { email, username, birthdate } = req.body;

  if (!email && !username && !birthdate) {
    return res.status(400).json({ message: "At least one field to update is required." });
  }

  const updates = [];
  const values = [];

  if (email) {
    updates.push("email = ?");
    values.push(email);
  }
  if (username) {
    updates.push("username = ?");
    values.push(username);
  }
  if (birthdate) {
    updates.push("birthdate = ?");
    values.push(birthdate);
  }
  values.push(userId);

  try {
    const [result] = await dbConnect.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    if (result.affectedRows > 0) {
      return res.status(200).json({ message: "User updated successfully." });
    } else {
      return res.status(404).json({ message: "User not found." });
    }
  } catch (error) {
    console.error("Database error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

const changePassword = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword, confirmNewPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    return res.status(400).json({ message: "All fields are required." });
  }

  if (newPassword !== confirmNewPassword) {
    return res.status(400).json({ message: "New passwords do not match." });
  }

  try {
    const [userResults] = await dbConnect.query(
      "SELECT password FROM users WHERE id = ?",
      [userId]
    );

    if (userResults.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const user = userResults[0];

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect." });
    }

    const hashedNewPassword = await hashPassword(newPassword);

    const [updateResult] = await dbConnect.query(
      "UPDATE users SET password = ? WHERE id = ?",
      [hashedNewPassword, userId]
    );

    if (updateResult.affectedRows > 0) {
      return res.status(200).json({ message: "Password updated successfully." });
    } else {
      return res.status(500).json({ message: "Password update failed." });
    }
  } catch (error) {
    console.error("Database error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

module.exports = { Login, registerUser, getUserById, getUserByToken, updateUserByToken, changePassword };