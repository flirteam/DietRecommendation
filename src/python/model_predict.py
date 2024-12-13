# -*- coding: utf-8 -*-
import sys
import json
import pandas as pd
import numpy as np
import torch
import torch.nn as nn
from joblib import load
import traceback

sys.stdout.reconfigure(encoding='utf-8')

# routes setting app.js
# feature_path = "./src/python/Data/feature_columns.json"
# scaler_path = "./src/python/Data/scaler.joblib"
# model_path = "./src/python/Data/P_model.pth"

# routes setting py
feature_path = "./Data/feature_columns.json"
scaler_path = "./Data/scaler.joblib"
model_path = "./Data/P_model.pth"

# Feature load
with open(feature_path, 'r') as f:
    expected_columns = json.load(f)

# Scaler load
scaler = load(scaler_path)

# PyTorch model
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
        layers.append(nn.Linear(in_dim, 1)) 
        self.layers = nn.Sequential(*layers)

    def forward(self, x):
        return self.layers(x)

# model set
hidden_layer_sizes = [128, 64, 32]
input_dim = len(expected_columns)
model = FeedforwardNNImproved(input_dim, hidden_layer_sizes)
model.load_state_dict(torch.load(model_path))
model.eval()

def predict(user_info):
    input_data = pd.DataFrame([{
        "Age": user_info["age"],
        "Height": user_info["height"] / 100,  # cm → m
        "Weight": user_info["current_weight"],
        "TargetWeight": user_info["target_weight"],
        "BMR": user_info["bmr"],
        "TDEE": user_info["tdee"],
        "BMI": user_info["bmi"],
        "TargetBMI": user_info["target_bmi"],
        "Calorie_Target": user_info["tdee"] - 500, 
        "Calorie_Deficit": 500,
        "총 운동시간": 120,
        "하루소모칼로리": 400,
        "총 식사섭취 칼로리": 2000,
        "ActivityLevel": user_info["activity_level"],
        "Gender": user_info["gender"],
        "GoalType": user_info["goal_type"],
        "preferred_body_part": user_info["preferred_body_part"]
    }])

    categorical_features = ['Gender', 'GoalType', 'preferred_body_part']
    input_data = pd.get_dummies(input_data, columns=categorical_features)
    input_data = input_data.reindex(columns=expected_columns, fill_value=0)

    # Data scaling
    X_input = scaler.transform(input_data)

    # Model predict
    with torch.no_grad():
        X_tensor = torch.tensor(X_input, dtype=torch.float32)
        prediction = model(X_tensor).item()
        days_to_goal = np.expm1(prediction)

    return days_to_goal

if __name__ == "__main__":
    try:
        # stdin
        input_data = sys.stdin.read()
        user_info = json.loads(input_data)

        # Prediction
        days_to_goal = predict(user_info)

        result = {
            "username": user_info["username"],
            "days_to_goal": round(days_to_goal, 2),
            "message": f"The estimated time for {user_info['username']} to achieve the goal is approximately {round(days_to_goal, 2)} days."
        }

        print(json.dumps(result, ensure_ascii=False))  # ensure_ascii=False

    except Exception as e:
        print(json.dumps({
            "error": str(e),
            "traceback": traceback.format_exc()
        }, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)

