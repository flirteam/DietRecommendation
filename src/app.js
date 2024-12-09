const express = require("express");
const cookieParser = require("cookie-parser");
const loginRoutes = require("./routes/loginRoutes");
const userInfoRoutes = require("./routes/userInfoRoutes");
const foodRoutes = require("./routes/foodRoutes");
const tokenRoutes = require("./routes/tokenRoutes");
const predictRoutes = require("./routes/predictRoutes");

const app = express();

// Middleware 설정
app.use(express.json());
app.use(cookieParser());

// 라우터 설정
app.use("/api/login", loginRoutes);
app.use("/api/user", userInfoRoutes);
app.use("/api/food", foodRoutes);
app.use("/api/token", tokenRoutes);
app.use("/api/predict", predictRoutes);

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
