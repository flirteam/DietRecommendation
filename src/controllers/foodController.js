const dbConnect = require("../config/dbConnect");
const { getCustomDiet } = require("../utils/foodRecommendation");

// 식단 유형별 기본 정렬 조건
const DIET_SORTS = {
  protein: "protein", // 단백질 식단
  fat: "fat",      // 저지방 식단
  calories: "calories" // 저칼로리 식단
};

// 허용된 정렬 순서
const ALLOWED_SORT_ORDERS = ["ASC", "DESC"];

/**
 * 특정 카테고리의 음식 데이터를 반환 (리스트 + 상세 정보)
 */
const getFoodsByCategory = async (req, res) => {
  const { category, dietType } = req.params;
  const { page = 1, limit = 100, sortBy = "DESC" } = req.query;

  try {
    const offset = (page - 1) * limit;

    // dietType 검증 및 기본 정렬 필드 설정
    const sortField = DIET_SORTS[dietType];
    if (!sortField) {
      return res.status(400).json({ success: false, message: "Invalid dietType parameter" });
    }

    // 정렬 순서 검증
    const sortOrder = ALLOWED_SORT_ORDERS.includes(sortBy.toUpperCase()) ? sortBy.toUpperCase() : "DESC";

    // SQL 쿼리
    const query = `
      SELECT 
        id,
        name,
        category,
        calories,
        protein,
        carbs,
        fat,
        sugar,
        serving_size
      FROM foods
      WHERE category = ?
      ORDER BY ${sortField} ${sortOrder}
      LIMIT ? OFFSET ?
    `;

    const [foods] = await dbConnect.query(query, [category, parseInt(limit), offset]);

    if (foods.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No foods found for category '${category}' with dietType '${dietType}'`
      });
    }

    res.json({
      success: true,
      data: foods.map(food => ({
        id: food.id,
        name: food.name,
        category: food.category,
        details: {
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
          sugar: food.sugar,
          serving_size: food.serving_size
        }
      }))
    });
  } catch (error) {
    console.error("Error fetching foods by category:", error);
    res.status(500).json({
      success: false,
      message: "서버 에러가 발생했습니다."
    });
  }
};

/**
 * 특정 음식 상세 정보를 반환
 */
const getFoodDetailsById = async (req, res) => {
  const { id } = req.params;

  try {
    const query = `
      SELECT 
        id,
        name,
        category,
        calories,
        protein,
        carbs,
        fat,
        sugar,
        serving_size
      FROM foods
      WHERE id = ?
    `;
    const [result] = await dbConnect.query(query, [id]);

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "해당 ID에 대한 음식 데이터를 찾을 수 없습니다."
      });
    }

    res.json({
      success: true,
      data: result[0]
    });
  } catch (error) {
    console.error("Error fetching food details:", error);
    res.status(500).json({
      success: false,
      message: "서버 에러가 발생했습니다."
    });
  }
};

/**
 * 맞춤 식단 추천 API
 */
const getFoodRecommendation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { mealTime } = req.params;

    // 사용자 신체 정보 조회
    const [userInfoResults] = await dbConnect.query(
      "SELECT current_weight, target_weight, height, age, gender, activity_level, goal_type, target_active_metabolic_rate, bmi FROM user_physical_info WHERE user_id = ?",
      [userId]
    );

    if (userInfoResults.length === 0) {
      return res.status(404).json({
        success: false,
        message: "사용자 신체 정보를 찾을 수 없습니다."
      });
    }

    const userInfo = userInfoResults[0];
    const dietRecommendation = await getCustomDiet(userInfo);

    // 요청된 식사 시간에 맞는 식단만 반환
    const selectedMeal = dietRecommendation.recommended_diet[mealTime];

    if (!selectedMeal) {
      return res.status(404).json({
        success: false,
        message: "해당 시간대의 추천 식단이 없습니다."
      });
    }

    res.status(200).json({
      success: true,
      data: {
        mealTime: mealTime,
        recommended_diet: selectedMeal
      }
    });
  } catch (error) {
    console.error("Error fetching food recommendation:", error);
    res.status(500).json({
      success: false,
      message: "서버 에러가 발생했습니다."
    });
  }
};

module.exports = {
  getFoodsByCategory,
  getFoodDetailsById,
  getFoodRecommendation
};
