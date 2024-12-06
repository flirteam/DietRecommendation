import os
import sys
import json
import pandas as pd
import numpy as np
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# 환경 변수 로드
current_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(os.path.dirname(current_dir), '.env')
load_dotenv(env_path)

# DB 연결 정보
DB_CONFIG = {
    'host': os.getenv('DB_HOST'),
    'port': int(os.getenv('DB_PORT')),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'database': os.getenv('DB_NAME')
}

try:
    # SQLAlchemy engine 생성
    database_url = f"mysql+mysqlconnector://{DB_CONFIG['user']}:{DB_CONFIG['password']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}?charset=utf8mb4"
    engine = create_engine(database_url)
    
    with engine.connect() as connection:
        # 음식 데이터 가져오기
        query = text("""
            SELECT 
                name,
                category,
                calories,
                carbs,
                protein,
                fat,
                serving_size
            FROM foods
        """)
        
        food_data = pd.read_sql_query(query, connection)
        
        # 컬럼 매핑 (영어 -> 한글)
        column_mapping = {
            'name': '식품명',
            'category': '식품대분류명',
            'calories': '에너지(kcal)',
            'carbs': '탄수화물(g)',
            'protein': '단백질(g)',
            'fat': '지방(g)',
            'serving_size': '식품중량'
        }
        food_data = food_data.rename(columns=column_mapping)
        print("Successfully loaded data from database", file=sys.stderr)

except Exception as e:
    print(f"Error connecting to database: {str(e)}", file=sys.stderr)
    sys.exit(1)
    
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
def recommend_diet(calorie_target, food_data, carb_target, protein_target, fat_target):
    """
    식단 추천: 목표 영양소 비율에 맞는 섭취량을 계산하여 반환
    """
    meal_ratios = {"breakfast": 0.3, "lunch": 0.35, "snack": 0.15, "dinner": 0.2}
    recommended_meals = {}
    used_foods = []  # 이미 선택된 음식을 저장하는 리스트

    for meal, ratio in meal_ratios.items():
        meal_calories = calorie_target * ratio
        meal_carb_target = carb_target * ratio
        meal_protein_target = protein_target * ratio
        meal_fat_target = fat_target * ratio

        if meal == "snack":
            # 간식은 디저트류나 브런치류에서 선택
            snack_food = food_data[food_data['음식분류'].isin(['디저트류', '브런치류'])]
            if not snack_food.empty:
                snack_food = snack_food.copy()
                snack_food['score'] = np.abs(snack_food['탄수화물(g)'] - meal_carb_target) + \
                                       np.abs(snack_food['단백질(g)'] - meal_protein_target) + \
                                       np.abs(snack_food['지방(g)'] - meal_fat_target)
                # 상위 5개 음식 중 랜덤 선택
                selected_food = snack_food.sort_values('score').head(5).sample(1).iloc[0]
                portion = meal_calories / selected_food['에너지(kcal)'] * 100
                recommended_meals[meal] = {
                    "food_name": selected_food['식품명'],
                    "portion": round(portion, 2),
                    "carb": round(selected_food['탄수화물(g)'] * (portion / 100), 2),
                    "protein": round(selected_food['단백질(g)'] * (portion / 100), 2),
                    "fat": round(selected_food['지방(g)'] * (portion / 100), 2),
                    "calories": round(selected_food['에너지(kcal)'] * (portion / 100), 2)
                }
                used_foods.append(selected_food['식품명'])
            else:
                recommended_meals[meal] = {"message": "No suitable snack found"}
        else:
            # 일반 식사는 밥류와 반찬류 조합
            rice_food = food_data[(food_data['음식분류'] == '밥류') & (~food_data['식품명'].isin(used_foods))]
            side_dish = food_data[(food_data['음식분류'] == '반찬류') & (~food_data['식품명'].isin(used_foods))]

            if not rice_food.empty and not side_dish.empty:
                # 밥류 선택
                rice_food = rice_food.copy()
                rice_food['score'] = np.abs(rice_food['탄수화물(g)'] - meal_carb_target * 0.6) + \
                                     np.abs(rice_food['단백질(g)'] - meal_protein_target * 0.4)
                rice = rice_food.sort_values('score').head(5).sample(1).iloc[0]

                # 반찬류 선택
                side_dish = side_dish.copy()
                side_dish['score'] = np.abs(side_dish['단백질(g)'] - meal_protein_target * 0.6) + \
                                     np.abs(side_dish['지방(g)'] - meal_fat_target * 0.4)
                side = side_dish.sort_values('score').head(5).sample(1).iloc[0]

                rice_portion = meal_calories * 0.6 / rice['에너지(kcal)'] * 100
                side_portion = meal_calories * 0.4 / side['에너지(kcal)'] * 100

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
                used_foods.append(rice['식품명'])
                used_foods.append(side['식품명'])
            else:
                recommended_meals[meal] = {"message": f"No suitable food found for {meal}"}

    return recommended_meals

# BMI 상태에 따른 TDEE 조정
def adjust_tdee_based_on_bmi(tdee, bmi_status):
    """
    BMI 상태에 따라 TDEE 조정
    - 저체중: TDEE에 10% 추가 (체중 증가 유도)
    - 과체중: TDEE에서 10% 감산 (체중 감소 유도)
    - 비만: TDEE에서 20% 감산 (체중 감량 유도)
    - 정상체중: TDEE 유지
    """
    if bmi_status == '저체중':
        return tdee * 1.1  # 10% 추가
    elif bmi_status == '과체중':
        return tdee * 0.9  # 10% 감소
    elif bmi_status == '비만':
        return tdee * 0.8  # 20% 감소
    return tdee  # 정상체중은 조정 없음

# 사용자 맞춤 식단 추천
def get_custom_diet(user_info):
    """
    사용자 정보 기반 맞춤 식단 추천
    """
    try:
        # 문자열 데이터를 float 또는 int로 변환
        current_weight = float(user_info['current_weight'])
        target_weight = float(user_info['target_weight'])
        height = float(user_info['height'])
        age = int(user_info['age'])
        gender = user_info['gender']
        activity_level = int(user_info['activity_level'])
        goal_type = user_info['goal_type']  # 목표 식단 추가

        # 현재 BMI 계산
        bmi_status, current_bmi = calculate_bmi(current_weight, height)
        
        # 현재와 목표 BMR 및 TDEE 계산
        current_bmr = calculate_bmr(current_weight, height, age, gender)
        current_tdee = calculate_tdee(current_bmr, activity_level)

        target_bmr = calculate_bmr(target_weight, height, age, gender)
        target_tdee = calculate_tdee(target_bmr, activity_level)

        # BMI 상태에 따라 TDEE 조정 (덮어쓰기)
        current_tdee = adjust_tdee_based_on_bmi(current_tdee, bmi_status)
        target_tdee = adjust_tdee_based_on_bmi(target_tdee, bmi_status)

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
        recommended_diet = recommend_diet(target_tdee, food_data, carb_target, protein_target, fat_target)

        return {
            "user_info": {
                "current_weight": current_weight,
                "target_weight": target_weight,
                "height": height,
                "age": age,
                "gender": gender,
                "activity_level": activity_level,
                "goal_type": goal_type,
                "current_bmi": round(current_bmi, 2),
                "bmi_status": bmi_status,
                "current_tdee": round(current_tdee, 2),
                "target_tdee": round(target_tdee, 2),
                "carb_target": carb_target,
                "protein_target": protein_target,
                "fat_target": fat_target
            },
            "recommended_diet": recommended_diet
        }
    except Exception as e:
        raise ValueError(f"Error processing user data: {e}")


# sys.argv[1]로 Node.js에서 전달된 JSON 문자열 접근
if __name__ == "__main__":
    try:
        user_info = json.loads(sys.argv[1].encode('utf-8').decode('utf-8'))  # Node.js에서 전달받은 JSON 데이터
        sys.stderr.write(f"Received user data: {user_info}\n")  # 디버깅 메시지
        result = get_custom_diet(user_info)
        print(json.dumps(result, ensure_ascii=False))  # 결과 JSON 출력
        sys.exit(0)
    except Exception as e:
        print(json.dumps({"error": str(e)}, ensure_ascii=False))  # 오류 JSON 출력
        sys.exit(1)