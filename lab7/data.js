let dishes = [];
const dishesUrl = "https://edu.std-900.ist.mospolytech.ru/labs/api/dishes";
const apiOrigin = new URL(dishesUrl).origin;
const fallbackDishesUrl = "./dishes.json";

async function loadDishes() {
  let result;
  try {
    const response = await fetch(dishesUrl);
    if (!response.ok) throw new Error("Не удалось загрузить меню с сервера.");
    result = await response.json();
    if (!Array.isArray(result)) throw new Error("Сервер вернул неверный формат меню.");
  } catch {
    const response = await fetch(fallbackDishesUrl);
    if (!response.ok) throw new Error("Не удалось загрузить локальное меню.");
    result = await response.json();
    if (!Array.isArray(result)) throw new Error("Локальный файл меню имеет неверный формат.");
  }

  return result.map((dish) => {
    let category = dish.category;
    if (category === "drink" || category === "drinks") category = "beverage";
    if (category === "main" || category === "main_dish") category = "main_course";
    if (category === "salad_starter" || category === "salad_starters") category = "salad";
    if (category === "desserts") category = "dessert";

    let image = dish.image;
    if (image && image.startsWith("/")) image = `${apiOrigin}${image}`;
    if (image && image.startsWith("http://")) image = `${apiOrigin}${new URL(image).pathname}`;

    return { ...dish, category, image };
  });
}
