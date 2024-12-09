// healthUtils.js

const ACTIVITY_LEVEL_FACTORS = {
    1: 1.2,   // 거의 활동 없음
    2: 1.375, // 가벼운 활동
    3: 1.55,  // 보통 활동
    4: 1.725  // 매우 활동적
  };
  
  /**
   * Basal Metabolic Rate (BMR) 계산
   * @param {number} weight - 몸무게 (kg)
   * @param {number} height - 키 (cm)
   * @param {number} age - 나이 (years)
   * @param {string} gender - 성별 ("Male" or "Female")
   * @returns {number} - BMR
   */
  const calculateBMR = (weight, height, age, gender) => {
    if (gender === "Male") {
      return 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      return 10 * weight + 6.25 * height - 5 * age - 161;
    }
  };
  
  /**
   * Active Metabolic Rate (AMR) 계산
   * @param {number} bmr - BMR 값
   * @param {number} activityLevel - 활동 수준 (1 ~ 4)
   * @returns {number} - AMR
   */
  const calculateAMR = (bmr, activityLevel) => {
    return bmr * ACTIVITY_LEVEL_FACTORS[activityLevel];
  };
  
  /**
   * Body Mass Index (BMI) 계산
   * @param {number} weight - 몸무게 (kg)
   * @param {number} height - 키 (cm)
   * @returns {number} - BMI
   */
  const calculateBMI = (weight, height) => {
    return weight / ((height / 100) ** 2);
  };
  
  /**
   * Body Fat Percentage (BFP) 계산
   * @param {number} bmi - BMI 값
   * @param {number} age - 나이 (years)
   * @param {string} gender - 성별 ("Male" or "Female")
   * @returns {number} - BFP
   */
  const calculateBFP = (bmi, age, gender) => {
    if (gender === "Male") {
      return (1.20 * bmi) + (0.23 * age) - 16.2;
    } else {
      return (1.20 * bmi) + (0.23 * age) - 5.4;
    }
  };
  
  module.exports = { calculateBMR, calculateAMR, calculateBMI, calculateBFP };
  