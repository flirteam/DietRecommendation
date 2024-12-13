import sys
import json
import pandas as pd
import numpy as np
import torch
import torch.nn as nn
from joblib import load
import traceback

# 경로 설정
feature_path = "./src/python/Data/feature_columns.json"
scaler_path = "./src/python/Data/scaler.joblib"
model_path = "./src/python/Data/P_model.pth"

# Feature 파일 로드
with open(feature_path, 'r') as f:
    expected_columns = json.load(f)

# Scaler 로드
scaler = load(scaler_path)

# PyTorch 모델 정의
class FeedforwardNNImproved(nn.Module):
    def __init__(self, input_dim, hidden_layer_sizes):
        super(FeedforwardNNImproved, self).__init__()
        layers = []
        in_dim = input_dim
        for size in hidden_layer_sizes:
            layers.append(nn.Linear(in_dim, size))
            layers.append(nn.BatchNorm1d(size))
            layers.append(nn.LeakyReLU())
            layers.append(nn.Dropout(0.2))
            in_dim = size
        layers.append(nn.Linear(in_dim, 1))  # 마지막 출력 레이어
        self.layers = nn.Sequential(*layers)

    def forward(self, x):
        return self.layers(x)

# 모델 초기화 및 로드
hidden_layer_sizes = [128, 64, 32]
input_dim = len(expected_columns)
model = FeedforwardNNImproved(input_dim, hidden_layer_sizes)
model.load_state_dict(torch.load(model_path))
model.eval()

def predict(user_info):
    # 입력 데이터 처리
    input_data = pd.DataFrame([{
        "Age": user_info["age"],
        "Height": user_info["height"] / 100,  # cm → m
        "Weight": user_info["current_weight"],
        "TargetWeight": user_info["target_weight"],
        "BMR": user_info["bmr"],
        "TDEE": user_info["tdee"],
        "BMI": user_info["bmi"],
        "TargetBMI": user_info["target_bmi"],
        "Calorie_Target": user_info["tdee"] - 500,  # 예시 칼로리 목표
        "Calorie_Deficit": 500,
        "총 운동시간": 120,
        "하루소모칼로리": 400,
        "총 식사섭취 칼로리": 2000,
        "ActivityLevel": user_info["activity_level"],
        "Gender": user_info["gender"],
        "GoalType": user_info["goal_type"],
        "preferred_body_part": user_info["preferred_body_part"]
    }])

    # 범주형 변수 처리
    categorical_features = ['Gender', 'GoalType', 'preferred_body_part']
    input_data = pd.get_dummies(input_data, columns=categorical_features)
    input_data = input_data.reindex(columns=expected_columns, fill_value=0)

    # 데이터 스케일링
    X_input = scaler.transform(input_data)

    # 모델 예측
    with torch.no_grad():
        X_tensor = torch.tensor(X_input, dtype=torch.float32)
        prediction = model(X_tensor).item()
        days_to_goal = np.expm1(prediction)  # 로그 변환 복원

    return days_to_goal

if __name__ == "__main__":
    try:
        # stdin에서 입력 데이터 읽기
        input_data = sys.stdin.read()
        user_info = json.loads(input_data)

        # 예측 수행
        days_to_goal = predict(user_info)

        # 결과 출력
        result = {
            "username": user_info["username"],
            "days_to_goal": round(days_to_goal, 2),
            "message": f"{user_info['username']}님의 목표 달성까지 예상 소요 기간은 약 {round(days_to_goal, 2)}일입니다."
        }
        print(json.dumps(result, ensure_ascii=False))  # ensure_ascii=False 추가

    except Exception as e:
        # 에러 메시지 출력
        print(json.dumps({
            "error": str(e),
            "traceback": traceback.format_exc()
        }, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)
