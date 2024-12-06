const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const { generateTokens } = require("../utils/tokenUtils");
require("dotenv").config();

exports.refreshTokenHandler = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken; // 쿠키에서 Refresh Token 가져옴
  if (!refreshToken) {
    return res.status(401).json({ message: "Refresh token is required." });
  }

  try {
    // Refresh Token 검증
    const user = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // 새로운 Access Token 및 Refresh Token 생성
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    // 새 Refresh Token을 쿠키에 저장
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
    });

    // 새 Access Token 반환
    return res.status(200).json({ accessToken });
  } catch (error) {
    console.error("Refresh token verification error:", error.message);
    return res.status(403).json({ message: "Invalid refresh token." });
  }
});
