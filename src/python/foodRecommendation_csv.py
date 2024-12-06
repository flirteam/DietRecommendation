import pandas as pd
import json
import os

print(os.getcwd())  # 현재 작업 디렉토리 출력

# 데이터 로드, bmi가 담긴 사용자 정보 데이터는 사용안하고 신체 정보 테이블에서 읽어서 사용해봤음.
# 출력 시 나오는 userInfo가 사용자 신체 정보가 담긴 데이터, DB에서 읽어올 예정

#bmi_data_path = './python/Data/gender.csv'  # 사용자 데이터 경로
food_data_path = './python/Data/final_food_data.csv'  # 식품 데이터 경로

# 데이터 읽기
#bmi_data = pd.read_csv(bmi_data_path, encoding='utf-8')
food_data = pd.read_csv(food_data_path, encoding='utf-8')

# 식품 데이터 전처리
food_data['식품중량'] = food_data['식품중량'].str.replace('ml', 'g').str.replace('m', '').str.replace('g', '')
food_data['식품중량'] = pd.to_numeric(food_data['식품중량'], errors='coerce')
food_data = food_data.dropna(subset=['식품중량'])

# 음식 분류 함수
def classify_food(row):
    """
    음식 분류: 밥류, 국류, 반찬류, 디저트류 등으로 분류
    """
    if any(x in row['식품대분류명'] for x in ["밥류", "면 및 만두류"]):
        return "밥류"
    elif any(x in row['식품대분류명'] for x in ["국 및 탕류", "찌개 및 전골류"]):
        return "국류"
    elif any(x in row['식품대분류명'] for x in [
        "전·적 및 부침류", "조림류", "나물·숙채류", "튀김류", "구이류",
        "장류", "양념류", "찜류", "볶음류", "생채·무침류",
        "젓갈류", "김치류", "장아찌·절임류"]):
        return "반찬류"
    elif any(x in row['식품대분류명'] for x in [
        "빵 및 과자류", "음료 및 차류", "유제품류 및 빙과류", "샌드위치", "곡류, 서류 제품"]):
        return "디저트류"
    elif any(x in row['식품대분류명'] for x in ["브런치", "샌드위치"]):
        return "브런치류"
    else:
        return "기타"

# 음식 분류 열 추가
food_data['음식분류'] = food_data.apply(classify_food, axis=1)

# BMI 계산 함수
def calculate_bmi(weight, height):
    """
    BMI 계산 및 상태 반환
    """
    bmi = weight / ((height / 100) ** 2)  # 키를 cm에서 m로 변환하여 계산
    if bmi < 18.5:
        return '저체중', bmi
    elif 18.5 <= bmi < 23:
        return '정상체중', bmi
    elif 23 <= bmi < 25:
        return '과체중', bmi
    else:
        return '비만', bmi

# BMR 계산 함수 (Harris-Benedict 공식)
def calculate_bmr(weight, height, age, gender):
    """
    BMR(기초대사량) 계산
    """
    if gender == 'Male':
        return 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age)
    elif gender == 'Female':
        return 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age)
    else:
        raise ValueError("성별은 'Male' 또는 'Female'로 입력해야 합니다.")

# TDEE 계산 함수
def calculate_tdee(bmr, activity_level):
    """
    TDEE(Total Daily Energy Expenditure) 계산 함수
    """
    activity_level_mapping = {
        1: 1.2,
        2: 1.375,
        3: 1.55,
        4: 1.725,
    }

    if activity_level not in activity_level_mapping:
        raise ValueError("활동 수준은 1~4 사이의 정수여야 합니다.")

    activity_coefficient = activity_level_mapping[activity_level]
    return bmr * activity_coefficient

# 목표별 영양소 비율 설정
goal_ratios = {
    "저지방 고단백": {"carb_ratio": 0.4, "protein_ratio": 0.4, "fat_ratio": 0.2},
    "균형 식단": {"carb_ratio": 0.5, "protein_ratio": 0.3, "fat_ratio": 0.2},
    "벌크업": {"carb_ratio": 0.6, "protein_ratio": 0.3, "fat_ratio": 0.1},
}

# 식단 추천 함수 (식품별 섭취량 계산 포함)
def recommend_diet_with_portions(calorie_target, food_data, carb_target, protein_target, fat_target):
    """
    식단 추천: 목표 영양소 비율에 맞는 섭취량을 계산하여 반환
    Args:
        calorie_target (float): 하루 섭취 칼로리 목표
        food_data (DataFrame): 음식 데이터
        carb_target (float): 목표 탄수화물 섭취량 (g)
        protein_target (float): 목표 단백질 섭취량 (g)
        fat_target (float): 목표 지방 섭취량 (g)
    Returns:
        dict: 식사별 추천 식단 및 섭취량
    """
    meal_ratios = {"breakfast": 0.3, "lunch": 0.35, "snack": 0.15, "dinner": 0.2}
    recommended_meals = {}

    for meal, ratio in meal_ratios.items():
        meal_calories = calorie_target * ratio
        meal_carb_target = carb_target * ratio
        meal_protein_target = protein_target * ratio
        meal_fat_target = fat_target * ratio

        if meal == "snack":
            # 간식은 디저트류나 브런치류에서 선택
            snack_food = food_data[food_data['음식분류'].isin(['디저트류', '브런치류'])]
            if not snack_food.empty:
                selected_food = snack_food.sample(1).iloc[0]
                portion = min(meal_calories / selected_food['에너지(kcal)'] * 100, 100)  # 최대 100g 섭취 제한
                recommended_meals[meal] = {
                    "food_name": selected_food['식품명'],
                    "portion": round(portion, 2),
                    "carb": round(selected_food['탄수화물(g)'] * (portion / 100), 2),
                    "protein": round(selected_food['단백질(g)'] * (portion / 100), 2),
                    "fat": round(selected_food['지방(g)'] * (portion / 100), 2),
                    "calories": round(selected_food['에너지(kcal)'] * (portion / 100), 2)
                }
            else:
                recommended_meals[meal] = {"message": "No suitable snack found"}
        else:
            # 일반 식사는 밥류와 반찬류 조합
            rice_food = food_data[food_data['음식분류'] == '밥류']
            side_dish = food_data[food_data['음식분류'] == '반찬류']

            if not rice_food.empty and not side_dish.empty:
                rice = rice_food.sample(1).iloc[0]
                side = side_dish.sample(1).iloc[0]

                rice_portion = min(meal_calories * 0.6 / rice['에너지(kcal)'] * 100, 300)  # 최대 300g 섭취 제한
                side_portion = min(meal_calories * 0.4 / side['에너지(kcal)'] * 100, 200)  # 최대 200g 섭취 제한

                recommended_meals[meal] = {
                    "rice": {
                        "food_name": rice['식품명'],
                        "portion": round(rice_portion, 2),
                        "carb": round(rice['탄수화물(g)'] * (rice_portion / 100), 2),
                        "protein": round(rice['단백질(g)'] * (rice_portion / 100), 2),
                        "fat": round(rice['지방(g)'] * (rice_portion / 100), 2),
                        "calories": round(rice['에너지(kcal)'] * (rice_portion / 100), 2)
                    },
                    "side_dish": {
                        "food_name": side['식품명'],
                        "portion": round(side_portion, 2),
                        "carb": round(side['탄수화물(g)'] * (side_portion / 100), 2),
                        "protein": round(side['단백질(g)'] * (side_portion / 100), 2),
                        "fat": round(side['지방(g)'] * (side_portion / 100), 2),
                        "calories": round(side['에너지(kcal)'] * (side_portion / 100), 2)
                    }
                }
            else:
                recommended_meals[meal] = {"message": f"No suitable food found for {meal}"}

    return recommended_meals

# 사용자 맞춤 식단 추천
def get_custom_diet(user_info):
    """
    사용자 정보 기반 맞춤 식단 추천
    """
    current_weight = user_info['current_weight']
    target_weight = user_info['target_weight']
    height = user_info['height']
    age = user_info['age']
    gender = user_info['gender']
    activity_level = user_info['activity_level']
    goal_type = user_info['goal_type']  # 목표 식단 추가

    # 현재와 목표 BMR 및 TDEE 계산
    current_bmr = calculate_bmr(current_weight, height, age, gender)
    current_tdee = calculate_tdee(current_bmr, activity_level)

    target_bmr = calculate_bmr(target_weight, height, age, gender)
    target_tdee = calculate_tdee(target_bmr, activity_level)

    # 목표 식단의 영양소 비율 가져오기
    if goal_type not in goal_ratios:
        raise ValueError(f"'{goal_type}'은 유효하지 않은 목표 식단 타입입니다.")
    ratios = goal_ratios[goal_type]
    carb_ratio, protein_ratio, fat_ratio = ratios["carb_ratio"], ratios["protein_ratio"], ratios["fat_ratio"]

    # 영양소 목표 계산
    carb_target = round((target_tdee * carb_ratio) / 4, 2)  # g
    protein_target = round((target_tdee * protein_ratio) / 4, 2)  # g
    fat_target = round((target_tdee * fat_ratio) / 9, 2)  # g

    # 식단 추천 (목표 TDEE 기준)
    recommended_diet = recommend_diet_with_portions(target_tdee, food_data, carb_target, protein_target, fat_target)

    return {
        "user_info": {
            "current_weight": current_weight,
            "target_weight": target_weight,
            "height": height,
            "age": age,
            "gender": gender,
            "activity_level": activity_level,
            "goal_type": goal_type,
            "current_tdee": round(current_tdee, 2),
            "target_tdee": round(target_tdee, 2),
            "carb_target": carb_target,
            "protein_target": protein_target,
            "fat_target": fat_target
        },
        "recommended_diet": recommended_diet
    }

# 사용자 입력
user_info = {
    "current_weight": 76,        # 현재 체중 (kg)
    "target_weight": 71,         # 목표 체중 (kg)
    "height": 182,               # 키 (cm)
    "age": 23,                   # 나이 (세)
    "gender": "Male",            # 성별 ("Male", "Female")
    "activity_level": 3,         # 활동 수준 (1~4)
    "goal_type": "벌크업"         # 목표 식단 ("저지방 고단백", "균형 식단", "벌크업")
}

# 결과 계산 및 출력
result = get_custom_diet(user_info)

# 결과 계산 및 출력
result = get_custom_diet(user_info)

# 사용자 정보 출력
print("사용자 정보 및 목표:")
print(json.dumps(result["user_info"], ensure_ascii=False, indent=4))

# 추천 식단 출력
print("\n추천 식단:")
for meal, details in result["recommended_diet"].items():
    if "message" in details:
        print(f"{meal.capitalize()}: {details['message']}")
    elif meal == "snack":
        print(f"{meal.capitalize()} - {details['food_name']}: {details['portion']}g (탄수화물: {details['carb']}g, 단백질: {details['protein']}g, 지방: {details['fat']}g, 칼로리: {details['calories']}kcal)")
    else:
        print(f"{meal.capitalize()} - 밥류: {details['rice']['food_name']} ({details['rice']['portion']}g), 반찬류: {details['side_dish']['food_name']} ({details['side_dish']['portion']}g)")

# 결과 저장
with open('output.json', 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=4)

print("\n결과가 'output.json' 파일에 저장되었습니다.")