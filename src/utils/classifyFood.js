function classifyFood(food) {
    switch (food.category) {
        case "밥":
            return "밥류";
        case "면":
            return "면 및 만두류";
        case "빵":
        case "샌드위치":
            return "빵 및 과자류";
        case "국 및 찌개":
            return "국 및 찌개류";
        case "죽 및 스프":
            return "죽 및 스프류";
        case "요리":
            return "요리류";
        case "반찬":
            return "반찬류";
        case "디저트":
            return "디저트류";
        case "브런치":
            return "브런치류";
        default:
            return "기타";
    }
}

module.exports = classifyFood;
