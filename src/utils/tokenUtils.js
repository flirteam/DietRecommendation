const jwt = require("jsonwebtoken");

// JWT 생성 함수
const generateTokens = (user) => {
  // Access Token 생성
  const accessToken = jwt.sign(
    { id: user.id }, // Payload 최소화
    process.env.JWT_SECRET,
    {
      algorithm: "HS384", // 알고리즘을 HS384로 설정
      expiresIn: process.env.JWT_EXPIRES_IN // 유효 기간을 환경 변수에서 가져옴
    }
  );

  // Refresh Token 생성
  const refreshToken = jwt.sign(
    { id: user.id }, // Refresh Token에도 최소한의 데이터만 포함
    process.env.JWT_REFRESH_SECRET,
    {
      algorithm: "HS384", // 알고리즘을 HS384로 설정
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN
    }
  );

  return { accessToken, refreshToken };
};

module.exports = { generateTokens };
