const ordersApiRoot = "https://edu.std-900.ist.mospolytech.ru/labs/api";
const orderDishFields = [
  ["soup_id", "soup"],
  ["main_course_id", "main_course"],
  ["salad_id", "salad"],
  ["drink_id", "beverage"],
  ["dessert_id", "dessert"]
];
let apiKey = sessionStorage.getItem("foodConstructApiKey") || "";
let orderDishes = [];
let orders = [];
let currentOrder = null;

function showStatus(message, isError = false) {
  const status = document.querySelector("#orders-status");
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function getKey() {
  if (apiKey) return apiKey;
  const enteredKey = window.prompt("Введите персональный API Key из СДО Московского Политеха:");
  if (!enteredKey) return "";
  apiKey = enteredKey.trim();
  if (apiKey) sessionStorage.setItem("foodConstructApiKey", apiKey);
  return apiKey;
}

async function apiRequest(path, options = {}) {
  const key = getKey();
  if (!key) throw new Error("Для просмотра заказов нужен персональный API Key.");
  const response = await fetch(`${ordersApiRoot}${path}?api_key=${encodeURIComponent(key)}`, options);
  const text = await response.text();
  let result = {};
  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    result = { error: text };
  }
  if (!response.ok) throw new Error(result.error || "Не удалось выполнить запрос.");
  return result;
}

function findOrderDishes(order) {
  return orderDishFields
    .map(([field]) => order[field] && orderDishes.find((dish) => String(dish.id) === String(order[field])))
    .filter(Boolean);
}

function formatDate(value) {
  if (!value) return "Дата не указана";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ru-RU");
}

function orderDelivery(order) {
  if (order.delivery_type === "by_time") return `К указанному времени: ${order.delivery_time || "не указано"}`;
  return "Как можно скорее (с 7:00 до 23:00)";
}

function makeLine(label, value) {
  const line = document.createElement("p");
  line.className = "order-detail-line";
  const strong = document.createElement("strong");
  strong.textContent = `${label}: `;
  line.append(strong, document.createTextNode(value || "Не указано"));
  return line;
}

function renderOrders() {
  const list = document.querySelector("#orders-list");
  list.innerHTML = "";
  if (orders.length === 0) {
    showStatus("Заказов пока нет.");
    return;
  }

  const sortedOrders = [...orders].sort((first, second) => {
    return new Date(second.created_at || 0).getTime() - new Date(first.created_at || 0).getTime();
  });

  sortedOrders.forEach((order, index) => {
    const card = document.createElement("article");
    card.className = "order-entry";
    const heading = document.createElement("h3");
    heading.textContent = `Заказ №${index + 1}`;
    const dishNames = findOrderDishes(order).map((dish) => dish.name);
    const total = findOrderDishes(order).reduce((sum, dish) => sum + Number(dish.price), 0);
    card.append(
      heading,
      makeLine("Дата оформления", formatDate(order.created_at)),
      makeLine("Состав заказа", dishNames.join(", ") || "Состав заказа не указан"),
      makeLine("Стоимость", `${total}₽`),
      makeLine("Доставка", orderDelivery(order))
    );

    const actions = document.createElement("div");
    actions.className = "order-actions";
    [["details", "Подробнее"], ["edit", "Редактирование"], ["delete", "Удаление"]].forEach(([action, label]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.action = action;
      button.dataset.orderId = order.id;
      button.textContent = label;
      actions.append(button);
    });
    card.append(actions);
    list.append(card);
  });
  showStatus("");
}

function showDetails(order) {
  currentOrder = order;
  const content = document.querySelector("#details-content");
  content.innerHTML = "";
  const names = findOrderDishes(order).map((dish) => dish.name).join(", ");
  const total = findOrderDishes(order).reduce((sum, dish) => sum + Number(dish.price), 0);
  [
    ["Номер заказа", order.id],
    ["Дата оформления", formatDate(order.created_at)],
    ["Блюда", names || "Не указаны"],
    ["Стоимость", `${total}₽`],
    ["Имя", order.full_name],
    ["Email", order.email],
    ["Телефон", order.phone],
    ["Адрес доставки", order.delivery_address],
    ["Время доставки", orderDelivery(order)],
    ["Комментарий", order.comment]
  ].forEach(([label, value]) => content.append(makeLine(label, String(value || "Не указано"))));
  document.querySelector("#details-dialog").showModal();
}

function showEdit(order) {
  currentOrder = order;
  const form = document.querySelector("#edit-form");
  form.elements.full_name.value = order.full_name || "";
  form.elements.email.value = order.email || "";
  form.elements.phone.value = order.phone || "";
  form.elements.delivery_address.value = order.delivery_address || "";
  form.elements.delivery_type.value = order.delivery_type || "now";
  form.elements.delivery_time.value = order.delivery_time || "";
  form.elements.comment.value = order.comment || "";
  document.querySelector("#edit-dialog").showModal();
}

async function refreshOrders() {
  orders = await apiRequest("/orders");
}

document.querySelector("#orders-list").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const order = orders.find((item) => String(item.id) === button.dataset.orderId);
  if (!order) return;
  if (button.dataset.action === "details") showDetails(order);
  if (button.dataset.action === "edit") showEdit(order);
  if (button.dataset.action === "delete") {
    currentOrder = order;
    document.querySelector("#delete-dialog").showModal();
  }
});

document.querySelectorAll(".close-modal, [data-close]").forEach((button) => {
  button.addEventListener("click", () => {
    const dialog = button.dataset.close
      ? document.getElementById(button.dataset.close)
      : button.closest("dialog");
    if (dialog?.open) dialog.close();
  });
});

document.querySelector("#edit-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const timeInput = form.elements.delivery_time;
  timeInput.required = form.elements.delivery_type.value === "by_time";
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  if (!currentOrder) return;

  const body = new FormData(form);
  if (form.elements.delivery_type.value !== "by_time") body.delete("delivery_time");
  try {
    await apiRequest(`/orders/${currentOrder.id}`, { method: "PUT", body });
    document.querySelector("#edit-dialog").close();
    await refreshOrders();
    renderOrders();
    showStatus("Заказ успешно изменён.");
  } catch (error) {
    showStatus(error.message, true);
    window.alert(error.message);
  }
});

document.querySelector("#confirm-delete").addEventListener("click", async () => {
  if (!currentOrder) return;
  try {
    await apiRequest(`/orders/${currentOrder.id}`, { method: "DELETE" });
    document.querySelector("#delete-dialog").close();
    orders = orders.filter((order) => String(order.id) !== String(currentOrder.id));
    currentOrder = null;
    renderOrders();
    showStatus("Заказ успешно удалён.");
  } catch (error) {
    showStatus(error.message, true);
    window.alert(error.message);
  }
});

document.querySelector("#edit-delivery-type").addEventListener("change", (event) => {
  document.querySelector("#edit-delivery-time").required = event.target.value === "by_time";
});

Promise.all([loadDishes(), refreshOrders()])
  .then(([loadedDishes]) => {
    orderDishes = loadedDishes;
    renderOrders();
  })
  .catch((error) => showStatus(error.message || "Не удалось загрузить заказы.", true));
