const { predictDaysToGoal } = require("../utils/predictUtils");
const { getUserInfoById } = require("./userInfoController");

// @desc Handle prediction request
// @route POST /api/predict
const handlePredictionRequest = async (req, res) => {
    try {
        // 1. 인증된 사용자 ID 가져오기
        const userId = req.user.id;

        // 2. 사용자 정보 가져오기 userInfoController에 있는 유틸 함수
        const userInfo = await getUserInfoById(userId);

        // 3. Python 스크립트로 전달할 데이터 준비
        const pythonInput = preparePythonInput(userInfo);

        // 4. Python 스크립트를 호출하여 예측 수행
        const predictionResult = await predictDaysToGoal(pythonInput);

        // 5. 결과를 클라이언트에 반환
        res.status(200).json({
            message: "Prediction successful",
            predicted_days: predictionResult.predicted_days,
        });
    } catch (error) {
        // 에러 처리
        res.status(500).json({
            message: "Prediction failed",
            error: error.message,
        });
    }
};

// Helper: Python 스크립트에 전달할 데이터 포맷 준비
const preparePythonInput = (userInfo) => {
    return {
        age: userInfo.age,
        height: parseFloat(userInfo.height),
        current_weight: parseFloat(userInfo.current_weight),
        target_weight: parseFloat(userInfo.target_weight),
        bmr: parseFloat(userInfo.bmr),
        amr: parseFloat(userInfo.amr),
        activity_level: userInfo.activity_level,
        bmi: parseFloat(userInfo.bmi),
        target_bmi: parseFloat(userInfo.target_bmi),
        goal_type: userInfo.goal_type,
    };
};

module.exports = { handlePredictionRequest };
