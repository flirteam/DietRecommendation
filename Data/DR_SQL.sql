-- 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS diet_recommendation_db;
USE diet_recommendation_db;

-- 사용자 계정 테이블
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    username VARCHAR(50) NOT NULL,
    birthdate VARCHAR(8) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 사용자 신체 정보 테이블
CREATE TABLE user_physical_info (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,                              -- 사용자 ID
    current_weight DECIMAL(5,2) NOT NULL,             -- 현재 체중 (kg)
    target_weight DECIMAL(5,2) NOT NULL,              -- 목표 체중 (kg)
    height DECIMAL(5,2) NOT NULL,                     -- 키 (cm)
    age INT NOT NULL,                                  -- 나이 (세)
    gender ENUM('Male', 'Female') NOT NULL,           -- 성별
    activity_level TINYINT NOT NULL,                  -- 활동 수준 (1~4)
    goal_type ENUM('저지방 고단백', '균형 식단', '벌크업') NOT NULL, -- 목표 식단 유형
    basal_metabolic_rate DECIMAL(8,2),                -- 현재 BMR (자동 계산)
    active_metabolic_rate DECIMAL(8,2),               -- 현재 AMR (자동 계산)
    target_basal_metabolic_rate DECIMAL(8,2),         -- 목표 BMR (목표 체중 기준)
    target_active_metabolic_rate DECIMAL(8,2),        -- 목표 AMR (목표 체중 기준)
    bmi DECIMAL(4,1),                                 -- 현재 BMI (자동 계산)
    body_fat_percentage DECIMAL(4,1),                 -- 현재 체지방률 (자동 계산)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   -- 생성 시간
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- 업데이트 시간
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 음식 데이터베이스 테이블
CREATE TABLE foods (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,  -- 밥류, 빵 및 과자류...
    calories INT NOT NULL,
    carbs DECIMAL(6,2) NOT NULL,    -- g 단위
    protein DECIMAL(6,2) NOT NULL,  -- g 단위
    fat DECIMAL(6,2) NOT NULL,      -- g 단위
    sugar DECIMAL(6,2) NOT NULL,    -- g 단위 (당 성분)
    serving_size VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 식단 추천 기록 테이블
CREATE TABLE diet_recommendations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    daily_calories INT NOT NULL,
    carbs_ratio DECIMAL(4,2) NOT NULL,  -- 탄수화물 비율
    protein_ratio DECIMAL(4,2) NOT NULL,  -- 단백질 비율
    fat_ratio DECIMAL(4,2) NOT NULL,      -- 지방 비율
    recommendation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 사용자 식단 기록 테이블 (미사용)
CREATE TABLE diet_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    food_id INT NOT NULL,
    meal_type ENUM('breakfast', 'lunch', 'dinner', 'snack') NOT NULL,
    servings DECIMAL(3,1) NOT NULL,
    meal_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (food_id) REFERENCES foods(id)
);


-- 테이블 전체 삭제
SET FOREIGN_KEY_CHECKS = 0; -- 외래 키 제약 조건 비활성화

DROP TABLE IF EXISTS diet_records;

DROP TABLE IF EXISTS diet_recommendations;
DROP TABLE IF EXISTS user_physical_info;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1; -- 외래 키 제약 조건 다시 활성화



-- 아래 부터는 테스트용으로 사용한 코드들


select * from foods;
select * from users;
select * from user_physical_info;

delete from users where birthdate is null;
delete from user_physical_info where id > 1;
ALTER TABLE user_physical_info AUTO_INCREMENT = 1;

ALTER TABLE Users CHANGE name username VARCHAR(100) NOT NULL;
ALTER TABLE Users CHANGE birthdate birthdate VARCHAR(8) NOT NULL;

SELECT 
    id, name, category, protein, calories
FROM foods
WHERE category = '밥류'
ORDER BY protein DESC
LIMIT 100 OFFSET 0;
