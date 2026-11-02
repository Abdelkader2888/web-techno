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
    const activeFilter = section.querySelector(".filters .active")?.dataset.kind;
    const list = dishes
      .filter((dish) => dish.category === category)
      .filter((dish) => !activeFilter || dish.kind === activeFilter)
      .sort((first, second) => first.name.localeCompare(second.name, "ru"));
    const container = section.querySelector(".dishes");
    container.innerHTML = "";

    list.forEach((dish) => {
      const card = document.createElement("div");
      card.className = "dish";
      card.dataset.dish = dish.keyword;
      if (dish.id !== undefined) card.dataset.id = dish.id;

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

document.querySelectorAll(".menu-section .filters").forEach((filters) => {
  filters.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-kind]");
    if (!button) return;
    const wasActive = button.classList.contains("active");
    filters.querySelectorAll("button").forEach((item) => item.classList.remove("active"));
    if (!wasActive) button.classList.add("active");
    renderDishes();
    if (typeof updateOrder === "function") updateOrder();
  });
});

loadDishes()
  .then((loadedDishes) => {
    dishes = loadedDishes;
    renderDishes();
    if (typeof updateOrder === "function") updateOrder();
  })
  .catch(() => {
    const message = document.createElement("p");
    message.className = "load-error";
    message.textContent = "Не удалось загрузить меню. Попробуйте открыть страницу позже.";
    document.querySelector("main").prepend(message);
  });
