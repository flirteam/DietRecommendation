const express = require("express");
const { addUserInfo, getUserInfo, updateUserInfo } = require("../controllers/userInfoController");
const { authenticateToken } = require("../middlewares/loginMiddleware");

const router = express.Router();

// 사용자 정보 불러오기 요청 처리
router.get("/info", authenticateToken, getUserInfo);

// 사용자 정보 추가 요청 처리
router.post("/info", authenticateToken, addUserInfo);

// 사용자 정보 수정 요청 처리
router.put("/info", authenticateToken, updateUserInfo);

module.exports = router;
