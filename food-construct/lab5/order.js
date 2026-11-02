const selectedDishes = {};
const categoryOrder = ["soup", "main_course", "salad", "beverage", "dessert"];
const selectionList = document.querySelector("#selection-list");
const orderCost = document.querySelector("#order-cost");

function updateOrder() {
  const chosen = Object.values(selectedDishes);
  document.querySelectorAll(".dish").forEach((card) => {
    card.classList.toggle(
      "selected",
      Object.values(selectedDishes).some((dish) => dish.keyword === card.dataset.dish)
    );
  });

  categoryOrder.forEach((category) => {
    const inputName = category === "main_course" ? "selected-main" : `selected-${category}`;
    const input = document.getElementById(inputName);
    if (input) input.value = selectedDishes[category]?.keyword || "";
  });

  if (chosen.length === 0) {
    selectionList.textContent = "Ничего не выбрано";
    orderCost.hidden = true;
    return;
  }

  selectionList.innerHTML = "";
  categoryOrder.forEach((category) => {
    const line = document.createElement("p");
    const dish = selectedDishes[category];
    const emptyText = category === "beverage" ? "Напиток не выбран" : "Блюдо не выбрано";
    line.textContent = `${categoryNames[category]}: ${dish ? `${dish.name} ${dish.price}₽` : emptyText}`;
    selectionList.append(line);
  });

  orderCost.hidden = false;
  orderCost.textContent = `Стоимость заказа: ${chosen.reduce((sum, dish) => sum + Number(dish.price), 0)}₽`;
}

document.querySelectorAll(".dishes").forEach((container) => {
  container.addEventListener("click", (event) => {
    const button = event.target.closest("[data-add-dish]");
    if (!button) return;
    const card = button.closest(".dish");
    const dish = dishes.find((item) => item.keyword === card.dataset.dish);
    if (dish) {
      selectedDishes[dish.category] = dish;
      updateOrder();
    }
  });
});

document.querySelector("#order-form").addEventListener("reset", () => {
  Object.keys(selectedDishes).forEach((category) => delete selectedDishes[category]);
  updateOrder();
});

updateOrder();
