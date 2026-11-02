const orderStorageKey = "foodConstructSelectedDishes";
const selectedDishes = {};
const categoryOrder = ["soup", "main_course", "salad", "beverage", "dessert"];
const categoryInputIds = {
  soup: "selected-soup",
  main_course: "selected-main",
  salad: "selected-salad",
  beverage: "selected-beverage",
  dessert: "selected-dessert"
};

function getStoredIds() {
  try {
    const saved = JSON.parse(localStorage.getItem(orderStorageKey) || "[]");
    return Array.isArray(saved) ? saved.map(String) : [];
  } catch {
    return [];
  }
}

function saveSelections() {
  const ids = Object.values(selectedDishes).map((dish) => String(dish.id ?? dish.keyword));
  localStorage.setItem(orderStorageKey, JSON.stringify(ids));
}

function restoreSelection() {
  getStoredIds().forEach((id) => {
    const dish = dishes.find((item) => String(item.id ?? item.keyword) === id);
    if (dish) selectedDishes[dish.category] = dish;
  });
  updateOrder();
}

function isValidCombo() {
  const selected = Object.keys(selectedDishes).filter((category) => category !== "dessert").sort();
  const combos = [
    ["beverage", "main_course", "salad", "soup"],
    ["beverage", "main_course", "soup"],
    ["beverage", "salad", "soup"],
    ["beverage", "main_course", "salad"],
    ["beverage", "main_course"]
  ].map((combo) => combo.sort().join(","));
  return combos.includes(selected.join(","));
}

function updateOrder() {
  const chosen = Object.values(selectedDishes);
  document.querySelectorAll(".dish[data-dish]").forEach((card) => {
    card.classList.toggle(
      "selected",
      Object.values(selectedDishes).some((dish) => dish.keyword === card.dataset.dish)
    );
  });

  categoryOrder.forEach((category) => {
    const input = document.getElementById(categoryInputIds[category]);
    if (input) input.value = selectedDishes[category]?.keyword || "";
  });

  const selectionList = document.querySelector("#selection-list");
  const orderCost = document.querySelector("#order-cost");
  if (selectionList) {
    if (chosen.length === 0) {
      selectionList.textContent = "Ничего не выбрано";
    } else {
      selectionList.innerHTML = "";
      categoryOrder.forEach((category) => {
        const line = document.createElement("p");
        const dish = selectedDishes[category];
        const emptyText = category === "beverage" ? "Напиток не выбран" : "Блюдо не выбрано";
        const label = categoryNames[category] || category;
        line.textContent = `${label}: ${dish ? `${dish.name} ${dish.price}₽` : emptyText}`;
        selectionList.append(line);
      });
    }
  }

  if (orderCost) {
    orderCost.hidden = chosen.length === 0;
    orderCost.textContent = `Стоимость заказа: ${chosen.reduce((sum, dish) => sum + Number(dish.price), 0)}₽`;
  }

  const panel = document.querySelector("#checkout-panel");
  if (panel) {
    panel.hidden = chosen.length === 0;
    const total = chosen.reduce((sum, dish) => sum + Number(dish.price), 0);
    document.querySelector("#panel-total").textContent = `${total}₽`;
    const link = document.querySelector("#checkout-link");
    const valid = isValidCombo();
    link.setAttribute("aria-disabled", String(!valid));
    link.tabIndex = valid ? 0 : -1;
    link.classList.toggle("disabled", !valid);
  }

  saveSelections();
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

const checkoutLink = document.querySelector("#checkout-link");
if (checkoutLink) {
  checkoutLink.addEventListener("click", (event) => {
    if (!isValidCombo()) event.preventDefault();
  });
}

if (document.querySelector("#order-form")) {
  document.querySelector("#order-form").addEventListener("reset", () => {
    Object.keys(selectedDishes).forEach((category) => delete selectedDishes[category]);
    saveSelections();
    updateOrder();
  });
}
