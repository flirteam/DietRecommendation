const asyncHandler = require("express-async-handler");
const dbConnect = require("../config/dbConnect");
const { calculateBMR, calculateAMR, calculateBMI, calculateBFP } = require("../utils/healthUtils");

// @desc Get user info
// @route GET /info
const getUserInfo = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  try {
    const [results] = await dbConnect.query(
      `
      SELECT 
        u.username, 
        upi.current_weight, 
        upi.target_weight, 
        upi.height, 
        upi.age, 
        upi.gender, 
        upi.activity_level, 
        upi.goal_type,
        upi.basal_metabolic_rate AS bmr,
        upi.active_metabolic_rate AS amr,
        upi.target_basal_metabolic_rate AS target_bmr,
        upi.target_active_metabolic_rate AS target_amr,
        upi.bmi,
        upi.body_fat_percentage AS bfp
      FROM user_physical_info upi
      INNER JOIN users u ON upi.user_id = u.id
      WHERE upi.user_id = ?
      `,
      [userId]
    );

    if (results.length === 0) {
      return res.status(404).json({ message: "User information not found." });
    }

    res.status(200).json({ userInfo: results[0] });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ message: "Server error." });
  }
});

// @desc Get user info by user ID
// @utility function
// 유틸리티 함수이기 때문에 클라이언트에서는 사용하지 않음.
const getUserInfoById = asyncHandler(async (userId) => {
  const [results] = await dbConnect.query(
      `
      SELECT 
          u.username, 
          upi.current_weight, 
          upi.target_weight, 
          upi.height, 
          upi.age, 
          upi.gender, 
          upi.activity_level, 
          upi.goal_type,
          upi.basal_metabolic_rate AS bmr,
          upi.active_metabolic_rate AS amr,
          upi.target_basal_metabolic_rate AS target_bmr,
          upi.target_active_metabolic_rate AS target_amr,
          upi.bmi,
          upi.body_fat_percentage AS bfp
      FROM user_physical_info upi
      INNER JOIN users u ON upi.user_id = u.id
      WHERE upi.user_id = ?
      `,
      [userId]
  );

  if (results.length === 0) {
      throw new Error("User information not found");
  }

  return results[0]; // 데이터를 반환
});


// @desc Add user info
// @route POST /info
const addUserInfo = asyncHandler(async (req, res) => {
  const { current_weight, target_weight, height, age, gender, activity_level, goal_type } = req.body;
  const userId = req.user.id;

  try {
    const [existing] = await dbConnect.query(
      "SELECT id FROM user_physical_info WHERE user_id = ?",
      [userId]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        message: "User information already exists. Please use PUT /info to update."
      });
    }

    const bmr = calculateBMR(current_weight, height, age, gender);
    const amr = calculateAMR(bmr, activity_level);
    const bmi = calculateBMI(current_weight, height);
    const bfp = calculateBFP(bmi, age, gender);

    const targetBmr = calculateBMR(target_weight, height, age, gender);
    const targetAmr = calculateAMR(targetBmr, activity_level);

    await dbConnect.query(
      `
      INSERT INTO user_physical_info (
        user_id, current_weight, target_weight, height, age, gender, 
        activity_level, goal_type, basal_metabolic_rate, active_metabolic_rate,
        target_basal_metabolic_rate, target_active_metabolic_rate, bmi, body_fat_percentage
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [userId, current_weight, target_weight, height, age, gender, activity_level, goal_type, bmr, amr, targetBmr, targetAmr, bmi, bfp]
    );

    res.status(201).json({ message: "User information added successfully." });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ message: "Server error." });
  }
});

// @desc Update user info
// @route PUT /info
const updateUserInfo = asyncHandler(async (req, res) => {
  const { current_weight, target_weight, height, age, gender, activity_level, goal_type } = req.body;
  const userId = req.user.id;

  try {
    const [existing] = await dbConnect.query(
      "SELECT id FROM user_physical_info WHERE user_id = ?",
      [userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        message: "User information not found. Please use POST /info to create."
      });
    }

    const bmr = calculateBMR(current_weight, height, age, gender);
    const amr = calculateAMR(bmr, activity_level);
    const bmi = calculateBMI(current_weight, height);
    const bfp = calculateBFP(bmi, age, gender);

    const targetBmr = calculateBMR(target_weight, height, age, gender);
    const targetAmr = calculateAMR(targetBmr, activity_level);

    await dbConnect.query(
      `
      UPDATE user_physical_info 
      SET current_weight = ?, target_weight = ?, height = ?, 
          age = ?, gender = ?, activity_level = ?, goal_type = ?, 
          basal_metabolic_rate = ?, active_metabolic_rate = ?, 
          target_basal_metabolic_rate = ?, target_active_metabolic_rate = ?,
          bmi = ?, body_fat_percentage = ?
      WHERE user_id = ?
      `,
      [current_weight, target_weight, height, age, gender, activity_level, goal_type, bmr, amr, targetBmr, targetAmr, bmi, bfp, userId]
    );

    res.status(200).json({ message: "User information updated successfully." });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ message: "Server error." });
  }
});

module.exports = { getUserInfo, getUserInfoById, addUserInfo, updateUserInfo };
