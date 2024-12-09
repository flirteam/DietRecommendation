const jwt = require("jsonwebtoken"); // JSON Web Token 라이브러리 로드
require("dotenv").config(); // .env 파일에서 환경 변수를 로드

// JWT 인증 미들웨어 함수 정의
exports.authenticateToken = (req, res, next) => {
  // Authorization 헤더에서 Bearer 토큰 추출
  const token = req.headers.authorization?.split(" ")[1];

  // 토큰이 없는 경우 401 Unauthorized 응답 반환
  if (!token) {
    return res.status(401).json({ message: "Token is required." });
  }

  try {
    // JWT 토큰 검증 및 디코딩
    const user = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS384"] }); // Access Token을 검증

    // 복호화된 결과 출력 (콘솔)
    console.log("Decoded JWT payload:", user);

    req.user = user; // 검증된 사용자 정보를 요청 객체(req)에 추가
    next(); // 다음 미들웨어 또는 컨트롤러로 요청 흐름을 전달
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      // 토큰 만료 에러 처리
      return res.status(401).json({ message: "Access token expired." });
    }
    // 기타 JWT 관련 에러 처리
    console.error("JWT verification error:", error.message);
    res.status(403).json({ message: "Invalid token." });
  }
};
