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

function getComboMessage() {
  const allSelected = Object.keys(selectedDishes);
  if (allSelected.length === 0) return "Ничего не выбрано. Выберите блюда для заказа";
  const selected = allSelected.filter((category) => category !== "dessert").sort();
  if (selected.length === 0) return "Выберите главное блюдо";

  const combos = [
    ["beverage", "main_course", "salad", "soup"],
    ["beverage", "main_course", "soup"],
    ["beverage", "salad", "soup"],
    ["beverage", "main_course", "salad"],
    ["beverage", "main_course"]
  ].map((combo) => combo.sort().join(","));
  if (combos.includes(selected.join(","))) return "";

  if (selected.includes("soup") && !selected.includes("main_course") && !selected.includes("salad")) {
    return "Выберите главное блюдо/салат/стартер";
  }
  if (selected.includes("salad") && !selected.includes("soup") && !selected.includes("main_course")) {
    return "Выберите суп или главное блюдо";
  }
  if (!selected.includes("beverage")) return "Выберите напиток";
  if (!selected.includes("main_course")) return "Выберите главное блюдо";
  return "Выберите главное блюдо";
}

function showNotification(message) {
  const overlay = document.createElement("div");
  overlay.className = "notice-overlay";
  const notice = document.createElement("div");
  notice.className = "notice";
  const text = document.createElement("p");
  text.textContent = message;
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Окей";
  button.addEventListener("click", () => overlay.remove());
  notice.append(text, button);
  overlay.append(notice);
  document.body.append(overlay);
}

document.querySelector("#order-form").addEventListener("submit", (event) => {
  const message = getComboMessage();
  if (message) {
    event.preventDefault();
    showNotification(message);
    return;
  }

  const deliveryTime = document.querySelector("#delivery-time");
  deliveryTime.required = document.querySelector("#delivery-later").checked;
  if (!event.currentTarget.checkValidity()) {
    event.preventDefault();
    event.currentTarget.reportValidity();
  }
});

updateOrder();
