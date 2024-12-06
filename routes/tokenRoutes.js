const express = require("express");
const { refreshTokenHandler } = require("../controllers/tokenController");

const router = express.Router();

// Refresh Token API
router.post("/refresh", refreshTokenHandler);

module.exports = router;
