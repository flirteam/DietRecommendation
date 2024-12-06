const runPythonScript = (userData) => {
    console.log("runPythonScript started with userData:", userData); // 시작 로그
    return new Promise((resolve, reject) => {
      const options = {
        mode: "json", // Python에서 JSON 형식으로 출력할 것을 기대
        pythonOptions: ["-u"], // Python 실행 시 출력을 실시간으로 처리
        scriptPath: path.join(__dirname, "../python"), // Python 스크립트 경로
        args: [JSON.stringify(userData)], // Python 스크립트에 전달할 데이터 (JSON 문자열로 변환)
      };
  
      console.log("Executing Python Script with args:", options.args); // 디버깅 로그 추가
  
      PythonShell.run("foodRecommendation.py", options, (err, results) => {
        if (err) {
          console.error("Python script error:", err);
          return reject(err); // 에러 발생 시 Promise reject
        }
        
        console.log("Raw Python results:", results); // Python 출력 결과 디버깅 로그
        
        try {
          // Python에서 반환된 JSON 결과 처리
          const parsedResult = JSON.parse(results[0]); 
          resolve(parsedResult); // JSON 형식으로 반환
        } catch (parseError) {
          console.error("Error parsing Python output:", parseError);
          reject(parseError);
        }
      });
    });
  };
  
  module.exports = { runPythonScript };
  