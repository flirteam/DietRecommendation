// 음식 카테고리를 분류하는 함수
function classifyFood(food) {
    if (food.category.includes("밥류") || food.category.includes("면 및 만두류")) {
        return "밥류";
    } else if (food.category.includes("국 및 탕류") || food.category.includes("찌개 및 전골류")) {
        return "국류";
    } else if (food.category.includes("전·적 및 부침류") || food.category.includes("조림류") || food.category.includes("나물·숙채류")) {
        return "반찬류";
    } else if (food.category.includes("빵 및 과자류") || food.category.includes("음료 및 차류")) {
        return "디저트류";
    } else if (food.category.includes("브런치") || food.category.includes("샌드위치")) {
        return "브런치류";
    } else {
        return "기타";
    }
}

module.exports = classifyFood;
