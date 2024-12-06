const express = require("express");
const { Login, getUserById, registerUser, getUserByToken, updateUserByToken } = require("../controllers/loginController");
const { authenticateToken } = require("../middlewares/loginMiddleware");

const router = express.Router();

// 로그인 요청 처리 (미들웨어 없음)
router.post("/", Login);

// 로그인 유저 정보 조회 처리 (미들웨어 추가)
router.get("/getLoginUser", authenticateToken, getUserByToken);

router.put("/updateLoginUser", authenticateToken, updateUserByToken);

// 동적 id 파라미터 라우트는 나중에 배치
router.get("/:id", getUserById);

// 회원가입 요청 처리 (미들웨어 없음)
router.post("/register", registerUser);

module.exports = router;