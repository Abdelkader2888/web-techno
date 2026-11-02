const checkoutStorageKey = "foodConstructSelectedDishes";
const checkoutApiRoot = "https://edu.std-900.ist.mospolytech.ru/labs/api";
const checkoutCategories = ["soup", "main_course", "salad", "beverage", "dessert"];
const checkoutLabels = {
  soup: "Суп",
  main_course: "Главное блюдо",
  salad: "Салат/стартер",
  beverage: "Напиток",
  dessert: "Десерт"
};
const checkoutFields = {
  soup: "soup_id",
  main_course: "main_course_id",
  salad: "salad_id",
  beverage: "drink_id",
  dessert: "dessert_id"
};
const emptyCategoryText = {
  soup: "Не выбран",
  main_course: "Не выбрано",
  salad: "Не выбран",
  beverage: "Не выбран",
  dessert: "Не выбран"
};
let selectedForCheckout = [];

function readStoredIds() {
  try {
    const ids = JSON.parse(localStorage.getItem(checkoutStorageKey) || "[]");
    return Array.isArray(ids) ? ids.map(String) : [];
  } catch {
    return [];
  }
}

function saveStoredIds() {
  localStorage.setItem(
    checkoutStorageKey,
    JSON.stringify(selectedForCheckout.map((dish) => String(dish.id ?? dish.keyword)))
  );
}

function getCheckoutComboMessage() {
  if (selectedForCheckout.length === 0) return "Ничего не выбрано. Выберите блюда для заказа";
  const selected = selectedForCheckout.map((dish) => dish.category).filter((category) => category !== "dessert").sort();
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
  return "Выберите главное блюдо";
}

function renderCheckout() {
  const cards = document.querySelector("#selected-dishes");
  const emptyMessage = document.querySelector("#empty-order");
  cards.innerHTML = "";
  emptyMessage.hidden = selectedForCheckout.length > 0;

  selectedForCheckout.forEach((dish) => {
    const card = document.createElement("div");
    card.className = "dish";
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
    button.type = "button";
    button.className = "remove-btn";
    button.textContent = "Удалить";
    button.addEventListener("click", () => {
      selectedForCheckout = selectedForCheckout.filter(
        (item) => String(item.id ?? item.keyword) !== String(dish.id ?? dish.keyword)
      );
      saveStoredIds();
      renderCheckout();
    });
    card.append(image, price, name, weight, button);
    cards.append(card);
  });

  const summary = document.querySelector("#checkout-summary");
  summary.innerHTML = "";
  checkoutCategories.forEach((category) => {
    const dish = selectedForCheckout.find((item) => item.category === category);
    const line = document.createElement("p");
    line.textContent = `${checkoutLabels[category]}: ${dish ? `${dish.name} ${dish.price}₽` : emptyCategoryText[category]}`;
    summary.append(line);
    const input = document.getElementById(`${category === "main_course" ? "main" : category === "beverage" ? "beverage" : category}-id`);
    if (input) input.value = dish?.id || "";
  });

  const total = selectedForCheckout.reduce((sum, dish) => sum + Number(dish.price), 0);
  document.querySelector("#checkout-total").textContent = selectedForCheckout.length ? `Стоимость заказа: ${total}₽` : "Стоимость заказа: 0₽";
}

function getApiKey() {
  let key = sessionStorage.getItem("foodConstructApiKey");
  if (!key) {
    key = window.prompt("Введите персональный API Key из СДО Московского Политеха:");
    if (!key) return "";
    key = key.trim();
    if (key) sessionStorage.setItem("foodConstructApiKey", key);
  }
  return key;
}

async function sendOrder(event) {
  event.preventDefault();
  const comboMessage = getCheckoutComboMessage();
  if (comboMessage) {
    window.alert(comboMessage);
    return;
  }

  const form = event.currentTarget;
  const deliveryTime = document.querySelector("#delivery-time");
  deliveryTime.required = document.querySelector("#delivery-later").checked;
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  if (selectedForCheckout.some((dish) => !dish.id)) {
    window.alert("В данных меню отсутствует идентификатор блюда. Попробуйте открыть страницу позже.");
    return;
  }

  const apiKey = getApiKey();
  if (!apiKey) return;

  const formData = new FormData(form);
  checkoutCategories.forEach((category) => {
    formData.delete(checkoutFields[category]);
    const dish = selectedForCheckout.find((item) => item.category === category);
    if (dish) formData.append(checkoutFields[category], dish.id);
  });
  formData.set("subscribe", document.querySelector("#subscribe").checked ? "1" : "0");
  if (document.querySelector("#delivery-now").checked) formData.delete("delivery_time");

  const button = document.querySelector("#submit-order");
  button.disabled = true;
  try {
    const response = await fetch(`${checkoutApiRoot}/orders?api_key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      body: formData
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Не удалось отправить заказ.");
    localStorage.removeItem(checkoutStorageKey);
    selectedForCheckout = [];
    renderCheckout();
    form.reset();
    window.alert("Заказ успешно оформлен.");
  } catch (error) {
    window.alert(error.message || "Ошибка при отправке заказа.");
  } finally {
    button.disabled = false;
  }
}

loadDishes()
  .then((loadedDishes) => {
    const savedIds = readStoredIds();
    selectedForCheckout = savedIds
      .map((id) => loadedDishes.find((dish) => String(dish.id ?? dish.keyword) === id))
      .filter(Boolean);
    saveStoredIds();
    renderCheckout();
  })
  .catch(() => {
    const message = document.createElement("p");
    message.className = "load-error";
    message.textContent = "Не удалось загрузить меню. Попробуйте открыть страницу позже.";
    document.querySelector("main").prepend(message);
  });

document.querySelector("#checkout-form").addEventListener("submit", sendOrder);
