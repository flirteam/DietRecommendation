const express = require("express");
const cookieParser = require("cookie-parser"); 
const loginRoutes = require("./routes/loginRoutes");
const userInfoRoutes = require("./routes/userInfoRoutes");
const foodRoutes = require("./routes/foodRoutes");
const tokenRoutes = require("./routes/tokenRoutes");

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use("/api/login", loginRoutes);
app.use("/api/user", userInfoRoutes);
app.use("/api/food", foodRoutes);
app.use("/api/token", tokenRoutes);

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
