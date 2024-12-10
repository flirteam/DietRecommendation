const jwt = require("jsonwebtoken");

// JWT 생성 함수
const generateTokens = (user) => {
  // Base64 디코딩된 Secret Key 사용
  const secretKey = Buffer.from(process.env.JWT_SECRET, "base64");

  // Access Token 생성
  const accessToken = jwt.sign(
    { id: user.id }, // Payload에 사용자 ID 추가
    secretKey, // Base64 디코딩된 Secret Key
    {
      algorithm: "HS384", // HS384 알고리즘
      expiresIn: parseInt(process.env.JWT_EXPIRES_IN), // 유효 기간
    }
  );

  // Refresh Token 생성
  const refreshToken = jwt.sign(
    { id: user.id }, // Refresh Token에 사용자 ID 추가
    secretKey, // Base64 디코딩된 Secret Key
    {
      algorithm: "HS384", // HS384 알고리즘
      expiresIn: parseInt(process.env.JWT_EXPIRES_IN), // 유효 기간
    }
  );

  return { accessToken, refreshToken };
};

// 토큰 검증 함수
const verifyToken = (token) => {
  try {
    const secretKey = Buffer.from(process.env.JWT_SECRET, "base64"); // Base64 디코딩
    const decoded = jwt.verify(token, secretKey, { algorithms: ["HS384"] });
    console.log("Decoded Token:", decoded);
    return decoded;
  } catch (err) {
    console.error("Token verification failed:", err.message);
    return null;
  }
};

module.exports = { generateTokens, verifyToken };
