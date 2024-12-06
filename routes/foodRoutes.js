const express = require('express');
const { 
  getFoodsByCategory, 
  getFoodDetailsById, 
  getFoodRecommendation 
} = require('../controllers/foodController');
const { authenticateToken } = require('../middlewares/loginMiddleware');
const router = express.Router();

/**
 * 카테고리별 음식 데이터 조회 API
 * GET /api/food/category/:category/:dietType
 * @param category - 음식 카테고리 (예: 밥류, 국 및 탕류, 구이류 등)
 * @param dietType - 식단 유형 (protein, fat, calories)
 * @query page - 페이지 번호 (기본값: 1)
 * @query limit - 페이지당 항목 수 (기본값: 100)
 * @query sortBy - 정렬 순서 (예: "ASC" 또는 "DESC", 기본값: "DESC")
 */
router.get('/category/:category/:dietType', authenticateToken, getFoodsByCategory);

/**
 * 특정 음식 상세정보 조회 API
 * GET /api/food/details/:id
 * @param id - 음식 고유 ID
 */
router.get('/details/:id', authenticateToken, getFoodDetailsById);

/**
 * 맞춤 식단 추천 API
 * GET /api/food/meal/:mealTime/recommendation
 * @param mealTime - 식사 시간 (breakfast, lunch, dinner, snack)
 */
router.get('/meal/:mealTime/recommendation', authenticateToken, getFoodRecommendation);

module.exports = router;
