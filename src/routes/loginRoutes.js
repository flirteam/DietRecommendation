const express = require("express");
const { 
  Login, 
  getUserById, 
  registerUser, 
  getUserByToken, 
  updateUserByToken, 
  changePassword,  
} = require("../controllers/loginController");
const { authenticateToken } = require("../middlewares/loginMiddleware");

const router = express.Router();

// 로그인 요청 처리, 사용자 정보 반환
router.post("/", Login);

// 로그인 유저 정보 조회 처리
router.get("/getLoginUser", authenticateToken, getUserByToken);

// 로그인 유저 정보 업데이트
router.put("/updateLoginUser", authenticateToken, updateUserByToken);

// 사용자 id 별 정보 요청, 디버깅용
router.get("/:id", getUserById);

// 회원가입 요청 처리
router.post("/register", registerUser);

// 비밀번호 변경
router.put("/changePassword", authenticateToken, changePassword);

module.exports = router;

