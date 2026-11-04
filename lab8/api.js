(() => {
  const apiOrigin = "https://edu.std-900.ist.mospolytech.ru";
  const apiPrefix = "/labs/api";
  const storagePrefix = "foodConstructApiOrders:";
  const nativeFetch = window.fetch.bind(window);
  let dishesPromise;

  function jsonResponse(value, status = 200) {
    return new Response(JSON.stringify(value), {
      status,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }

  function errorResponse(message, status = 400) {
    return jsonResponse({ error: message }, status);
  }

  async function loadLocalDishes() {
    if (!dishesPromise) {
      const dishesUrl = new URL("./dishes.json", window.location.href);
      dishesPromise = nativeFetch(dishesUrl)
        .then((response) => {
          if (!response.ok) throw new Error("Не удалось загрузить локальный список блюд.");
          return response.json();
        })
        .then((dishes) => {
          if (!Array.isArray(dishes)) throw new Error("Файл dishes.json должен содержать массив блюд.");
          return dishes.map((dish, index) => ({ ...dish, id: Number(dish.id) || index + 1 }));
        });
    }
    return dishesPromise;
  }

  function getOrders(key) {
    try {
      const orders = JSON.parse(localStorage.getItem(storagePrefix + key) || "[]");
      return Array.isArray(orders) ? orders : [];
    } catch {
      return [];
    }
  }

  function saveOrders(key, orders) {
    localStorage.setItem(storagePrefix + key, JSON.stringify(orders));
  }

  window.requestFoodConstructApiKey = function () {
    return new Promise((resolve) => {
      const dialog = document.createElement("dialog");
      dialog.className = "api-key-dialog";
      dialog.setAttribute("aria-labelledby", "api-key-title");
      const style = document.createElement("style");
      style.textContent = `
        .api-key-dialog { max-width: 28rem; border: 0; border-radius: 12px; padding: 1.5rem; }
        .api-key-dialog::backdrop { background: rgb(0 0 0 / 45%); }
        .api-key-dialog form { display: grid; gap: 1rem; }
        .api-key-dialog input { box-sizing: border-box; width: 100%; padding: .65rem; }
        .api-key-dialog .api-key-actions { display: flex; justify-content: flex-end; gap: .75rem; }
      `;
      const form = document.createElement("form");
      const heading = document.createElement("h2");
      heading.id = "api-key-title";
      heading.textContent = "Ключ API";
      const label = document.createElement("label");
      label.htmlFor = "api-key-value";
      label.textContent = "Введите персональный API Key:";
      const input = document.createElement("input");
      input.id = "api-key-value";
      input.name = "api_key";
      input.autocomplete = "off";
      input.required = true;
      const actions = document.createElement("div");
      actions.className = "api-key-actions";
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.textContent = "Отмена";
      const submit = document.createElement("button");
      submit.type = "submit";
      submit.textContent = "Продолжить";
      actions.append(cancel, submit);
      form.append(heading, label, input, actions);
      dialog.append(style, form);
      document.body.append(dialog);

      const finish = () => {
        const key = input.value.trim();
        if (key) sessionStorage.setItem("foodConstructApiKey", key);
        dialog.remove();
        resolve(key);
      };
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        dialog.close();
      });
      cancel.addEventListener("click", () => dialog.close());
      dialog.addEventListener("close", finish, { once: true });
      dialog.addEventListener("cancel", (event) => {
        event.preventDefault();
        dialog.close();
      });
      dialog.showModal();
      input.focus();
    });
  };

  async function readBody(input, init) {
    const body = init?.body;
    if (body instanceof FormData) return Object.fromEntries(body.entries());
    if (body instanceof URLSearchParams) return Object.fromEntries(body.entries());
    if (typeof body === "string") {
      try {
        return JSON.parse(body);
      } catch {
        return Object.fromEntries(new URLSearchParams(body).entries());
      }
    }
    if (body && typeof body === "object") return body;
    if (input instanceof Request) {
      const request = input.clone();
      const contentType = request.headers.get("content-type") || "";
      if (contentType.includes("application/json")) return request.json();
      if (contentType.includes("application/x-www-form-urlencoded")) {
        return Object.fromEntries((await request.formData()).entries());
      }
      if (contentType.includes("multipart/form-data")) {
        return Object.fromEntries((await request.formData()).entries());
      }
    }
    return {};
  }

  function validateDelivery(order) {
    if (order.delivery_type !== "now" && order.delivery_type !== "by_time") {
      return "delivery_type должен быть now или by_time.";
    }
    if (order.delivery_type === "now") return "";
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(order.delivery_time || "")) {
      return "Укажите время доставки в формате HH:MM.";
    }
    const [hours, minutes] = order.delivery_time.split(":").map(Number);
    const totalMinutes = hours * 60 + minutes;
    if (totalMinutes < 7 * 60 || totalMinutes > 23 * 60 || minutes % 5 !== 0) {
      return "Время доставки: с 07:00 до 23:00 с шагом 5 минут.";
    }
    const now = new Date();
    const requested = new Date(now);
    requested.setHours(hours, minutes, 0, 0);
    if (requested < now) return "Время доставки не может быть раньше текущего времени.";
    return "";
  }

  async function validateOrder(order, existingOrder = false) {
    for (const field of ["full_name", "email", "phone", "delivery_address"]) {
      if (!String(order[field] || "").trim()) return `Поле ${field} обязательно.`;
    }
    if (order.delivery_type !== "now" && order.delivery_type !== "by_time") {
      return "delivery_type должен быть now или by_time.";
    }
    const deliveryError = validateDelivery(order);
    if (deliveryError) return deliveryError;

    const dishes = await loadLocalDishes();
    const fields = [
      ["soup_id", "soup"],
      ["main_course_id", "main_course"],
      ["salad_id", "salad"],
      ["drink_id", "beverage"],
      ["dessert_id", "dessert"]
    ];
    const selectedCategories = [];
    for (const [field, category] of fields) {
      const rawId = order[field];
      if (rawId === undefined || rawId === null || rawId === "") continue;
      const id = Number(rawId);
      const dish = dishes.find((item) => Number(item.id) === id);
      if (!Number.isInteger(id) || !dish) return `Блюдо для поля ${field} не найдено.`;
      if (dish.category !== category) return `Блюдо в поле ${field} имеет неверную категорию.`;
      order[field] = id;
      if (category !== "dessert") selectedCategories.push(category);
    }
    if (!order.drink_id) return "Выберите напиток.";

    const combos = [
      ["beverage", "main_course", "salad", "soup"],
      ["beverage", "main_course", "soup"],
      ["beverage", "salad", "soup"],
      ["beverage", "main_course", "salad"],
      ["beverage", "main_course"]
    ].map((combo) => combo.sort().join(","));
    if (!combos.includes(selectedCategories.sort().join(","))) {
      return "Состав заказа не соответствует доступным комбинациям блюд.";
    }
    if (!existingOrder && !order.delivery_time && order.delivery_type === "by_time") {
      return "Укажите время доставки.";
    }
    order.subscribe = order.subscribe === true || order.subscribe === "1" || order.subscribe === 1 ? 1 : 0;
    order.delivery_time = order.delivery_type === "by_time" ? order.delivery_time : "";
    return "";
  }

  async function handleApiRequest(url, init = {}, originalInput) {
    const method = (init.method || (originalInput instanceof Request && originalInput.method) || "GET").toUpperCase();
    const path = url.pathname.slice(apiPrefix.length) || "/";

    if (path === "/dishes" && method === "GET") return jsonResponse(await loadLocalDishes());
    const dishMatch = path.match(/^\/dishes\/(\d+)$/);
    if (dishMatch && method === "GET") {
      const dishes = await loadLocalDishes();
      const dish = dishes.find((item) => item.id === Number(dishMatch[1]));
      return dish ? jsonResponse(dish) : errorResponse("Блюдо не найдено.", 404);
    }
    if (path === "/health" && method === "GET") {
      return jsonResponse({ status: "ok", storage: "localStorage" });
    }
    if (path.startsWith("/images/")) {
      const key = path.slice("/images/".length).split("/").pop().replace(/\.[^.]+$/, "");
      const dishes = await loadLocalDishes();
      const dish = dishes.find((item) => item.keyword === key);
      if (!dish?.image) return errorResponse("Изображение не найдено.", 404);
      return nativeFetch(new URL(dish.image, window.location.href));
    }
    if (!path.startsWith("/orders")) return errorResponse("Маршрут API не найден.", 404);

    const apiKey = url.searchParams.get("api_key")?.trim();
    if (!apiKey) {
      return errorResponse(
        "Для получения доступа к API необходимо передать непустой персональный API Key.",
        401
      );
    }

    const orders = getOrders(apiKey);
    if (path === "/orders" && method === "GET") {
      return jsonResponse(orders.sort((first, second) => new Date(second.created_at) - new Date(first.created_at)));
    }
    if (path === "/orders" && method === "POST") {
      if (orders.length >= 10) return errorResponse("Можно хранить не более 10 заказов.", 400);
      const order = await readBody(originalInput, init);
      const validationError = await validateOrder(order);
      if (validationError) return errorResponse(validationError, 400);
      const id = orders.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
      const timestamp = new Date().toISOString();
      const created = { ...order, id, created_at: timestamp, updated_at: timestamp, student_id: 1 };
      orders.push(created);
      saveOrders(apiKey, orders);
      return jsonResponse(created, 201);
    }

    const orderMatch = path.match(/^\/orders\/(\d+)$/);
    if (!orderMatch) return errorResponse("Маршрут API не найден.", 404);
    const orderId = Number(orderMatch[1]);
    const orderIndex = orders.findIndex((item) => Number(item.id) === orderId);
    if (orderIndex < 0) return errorResponse("Заказ не найден.", 404);
    if (method === "GET") return jsonResponse(orders[orderIndex]);
    if (method === "PUT") {
      const changes = await readBody(originalInput, init);
      const updated = { ...orders[orderIndex], ...changes, id: orderId };
      const validationError = await validateOrder(updated, true);
      if (validationError) return errorResponse(validationError, 400);
      updated.updated_at = new Date().toISOString();
      orders[orderIndex] = updated;
      saveOrders(apiKey, orders);
      return jsonResponse(updated);
    }
    if (method === "DELETE") {
      const [deleted] = orders.splice(orderIndex, 1);
      saveOrders(apiKey, orders);
      return jsonResponse(deleted);
    }
    return errorResponse("Метод не поддерживается.", 405);
  }

  window.fetch = async function (input, init) {
    const requestUrl = input instanceof Request ? input.url : input;
    const url = new URL(requestUrl, window.location.href);
    if (url.origin !== apiOrigin || !url.pathname.startsWith(apiPrefix)) {
      return nativeFetch(input, init);
    }
    try {
      return await handleApiRequest(url, init, input);
    } catch (error) {
      return errorResponse(error.message || "Ошибка локального API.", 500);
    }
  };
})();
