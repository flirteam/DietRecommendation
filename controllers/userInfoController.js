const asyncHandler = require("express-async-handler");
const dbConnect = require("../config/dbConnect");

// 활동 수준 계수
const ACTIVITY_LEVEL_FACTORS = {
  1: 1.2,   // 거의 활동 없음
  2: 1.375, // 가벼운 활동
  3: 1.55,  // 보통 활동
  4: 1.725  // 매우 활동적
};

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

    // BMR, AMR, BMI, BFP 계산
    const bmr = calculateBMR(current_weight, height, age, gender);
    const amr = calculateAMR(bmr, activity_level);
    const bmi = calculateBMI(current_weight, height);
    const bfp = calculateBFP(bmi, age, gender);

    // 목표 BMR, AMR 계산
    const targetBmr = calculateBMR(target_weight, height, age, gender);
    const targetAmr = calculateAMR(targetBmr, activity_level);

    console.log("SQL Query:", {
      userId, 
      current_weight, 
      target_weight, 
      height, 
      age, 
      gender, 
      activity_level, 
      goal_type, 
      bmr, 
      amr, 
      targetBmr, 
      targetAmr, 
      bmi, 
      bfp
    });

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

    // BMR, AMR, BMI, BFP 계산
    const bmr = calculateBMR(current_weight, height, age, gender);
    const amr = calculateAMR(bmr, activity_level);
    const bmi = calculateBMI(current_weight, height);
    const bfp = calculateBFP(bmi, age, gender);

    // 목표 BMR, AMR 계산
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

// Helper functions
const calculateBMR = (weight, height, age, gender) => {
  if (gender === "Male") {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
};

const calculateAMR = (bmr, activityLevel) => {
  return bmr * ACTIVITY_LEVEL_FACTORS[activityLevel];
};

const calculateBMI = (weight, height) => {
  return weight / ((height / 100) ** 2);
};

const calculateBFP = (bmi, age, gender) => {
  if (gender === "Male") {
    return (1.20 * bmi) + (0.23 * age) - 16.2;
  } else {
    return (1.20 * bmi) + (0.23 * age) - 5.4;
  }
};

module.exports = { addUserInfo, getUserInfo, updateUserInfo };
