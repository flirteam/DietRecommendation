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

// 음식 선택 로직
const selectFood = (foods, carbTarget, proteinTarget, fatTarget, portionFactor) => {
    foods.forEach(item => {
        item.score = Math.abs(item.carbs - carbTarget) +
                     Math.abs(item.protein - proteinTarget) +
                     Math.abs(item.fat - fatTarget);
    });

    // 상위 음식 중 선택
    const bestFoods = foods.sort((a, b) => a.score - b.score).slice(0, 10);
    const selected = bestFoods[Math.floor(Math.random() * bestFoods.length)];

    // 포션 계산 (칼로리에 딱 맞춤)
    const portion = (portionFactor / selected.calories) * 100;

    return {
        food_name: selected.name,
        portion: Math.round(portion * 100) / 100, // 소수점 2자리까지 반올림
        carb: Math.round(selected.carbs * (portion / 100) * 100) / 100,
        protein: Math.round(selected.protein * (portion / 100) * 100) / 100,
        fat: Math.round(selected.fat * (portion / 100) * 100) / 100,
        calories: Math.round(selected.calories * (portion / 100) * 100) / 100
    };
};


// 식단 추천 로직
const recommendDiet = (calorieTarget, foodData, carbTarget, proteinTarget, fatTarget) => {
    const mealRatios = {
        breakfast: 0.2,
        lunch: 0.35,
        snack: 0.15,
        dinner: 0.3
    };

    let recommendedMeals = {};
    let usedFoods = [];

    for (const meal in mealRatios) {
        const ratio = mealRatios[meal];
        const mealCalories = calorieTarget * ratio;
        const mealCarbTarget = carbTarget * ratio;
        const mealProteinTarget = proteinTarget * ratio;
        const mealFatTarget = fatTarget * ratio;

        let selectedMeal = null;

        if (meal === "snack") {
            // 간식은 디저트류에서만 선택
            const snacks = foodData.filter(item => classifyFood(item) === "디저트류" && !usedFoods.includes(item.name));
            if (snacks.length > 0) {
                selectedMeal = selectFood(snacks, mealCarbTarget, mealProteinTarget, mealFatTarget, mealCalories);
            } else {
                recommendedMeals[meal] = { message: "No suitable snack found" };
                continue;
            }
        } else if (meal === "lunch" && Math.random() < 0.5) {
            // 점심은 50% 확률로 브런치류 선택
            const brunchFoods = foodData.filter(item => classifyFood(item) === "브런치류" && !usedFoods.includes(item.name));
            if (brunchFoods.length > 0) {
                selectedMeal = selectFood(brunchFoods, mealCarbTarget, mealProteinTarget, mealFatTarget, mealCalories);
                recommendedMeals[meal] = { brunch: selectedMeal };
                usedFoods.push(selectedMeal.food_name);
                continue;
            }
        } else {
            // 기본 로직 (밥류 + 요리류 + 반찬류)
            const riceFoods = foodData.filter(item => classifyFood(item) === "밥류" && !usedFoods.includes(item.name));
            const mainDishes = foodData.filter(item => classifyFood(item) === "요리류" && !usedFoods.includes(item.name));
            const sideDishes = foodData.filter(item => classifyFood(item) === "반찬류" && !usedFoods.includes(item.name));

            if (riceFoods.length > 0 && mainDishes.length > 0 && sideDishes.length > 0) {
                const rice = selectFood(riceFoods, mealCarbTarget * 0.5, mealProteinTarget * 0.5, 0, mealCalories * 0.5);
                const main = selectFood(mainDishes, 0, mealProteinTarget * 0.4, mealFatTarget * 0.4, mealCalories * 0.4);
                const side = selectFood(sideDishes, mealCarbTarget * 0.1, mealProteinTarget * 0.1, mealFatTarget * 0.1, mealCalories * 0.1);

                selectedMeal = { rice, main_dish: main, side_dish: side };
            } else {
                recommendedMeals[meal] = { message: `No suitable food found for ${meal}` };
                continue;
            }
        }

        recommendedMeals[meal] = selectedMeal;
        usedFoods.push(
            ...(
                Array.isArray(selectedMeal) 
                ? selectedMeal.map(item => item.food_name) 
                : [selectedMeal.food_name]
            )
        );
    }

    return recommendedMeals;
};

// BMI 수치에 따른 AMR 조정
const adjustAMRBasedOnBMI = (amr, bmi) => {
    if (bmi < 18.5) return amr * 1.1;
    if (bmi >= 18.5 && bmi < 23) return amr;
    if (bmi >= 23) return amr * 0.9;
    return amr;
};

// 맞춤 식단 생성
async function getCustomDiet(userInfo) {
    try {
        const { target_active_metabolic_rate, bmi, goal_type } = userInfo;
        const ratios = goalRatios[goal_type];
        if (!ratios) throw new Error(`Invalid goal type: ${goal_type}`);

        const adjustedAMR = adjustAMRBasedOnBMI(target_active_metabolic_rate, bmi);
        const carbTarget = (adjustedAMR * ratios.carb_ratio) / 4;
        const proteinTarget = (adjustedAMR * ratios.protein_ratio) / 4;
        const fatTarget = (adjustedAMR * ratios.fat_ratio) / 9;

        const foodData = await getFoodData();
        const recommendedDiet = recommendDiet(adjustedAMR, foodData, carbTarget, proteinTarget, fatTarget);

        return {
            user_info: {
                ...userInfo,
                target_amr: adjustedAMR,
                carb_target: carbTarget.toFixed(2),
                protein_target: proteinTarget.toFixed(2),
                fat_target: fatTarget.toFixed(2)
            },
            recommended_diet: recommendedDiet
        };
    } catch (error) {
        throw new Error(`Error generating custom diet: ${error.message}`);
    }
}

module.exports = { getCustomDiet };
