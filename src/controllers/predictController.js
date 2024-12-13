const { runPythonScript } = require("../utils/predictUtils");
const { getUserInfoById } = require("./userInfoController");
const dbConnect = require("../config/dbConnect");

const handlePredictionRequest = async (req, res) => {
    try {
        const userId = req.user.id;

        // 사용자 정보 가져오기
        const userInfo = await getUserInfoById(userId);

        // 사용자 선호 운동 부위 가져오기, db에 exercise_preferences 테이블 있어야함!!
        // 사용자 생성 후 선호 운동 설정까지 해야 예측 가능!!
        const [preferenceResult] = await dbConnect.query(
            "SELECT preferred_body_part FROM exercise_preferences WHERE user_id = ?",
            [userId]
        );

        if (preferenceResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: "운동 선호 데이터를 찾을 수 없습니다.",
            });
        }

        const preferredBodyPart = preferenceResult[0].preferred_body_part;

        // Python 스크립트로 전달할 데이터 준비
        const heightInMeters = parseFloat(userInfo.height) / 100; // cm → m
        const targetBmi = parseFloat(userInfo.target_weight) / (heightInMeters ** 2); // BMI 계산

        const pythonInput = {
            username: userInfo.username,
            age: userInfo.age,
            height: parseFloat(userInfo.height),
            current_weight: parseFloat(userInfo.current_weight),
            target_weight: parseFloat(userInfo.target_weight),
            bmr: parseFloat(userInfo.bmr),
            tdee: parseFloat(userInfo.amr), // amr을 tdee로 변환
            target_bmr: parseFloat(userInfo.target_bmr),
            target_amr: parseFloat(userInfo.target_amr),
            bmi: parseFloat(userInfo.bmi),
            bfp: parseFloat(userInfo.bfp),
            target_bmi: targetBmi, // 계산된 target_bmi
            activity_level: userInfo.activity_level,
            gender: userInfo.gender,
            goal_type: userInfo.goal_type,
            preferred_body_part: preferredBodyPart, // DB에서 가져온 값
        };

        // Python 스크립트 호출
        const predictionResult = await runPythonScript(pythonInput);

        // 결과 반환
        res.status(200).json(predictionResult);
    } catch (error) {
        console.error("Error in handlePredictionRequest:", error);
        res.status(500).json({
            message: "Prediction failed",
            error: error.message,
        });
    }
};

module.exports = { handlePredictionRequest };
