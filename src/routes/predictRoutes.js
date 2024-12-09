const express = require("express");
const { handlePredictionRequest } = require("../controllers/predictController");
const { authenticateToken } = require("../middlewares/loginMiddleware");

const router = express.Router();

/**
 * @route POST /api/predict
 * @desc Predict the number of days to reach the user's goal
 * @access Protected
 */
router.post("/", authenticateToken, handlePredictionRequest);

module.exports = router;
