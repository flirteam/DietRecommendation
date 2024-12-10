const mysql = require('mysql2/promise');
require('dotenv').config();
const dbConnect = require("../config/dbConnect");
const classifyFood = require("../utils/classifyFood");

// DB에서 음식 데이터 가져오기
async function getFoodData() {
    const query = `
        SELECT 
            name,
            category,
            calories,
            carbs,
            protein,
            fat,
            serving_size
        FROM foods
    `;

    try {
        const [results] = await dbConnect.query(query);
        return results;
    } catch (error) {
        throw new Error(`Error fetching food data: ${error.message}`);
    }
}

// 목표별 영양소 비율
const goalRatios = {
  "저지방 고단백": { carb_ratio: 0.4, protein_ratio: 0.4, fat_ratio: 0.2 },
  "균형 식단": { carb_ratio: 0.5, protein_ratio: 0.3, fat_ratio: 0.2 },
  "벌크업": { carb_ratio: 0.6, protein_ratio: 0.3, fat_ratio: 0.1 }
};

const recommendDiet = (calorieTarget, foodData, carbTarget, proteinTarget, fatTarget) => {
    const mealRatios = {
        "breakfast": 0.3,
        "lunch": 0.35,
        "snack": 0.15, // 간식 비율
        "dinner": 0.2
    };
    
    let recommendedMeals = {};
    let usedFoods = []; // 이미 선택된 음식을 저장하는 리스트
    
    for (const meal in mealRatios) {
        const ratio = mealRatios[meal];
        const mealCalories = calorieTarget * ratio;
        const mealCarbTarget = carbTarget * ratio;
        const mealProteinTarget = proteinTarget * ratio;
        const mealFatTarget = fatTarget * ratio;

        if (meal === "snack") {
            // 간식은 디저트류에서만 선택
            const dessertFood = foodData.filter(item => classifyFood(item) === '디저트류' && !usedFoods.includes(item.name));
            
            if (dessertFood.length > 0) {
                dessertFood.forEach(item => {
                    item.score = Math.abs(item.carbs - mealCarbTarget) +
                                 Math.abs(item.protein - mealProteinTarget) +
                                 Math.abs(item.fat - mealFatTarget);
                });

                // 상위 5개 음식 중 랜덤 선택
                dessertFood.sort((a, b) => a.score - b.score);
                const selectedFood = dessertFood.slice(0, 5)[Math.floor(Math.random() * 5)];
                const portion = (mealCalories / selectedFood.calories) * 100;

                recommendedMeals[meal] = {
                    "food_name": selectedFood.name,
                    "portion": Math.round(portion * 100) / 100,
                    "carb": Math.round(selectedFood.carbs * (portion / 100) * 100) / 100,
                    "protein": Math.round(selectedFood.protein * (portion / 100) * 100) / 100,
                    "fat": Math.round(selectedFood.fat * (portion / 100) * 100) / 100,
                    "calories": Math.round(selectedFood.calories * (portion / 100) * 100) / 100
                };
                usedFoods.push(selectedFood.name);
            } else {
                recommendedMeals[meal] = { "message": "No suitable snack found" };
            }
        } else {
            // 다른 식사 (밥류 + 요리류 + 반찬류)
            const riceFood = foodData.filter(item => classifyFood(item) === '밥류' && !usedFoods.includes(item.name));
            const mainDish = foodData.filter(item => classifyFood(item) === '요리류' && !usedFoods.includes(item.name));
            const sideDish = foodData.filter(item => classifyFood(item) === '반찬류' && !usedFoods.includes(item.name));

            if (riceFood.length > 0 && mainDish.length > 0 && sideDish.length > 0) {
                // 밥류 선택 (50%)
                riceFood.forEach(item => {
                    item.score = Math.abs(item.carbs - (mealCarbTarget * 0.5)) + 
                                 Math.abs(item.protein - (mealProteinTarget * 0.5));
                });
                const rice = riceFood.sort((a, b) => a.score - b.score).slice(0, 5)[Math.floor(Math.random() * 5)];

                // 요리류 선택 (40%)
                mainDish.forEach(item => {
                    item.score = Math.abs(item.protein - (mealProteinTarget * 0.4)) + 
                                 Math.abs(item.fat - (mealFatTarget * 0.4));
                });
                const main = mainDish.sort((a, b) => a.score - b.score).slice(0, 5)[Math.floor(Math.random() * 5)];

                // 반찬류 선택 (10%)
                sideDish.forEach(item => {
                    item.score = Math.abs(item.carbs - (mealCarbTarget * 0.1)) + 
                                 Math.abs(item.protein - (mealProteinTarget * 0.1)) +
                                 Math.abs(item.fat - (mealFatTarget * 0.1));
                });
                const side = sideDish.sort((a, b) => a.score - b.score).slice(0, 5)[Math.floor(Math.random() * 5)];

                // 음식별 비율 계산
                const ricePortion = (mealCalories * 0.5 / rice.calories) * 100;
                const mainPortion = (mealCalories * 0.4 / main.calories) * 100;
                const sidePortion = (mealCalories * 0.1 / side.calories) * 100;

                recommendedMeals[meal] = {
                    "rice": {
                        "food_name": rice.name,
                        "portion": Math.round(ricePortion * 100) / 100,
                        "carb": Math.round(rice.carbs * (ricePortion / 100) * 100) / 100,
                        "protein": Math.round(rice.protein * (ricePortion / 100) * 100) / 100,
                        "fat": Math.round(rice.fat * (ricePortion / 100) * 100) / 100,
                        "calories": Math.round(rice.calories * (ricePortion / 100) * 100) / 100
                    },
                    "main_dish": {
                        "food_name": main.name,
                        "portion": Math.round(mainPortion * 100) / 100,
                        "carb": Math.round(main.carbs * (mainPortion / 100) * 100) / 100,
                        "protein": Math.round(main.protein * (mainPortion / 100) * 100) / 100,
                        "fat": Math.round(main.fat * (mainPortion / 100) * 100) / 100,
                        "calories": Math.round(main.calories * (mainPortion / 100) * 100) / 100
                    },
                    "side_dish": {
                        "food_name": side.name,
                        "portion": Math.round(sidePortion * 100) / 100,
                        "carb": Math.round(side.carbs * (sidePortion / 100) * 100) / 100,
                        "protein": Math.round(side.protein * (sidePortion / 100) * 100) / 100,
                        "fat": Math.round(side.fat * (sidePortion / 100) * 100) / 100,
                        "calories": Math.round(side.calories * (sidePortion / 100) * 100) / 100
                    }
                };
                usedFoods.push(rice.name);
                usedFoods.push(main.name);
                usedFoods.push(side.name);
            } else {
                recommendedMeals[meal] = { "message": `No suitable food found for ${meal}` };
            }
        }
    }

    return recommendedMeals;
};


// BMI 수치에 따른 AMR 조정
function adjustAMRBasedOnBMI(amr, bmi) {
    if (bmi < 18.5) {
        // 저체중: AMR을 1.1배 증가
        return amr * 1.1;
    } else if (bmi >= 18.5 && bmi < 23) {
        // 정상체중: AMR 그대로 유지
        return amr;
    } else if (bmi >= 23 && bmi < 25) {
        // 과체중: AMR을 0.9배 감소
        return amr * 0.9;
    } else {
        // 비만: AMR을 0.9배 감소
        return amr * 0.9;
    }
}

async function getCustomDiet(userInfo) {
    try {
        const { current_weight, target_weight, height, age, gender, activity_level, goal_type, target_active_metabolic_rate, bmi } = userInfo;

        // 목표 식단에 따른 영양소 비율 (goalRatios는 외부에서 미리 정의된 값이라 가정)
        if (!goalRatios[goal_type]) {
            throw new Error(`Invalid goal type: ${goal_type}`);
        }

        const ratios = goalRatios[goal_type];
        const carb_ratio = ratios.carb_ratio;
        const protein_ratio = ratios.protein_ratio;
        const fat_ratio = ratios.fat_ratio;

        // 목표 체중에 따른 AMR (활동 수준에 따른 조정된 AMR)
        const adjustedTargetAMR = adjustAMRBasedOnBMI(target_active_metabolic_rate, bmi);

        // 영양소 목표 계산
        const carb_target = Math.round((adjustedTargetAMR * carb_ratio) / 4).toFixed(2); // 탄수화물 (g)
        const protein_target = Math.round((adjustedTargetAMR * protein_ratio) / 4).toFixed(2); // 단백질 (g)
        const fat_target = Math.round((adjustedTargetAMR * fat_ratio) / 9).toFixed(2); // 지방 (g)

        // DB에서 음식 데이터를 가져옴
        const foodData = await getFoodData();

        // 추천 식단 생성
        const recommendedDiet = recommendDiet(adjustedTargetAMR, foodData, carb_target, protein_target, fat_target);

        // 최종 결과 반환
        return {
            user_info: {
                current_weight: current_weight,
                target_weight: target_weight,
                height: height,
                age: age,
                gender: gender,
                activity_level: activity_level,
                goal_type: goal_type,
                current_bmi: bmi,
                target_amr: adjustedTargetAMR,
                carb_target: carb_target,
                protein_target: protein_target,
                fat_target: fat_target,
            },
            recommended_diet: recommendedDiet
        };

    } catch (error) {
        throw new Error(`Error generating custom diet: ${error.message}`);
    }
}

module.exports = { getCustomDiet };