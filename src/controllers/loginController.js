const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const jwt = require('jsonwebtoken');
const { generateTokens } = require("../utils/tokenUtils");
const dbConnect = require("../config/dbConnect");
require("dotenv").config();

// POST Login user handler
const Login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const hashedPassword = crypto.createHash("sha256").update(password).digest("hex");

  try {
    // 사용자 계정 정보 조회
    const [userResults] = await dbConnect.query(
      "SELECT id, email, username, birthdate FROM users WHERE email = ? AND password = ?",
      [email, hashedPassword]
    );

    if (userResults.length === 0) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const user = userResults[0];
    const { accessToken, refreshToken } = generateTokens(user);

    // 사용자 신체 정보 조회
    const [physicalInfoResults] = await dbConnect.query(
      `
      SELECT 
        current_weight, 
        target_weight, 
        height, 
        age, 
        gender, 
        activity_level, 
        goal_type, 
        basal_metabolic_rate AS bmr, 
        active_metabolic_rate AS amr, 
        target_basal_metabolic_rate AS target_bmr, 
        target_active_metabolic_rate AS target_amr, 
        bmi, 
        body_fat_percentage AS bfp
      FROM user_physical_info
      WHERE user_id = ?
      `,
      [user.id]
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
    });

    if (physicalInfoResults.length === 0) {
      // 신체 정보가 없는 경우
      return res.status(200).json({
        message: "Login successful. No physical information found.",
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          birthdate: user.birthdate,
        },
        hasPhysicalInfo: false,
      });
    }

    // 신체 정보가 있는 경우
    return res.status(200).json({
      message: "Login successful.",
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        birthdate: user.birthdate,
      },
      physicalInfo: physicalInfoResults[0],
      hasPhysicalInfo: true,
    });
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
  //console.log(userId);
 
  try {
    const [results] = await dbConnect.query(
      "SELECT id, email, username, birthdate FROM users WHERE id = ?",
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

const updateUserByToken = asyncHandler(async (req, res) => {
  const userId = req.user.id; // 인증된 사용자 ID 가져오기
  const { email, username, birthdate } = req.body; // 업데이트할 필드

  // 필수 데이터가 제공되지 않았을 경우
  if (!email && !username && !birthdate) {
    return res.status(400).json({ message: "At least one field to update is required." });
  }

  // 업데이트 필드 동적 생성
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

  values.push(userId); // ID는 마지막 값으로 추가

  try {
    // 업데이트 쿼리 실행
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
  const userId = req.user.id; // 인증된 사용자 ID 가져오기
  const { currentPassword, newPassword, confirmNewPassword } = req.body;

  // 입력 값 검증
  if (!currentPassword || !newPassword || !confirmNewPassword) {
    return res.status(400).json({ message: "All fields are required." });
  }

  if (newPassword !== confirmNewPassword) {
    return res.status(400).json({ message: "New passwords do not match." });
  }

  const hashedCurrentPassword = crypto.createHash("sha256").update(currentPassword).digest("hex");

  try {
    // 현재 비밀번호 검증
    const [userResults] = await dbConnect.query(
      "SELECT password FROM users WHERE id = ?",
      [userId]
    );

    if (userResults.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const user = userResults[0];

    if (user.password !== hashedCurrentPassword) {
      return res.status(401).json({ message: "Current password is incorrect." });
    }

    // 새로운 비밀번호 해싱
    const hashedNewPassword = crypto.createHash("sha256").update(newPassword).digest("hex");

    // 비밀번호 업데이트
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

 module.exports = { Login, getUserById, registerUser, getUserByToken, updateUserByToken, changePassword };