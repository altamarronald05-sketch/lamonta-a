/**
 * DISTRIBUCIONES LA MONTAÑA SAS (LA MONTAÑA AARON)
 * Motor de Carrito con Descuentos por Escala de Volumen y Checkout a WhatsApp (+57 311 3066782)
 */

const WHATSAPP_PHONE = "573113066782";
const CART_STORAGE_KEY = "la_montana_cart_v1";

// Estado del Carrito
let cart = [];

// Inicializar al cargar
document.addEventListener("DOMContentLoaded", () => {
  loadCart();
  setupCartUI();
  updateCartBadge();
});

// Cargar Carrito desde localStorage
function loadCart() {
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    cart = saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.error("Error loading cart:", e);
    cart = [];
  }
}

// Guardar Carrito en localStorage
function saveCart() {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    updateCartBadge();
    renderCartDrawer();
  } catch (e) {
    console.error("Error saving cart:", e);
  }
}

// Encontrar producto en catálogo
function getProductById(productId) {
  if (typeof PRODUCTS_DATA === "undefined") return null;
  return PRODUCTS_DATA.find(p => p.id === productId || p.code === productId);
}

// Calcular precio unitario según volumen (Escala real del Excel)
function getPriceForQuantity(product, qty) {
  if (!product) return 0;
  if (qty >= 12) {
    return product.priceWholesale || product.price12 || product.priceUnit;
  } else if (qty >= 6) {
    return product.price6 || product.priceUnit;
  }
  return product.priceUnit;
}

// Agregar producto al carrito
function addToCart(productId, qty = 1) {
  const product = getProductById(productId);
  if (!product) return;

  const existing = cart.find(item => item.id === productId);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({
      id: product.id,
      code: product.code,
      name: product.name,
      presentation: product.presentation,
      image: product.image,
      priceUnit: product.priceUnit,
      price6: product.price6,
      price12: product.price12,
      priceWholesale: product.priceWholesale,
      qty: qty
    });
  }

  saveCart();
  showToast(`¡Agregaste "${product.name}" al pedido!`);
  openCartDrawer();
}

// Actualizar cantidad
function updateCartQty(productId, newQty) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;

  if (newQty <= 0) {
    removeFromCart(productId);
  } else {
    item.qty = newQty;
    saveCart();
  }
}

// Eliminar producto
function removeFromCart(productId) {
  cart = cart.filter(i => i.id !== productId);
  saveCart();
  showToast("Producto eliminado del pedido", "info");
}

// Vaciar carrito
function clearCart() {
  cart = [];
  saveCart();
  showToast("El pedido fue vaciado", "info");
}

// Calcular totales
function getCartTotals() {
  let subtotalRegular = 0;
  let totalWithDiscount = 0;
  let totalUnits = 0;

  cart.forEach(item => {
    const product = getProductById(item.id) || item;
    const appliedPrice = getPriceForQuantity(product, item.qty);
    const regularTotal = item.qty * product.priceUnit;
    const actualTotal = item.qty * appliedPrice;

    subtotalRegular += regularTotal;
    totalWithDiscount += actualTotal;
    totalUnits += item.qty;
  });

  const savings = Math.max(0, subtotalRegular - totalWithDiscount);

  return {
    totalUnits,
    subtotalRegular,
    savings,
    totalWithDiscount
  };
}

// Formatear pesos colombianos
function formatCOP(val) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(val);
}

// Actualizar badge del carrito en el navbar
function updateCartBadge() {
  const badges = document.querySelectorAll(".cart-count-badge");
  const totals = getCartTotals();
  badges.forEach(b => {
    b.textContent = totals.totalUnits;
    b.style.transform = "scale(1.25)";
    setTimeout(() => { b.style.transform = "scale(1)"; }, 200);
  });
}

// Renderizar contenido del Drawer
function renderCartDrawer() {
  const itemsContainer = document.getElementById("drawerCartItems");
  const subtotalEl = document.getElementById("drawerSubtotal");
  const savingsEl = document.getElementById("drawerSavings");
  const totalEl = document.getElementById("drawerTotal");
  const bannerEl = document.getElementById("drawerDiscountBanner");

  if (!itemsContainer) return;

  if (cart.length === 0) {
    itemsContainer.innerHTML = `
      <div class="cart-empty-state">
        <svg class="cart-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="8" cy="21" r="1"/>
          <circle cx="19" cy="21" r="1"/>
          <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
        </svg>
        <h4>Tu pedido está vacío</h4>
        <p>Explora nuestras 53 referencias lácteas y cárnicas y obtén precios mayoristas.</p>
        <a href="catalogo.html" class="btn-primary-lg" style="padding: 10px 24px; font-size: 0.9rem; margin-top: 10px;">Ver Catálogo Completo</a>
      </div>
    `;
    if (subtotalEl) subtotalEl.textContent = "$ 0";
    if (savingsEl) savingsEl.textContent = "$ 0";
    if (totalEl) totalEl.textContent = "$ 0";
    if (bannerEl) bannerEl.style.display = "none";
    return;
  }

  const totals = getCartTotals();

  // Banner de incentivo de ahorro
  if (bannerEl) {
    if (totals.savings > 0) {
      bannerEl.style.display = "flex";
      bannerEl.innerHTML = `🎉 <strong>¡Estás ahorrando ${formatCOP(totals.savings)}</strong> por compra en escala mayorista!`;
    } else {
      bannerEl.style.display = "flex";
      bannerEl.innerHTML = `💡 <em>Tip: Añade 6 o 12 unidades de cualquier producto para activar tarifa mayorista.</em>`;
    }
  }

  let html = "";
  cart.forEach(item => {
    const product = getProductById(item.id) || item;
    const appliedPrice = getPriceForQuantity(product, item.qty);
    const itemTotal = appliedPrice * item.qty;
    let tierBadge = "";

    if (item.qty >= 12) {
      tierBadge = `<span class="cart-item-tier-tag">✓ Tarifa Mayorista x12 (${formatCOP(appliedPrice)}/u)</span>`;
    } else if (item.qty >= 6) {
      tierBadge = `<span class="cart-item-tier-tag">✓ Tarifa Especial x6 (${formatCOP(appliedPrice)}/u)</span>`;
    } else {
      tierBadge = `<span style="font-size:0.7rem; color: #71717A;">Tarifa Detal (${formatCOP(appliedPrice)}/u)</span>`;
    }

    html += `
      <div class="cart-item-row" data-id="${item.id}">
        <div class="cart-item-thumb">
          <img src="${item.image}" alt="${item.name}">
        </div>
        <div class="cart-item-details">
          <h4 class="cart-item-title">${item.name}</h4>
          <span style="font-size: 0.72rem; color: #71717A;">${item.presentation}</span>
          ${tierBadge}
          <div class="cart-item-bottom">
            <div class="qty-stepper">
              <button class="btn-qty" onclick="updateCartQty('${item.id}', ${item.qty - 1})">−</button>
              <span class="qty-display">${item.qty}</span>
              <button class="btn-qty" onclick="updateCartQty('${item.id}', ${item.qty + 1})">+</button>
            </div>
            <span class="cart-item-price">${formatCOP(itemTotal)}</span>
            <button class="btn-remove-item" onclick="removeFromCart('${item.id}')" title="Eliminar">✕</button>
          </div>
        </div>
      </div>
    `;
  });

  itemsContainer.innerHTML = html;
  if (subtotalEl) subtotalEl.textContent = formatCOP(totals.subtotalRegular);
  if (savingsEl) savingsEl.textContent = totals.savings > 0 ? `-${formatCOP(totals.savings)}` : "$ 0";
  if (totalEl) totalEl.textContent = formatCOP(totals.totalWithDiscount);
}

// Configuración de interfaz del Drawer
function setupCartUI() {
  const overlay = document.getElementById("cartOverlay");
  const drawer = document.getElementById("cartDrawer");
  const openBtns = document.querySelectorAll(".btn-cart-toggle");
  const closeBtns = document.querySelectorAll(".btn-close-drawer");

  openBtns.forEach(b => b.addEventListener("click", openCartDrawer));
  closeBtns.forEach(b => b.addEventListener("click", closeCartDrawer));
  if (overlay) overlay.addEventListener("click", closeCartDrawer);

  const checkoutBtn = document.getElementById("btnCheckoutWhatsApp");
  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", checkoutToWhatsApp);
  }
}

function openCartDrawer() {
  renderCartDrawer();
  const overlay = document.getElementById("cartOverlay");
  const drawer = document.getElementById("cartDrawer");
  if (overlay) overlay.classList.add("active");
  if (drawer) drawer.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeCartDrawer() {
  const overlay = document.getElementById("cartOverlay");
  const drawer = document.getElementById("cartDrawer");
  if (overlay) overlay.classList.remove("active");
  if (drawer) drawer.classList.remove("active");
  document.body.style.overflow = "";
}

// Generador del Pedido Oficial para WhatsApp
function checkoutToWhatsApp() {
  if (cart.length === 0) {
    showToast("Tu carrito está vacío", "warning");
    return;
  }

  const nameInput = document.getElementById("custName");
  const addressInput = document.getElementById("custAddress");
  const cityInput = document.getElementById("custCity");
  const notesInput = document.getElementById("custNotes");

  const customerName = nameInput && nameInput.value.trim() ? nameInput.value.trim() : "Cliente Comercial";
  const address = addressInput && addressInput.value.trim() ? addressInput.value.trim() : "Por definir";
  const city = cityInput && cityInput.value.trim() ? cityInput.value.trim() : "Bogotá D.C.";
  const notes = notesInput && notesInput.value.trim() ? notesInput.value.trim() : "Ninguna";

  const totals = getCartTotals();

  let message = `🧀 *DISTRIBUCIONES LA MONTAÑA SAS (La Montaña Aarón)*\n`;
  message += `*NIT:* 901712016\n`;
  message += `*NUEVO PEDIDO DESDE CATÁLOGO WEB*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  message += `👤 *Cliente:* ${customerName}\n`;
  message += `📍 *Dirección:* ${address}\n`;
  message += `🏙️ *Ciudad / Zona:* ${city}\n`;
  if (notes !== "Ninguna") message += `📝 *Observaciones:* ${notes}\n`;
  message += `\n📦 *DETALLE DE PRODUCTOS:* \n\n`;

  cart.forEach((item, idx) => {
    const product = getProductById(item.id) || item;
    const price = getPriceForQuantity(product, item.qty);
    const sub = price * item.qty;
    let tierDesc = "Tarifa Detal";
    if (item.qty >= 12) tierDesc = "Mayorista x12";
    else if (item.qty >= 6) tierDesc = "Especial x6";

    message += `${idx + 1}. *${item.name}*\n`;
    message += `   • Cant: ${item.qty} uds | Pres: ${item.presentation}\n`;
    message += `   • Precio: ${formatCOP(price)} c/u (${tierDesc})\n`;
    message += `   • Subtotal: ${formatCOP(sub)}\n\n`;
  });

  message += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `💰 *Subtotal regular:* ${formatCOP(totals.subtotalRegular)}\n`;
  if (totals.savings > 0) {
    message += `🎉 *Ahorro por Volumen:* -${formatCOP(totals.savings)}\n`;
  }
  message += `🏷️ *TOTAL A PAGAR:* ${formatCOP(totals.totalWithDiscount)}\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  message += `🚛 *Solicitud:* Por favor confirmar disponibilidad, programación de ruta refrigerada y método de pago (Transferencia Bancolombia / Contraentrega).`;

  const url = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

// Notificación Toast flotante
function showToast(message, type = "success") {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === "success" ? "✓" : "ℹ"}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
