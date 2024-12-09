const { spawn } = require("child_process");

// @desc Call Python script to predict days to goal
const predictDaysToGoal = (userInfo) => {
    return new Promise((resolve, reject) => {
        // Python 스크립트 경로 수정
        const python = spawn("python", ["src/python/model.py", JSON.stringify(userInfo)]);

        let result = "";
        let error = "";

        python.stdout.on("data", (data) => {
            result += data.toString();
        });

        python.stderr.on("data", (data) => {
            error += data.toString();
        });

        python.on("close", (code) => {
            if (code !== 0 || error) {
                return reject(`Python Error: ${error}`);
            }
            try {
                const parsedResult = JSON.parse(result);
                resolve(parsedResult);
            } catch (e) {
                reject(`Parsing Error: ${e.message}`);
            }
        });
    });
};

module.exports = { predictDaysToGoal };
