const categoryNames = {
  soup: "Суп",
  main_course: "Главное блюдо",
  salad: "Салат/стартер",
  beverage: "Напиток",
  dessert: "Десерт"
};

function renderDishes() {
  document.querySelectorAll(".menu-section").forEach((section) => {
    const category = section.dataset.category;
    const list = dishes
      .filter((dish) => dish.category === category)
      .sort((first, second) => first.name.localeCompare(second.name, "ru"));
    const container = section.querySelector(".dishes");
    container.innerHTML = "";

    list.forEach((dish) => {
      const card = document.createElement("div");
      card.className = "dish";
      card.dataset.dish = dish.keyword;

      const image = document.createElement("img");
      image.src = dish.image;
      image.alt = dish.name;
      const price = document.createElement("p");
      price.className = "price";
      price.textContent = `${dish.price}₽`;
      const name = document.createElement("p");
      name.className = "name";
      name.textContent = dish.name;
      const weight = document.createElement("p");
      weight.className = "weight";
      weight.textContent = dish.count;
      const button = document.createElement("button");
      button.className = "add-btn";
      button.type = "button";
      button.dataset.addDish = "true";
      button.textContent = "Добавить";

      card.append(image, price, name, weight, button);
      container.append(card);
    });
  });
}

renderDishes();
