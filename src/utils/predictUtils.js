const { spawn } = require("child_process");

const runPythonScript = (userInfo) => {
    console.log("Sending data to Python script:", JSON.stringify(userInfo)); // 전달 데이터 로그

    return new Promise((resolve, reject) => {
        const pythonProcess = spawn("python", ["./src/python/model_predict.py"]);

        let data = "";
        let error = "";

        // Node.js에서 Python으로 데이터 전달
        pythonProcess.stdin.write(JSON.stringify(userInfo));
        pythonProcess.stdin.end();

        // Python 표준 출력
        pythonProcess.stdout.on("data", (chunk) => {
            data += chunk.toString();
        });

        // Python 표준 에러
        pythonProcess.stderr.on("data", (chunk) => {
            error += chunk.toString();
        });

        // Python 종료 시 처리
        pythonProcess.on("close", (code) => {
            if (code === 0) {
                try {
                    const result = JSON.parse(data);
                    console.log("Received output from Python script:", result); // 결과 로그
                    resolve(result);
                } catch (err) {
                    reject(new Error("Failed to parse Python output: " + err.message));
                }
            } else {
                console.error("Python script error output:", error); // 에러 로그
                reject(new Error(`Python script exited with code ${code}: ${error}`));
            }
        });
    });
};

module.exports = { runPythonScript };
