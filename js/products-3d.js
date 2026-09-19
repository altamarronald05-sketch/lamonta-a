/**
 * DISTRIBUCIONES LA MONTAÑA SAS (LA MONTAÑA AARON)
 * Módulo 3D: Efecto Tilt Parallax en Tarjetas + Visor 3D Interactivo 360°
 */

// ==========================================================================
// 1. EFECTO 3D TILT PARALLAX CON CURSOR EN TODAS LAS TARJETAS
// ==========================================================================
function init3DCardTilt() {
  const cards = document.querySelectorAll(".product-card");
  
  cards.forEach(card => {
    // Si ya fue inicializada, saltar
    if (card.dataset.tilt3d) return;
    card.dataset.tilt3d = "true";

    // Añadir brillo / glare overlay
    let glare = card.querySelector(".card-glare-3d");
    if (!glare) {
      glare = document.createElement("div");
      glare.className = "card-glare-3d";
      card.appendChild(glare);
    }

    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = ((y - centerY) / centerY) * -12; // Invertido para sensación de profundidad
      const rotateY = ((x - centerX) / centerX) * 12;
      
      card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`;

      // Posición del reflejo especular de luz
      const glareX = (x / rect.width) * 100;
      const glareY = (y / rect.height) * 100;
      glare.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0) 75%)`;
      glare.style.opacity = "1";
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
      glare.style.opacity = "0";
    });
  });
}

// ==========================================================================
// 2. VISOR 3D 360° INTERACTIVO (THREE.JS + PROCEDURAL PACKAGING SHADERS)
// ==========================================================================

let scene3D, camera3D, renderer3D, currentMesh3D, animFrameId3D;
let isAutoRotating = true;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let currentActiveProduct = null;

function init3DViewer() {
  create3DModalMarkup();
}

function create3DModalMarkup() {
  if (document.getElementById("modal3D")) return;

  const modal = document.createElement("div");
  modal.id = "modal3D";
  modal.className = "modal-3d-overlay";
  modal.innerHTML = `
    <div class="modal-3d-container">
      <!-- Barra superior modal -->
      <div class="modal-3d-header">
        <div class="modal-3d-title-box">
          <span class="badge-3d-pill">✨ VISOR 3D 360° INTERACTIVO</span>
          <h3 id="modal3DTitle">Inspección Tridimensional de Empaque</h3>
        </div>
        <button class="btn-close-3d" onclick="close3DModal()" title="Cerrar visor">✕</button>
      </div>

      <!-- Área principal: Escena 3D + Panel de Información -->
      <div class="modal-3d-body">
        <div class="canvas-3d-wrapper" id="canvas3DContainer">
          <!-- Canvas WebGL inyectado aquí -->
          <div class="hint-3d-drag">
            <span>🖱️ Arrastra para girar en 360° • Usa la rueda para hacer zoom</span>
          </div>

          <!-- Controles rápidos 3D -->
          <div class="controls-3d-bar">
            <button class="btn-3d-action" id="btnToggleRotate" onclick="toggleAutoRotate()">
              <span>🔄 Pausar Giro</span>
            </button>
            <button class="btn-3d-action" onclick="reset3DCamera()">
              <span>🎯 Centrar</span>
            </button>
            <button class="btn-3d-action" onclick="zoom3D(-1)">
              <span>🔍 + Zoom</span>
            </button>
            <button class="btn-3d-action" onclick="zoom3D(1)">
              <span>🔍 − Zoom</span>
            </button>
          </div>
        </div>

        <!-- Panel Lateral de Detalles del Producto -->
        <div class="info-3d-sidebar">
          <div class="info-3d-header">
            <span class="card-category-sub" id="modal3DCategory">Quesos y Lácteos</span>
            <h2 id="modal3DProdName" class="info-3d-name">Queso Mozzarella Tajado</h2>
            <span class="card-presentation-pill" id="modal3DPresentation">1.250 gr (140 lonchas)</span>
          </div>

          <p class="info-3d-description" id="modal3DDescription">
            Empaque termoformado al vacío con atmósfera controlada que conserva el hilado natural y la frescura láctea.
          </p>

          <!-- Escala de Precios en el Visor 3D -->
          <div class="card-pricing-box" style="margin: 16px 0;">
            <div class="price-main-display">
              <span class="price-val" id="modal3DPriceUnit">$ 0</span>
              <span class="price-unit-label">Precio al Detal</span>
            </div>
            <div class="volume-tiers-row">
              <div class="tier-item">
                <span class="tier-badge">Detal</span>
                <span class="tier-price-val" id="modal3DTierDetal">$ 0</span>
              </div>
              <div class="tier-item">
                <span class="tier-badge">x6 Uds</span>
                <span class="tier-price-val" id="modal3DTier6">$ 0</span>
              </div>
              <div class="tier-item highlight-wholesale">
                <span class="tier-badge">Canastilla</span>
                <span class="tier-price-val" id="modal3DTierWholesale">$ 0</span>
              </div>
            </div>
          </div>

          <!-- Acciones de Compra -->
          <div class="modal-3d-actions">
            <div class="qty-stepper">
              <button class="btn-qty" onclick="adjust3DQty(-1)">−</button>
              <span class="qty-display" id="modal3DQty">1</span>
              <button class="btn-qty" onclick="adjust3DQty(1)">+</button>
            </div>
            <button class="btn-primary-lg" style="flex-grow: 1; padding: 12px 18px; font-size: 0.92rem;" onclick="addCurrent3DToCart()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
              <span>Añadir al Pedido</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Cerrar con Escape o clic fuera
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close3DModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close3DModal();
  });
}

let modal3DQtyVal = 1;
function adjust3DQty(delta) {
  modal3DQtyVal = Math.max(1, modal3DQtyVal + delta);
  document.getElementById("modal3DQty").textContent = modal3DQtyVal;
}

function addCurrent3DToCart() {
  if (currentActiveProduct) {
    addToCart(currentActiveProduct.id, modal3DQtyVal);
    close3DModal();
  }
}

// Abrir Modal 3D para un producto
function open3DViewerForProduct(productId) {
  const product = getProductById(productId);
  if (!product) return;

  currentActiveProduct = product;
  modal3DQtyVal = 1;

  create3DModalMarkup();
  const modal = document.getElementById("modal3D");

  // Rellenar información
  document.getElementById("modal3DTitle").textContent = `Empaque 3D: ${product.name}`;
  document.getElementById("modal3DCategory").textContent = product.categoryName;
  document.getElementById("modal3DProdName").textContent = product.name;
  document.getElementById("modal3DPresentation").textContent = `⚖️ ${product.presentation}`;
  document.getElementById("modal3DDescription").textContent = product.description || "Producto elaborado bajo estrictos estándares BPM e inocuidad alimentaria Invima con cadena de frío garantizada.";
  document.getElementById("modal3DPriceUnit").textContent = formatCOP(product.priceUnit);
  document.getElementById("modal3DTierDetal").textContent = formatCOP(product.priceUnit);
  document.getElementById("modal3DTier6").textContent = formatCOP(product.price6);
  document.getElementById("modal3DTierWholesale").textContent = formatCOP(product.priceWholesale);
  document.getElementById("modal3DQty").textContent = "1";

  modal.classList.add("active");
  document.body.style.overflow = "hidden";

  // Iniciar motor Three.js para este producto
  setTimeout(() => {
    setupThreeJSScene(product);
  }, 50);
}

function close3DModal() {
  const modal = document.getElementById("modal3D");
  if (modal) modal.classList.remove("active");
  document.body.style.overflow = "";

  if (animFrameId3D) {
    cancelAnimationFrame(animFrameId3D);
  }
}

function toggleAutoRotate() {
  isAutoRotating = !isAutoRotating;
  const btn = document.getElementById("btnToggleRotate");
  if (btn) {
    btn.innerHTML = isAutoRotating ? "<span>🔄 Pausar Giro</span>" : "<span>▶️ Reanudar Giro</span>";
  }
}

function reset3DCamera() {
  if (camera3D && currentMesh3D) {
    camera3D.position.set(0, 0, 5);
    currentMesh3D.rotation.set(0.2, -0.4, 0);
  }
}

function zoom3D(dir) {
  if (camera3D) {
    camera3D.position.z = Math.max(2.8, Math.min(8, camera3D.position.z + dir * 0.6));
  }
}

// Configuración de Three.js Scene
function setupThreeJSScene(product) {
  const container = document.getElementById("canvas3DContainer");
  if (!container) return;

  // Limpiar canvas anterior si existe
  const existingCanvas = container.querySelector("canvas");
  if (existingCanvas) existingCanvas.remove();

  const width = container.clientWidth || 550;
  const height = container.clientHeight || 450;

  // Si Three.js no está cargado, cargar dinámicamente o usar fallback CSS3D
  if (typeof THREE === "undefined") {
    loadThreeJS(() => setupThreeJSScene(product));
    return;
  }

  // 1. Escena
  scene3D = new THREE.Scene();

  // 2. Cámara
  camera3D = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera3D.position.set(0, 0, 5.2);

  // 3. Renderer con antialiasing
  renderer3D = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer3D.setSize(width, height);
  renderer3D.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer3D.shadowMap.enabled = true;
  renderer3D.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer3D.domElement);

  // 4. Luces de estudio fotográfico
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
  scene3D.add(ambientLight);

  const mainLight = new THREE.DirectionalLight(0xfff7ed, 1.2);
  mainLight.position.set(5, 8, 5);
  mainLight.castShadow = true;
  scene3D.add(mainLight);

  const rimLight = new THREE.DirectionalLight(0xffb703, 0.6); // Luz dorada de borde
  rimLight.position.set(-5, -3, -3);
  scene3D.add(rimLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
  fillLight.position.set(-4, 3, 3);
  scene3D.add(fillLight);

  // 5. Construir Modelo Tridimensional del Producto
  currentMesh3D = buildProduct3DMesh(product);
  scene3D.add(currentMesh3D);

  // Sombra de contacto inferior
  const shadowGeo = new THREE.PlaneGeometry(3.5, 3.5);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x18181b,
    transparent: true,
    opacity: 0.15
  });
  const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = -1.6;
  scene3D.add(shadowPlane);

  // 6. Interacción de arrastre con el ratón
  const canvas = renderer3D.domElement;
  canvas.style.cursor = "grab";

  canvas.addEventListener("mousedown", (e) => {
    isDragging = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
    canvas.style.cursor = "grabbing";
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDragging || !currentMesh3D) return;
    const deltaX = e.clientX - previousMousePosition.x;
    const deltaY = e.clientY - previousMousePosition.y;

    currentMesh3D.rotation.y += deltaX * 0.008;
    currentMesh3D.rotation.x += deltaY * 0.008;

    previousMousePosition = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener("mouseup", () => {
    isDragging = false;
    canvas.style.cursor = "grab";
  });

  // Rueda de zoom
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    zoom3D(e.deltaY > 0 ? 1 : -1);
  }, { passive: false });

  // 7. Loop de Animación
  isAutoRotating = true;
  function animate() {
    animFrameId3D = requestAnimationFrame(animate);

    if (isAutoRotating && !isDragging && currentMesh3D) {
      currentMesh3D.rotation.y += 0.006;
    }

    renderer3D.render(scene3D, camera3D);
  }
  animate();
}

// Generador de Geometría y Texturas 3D Paramétricas según el tipo de producto
function buildProduct3DMesh(product) {
  const group = new THREE.Group();
  const cat = product.category;
  const name = product.name.toLowerCase();

  // Canvas para generar textura con branding oficial
  function createBrandedTexture(title, subtitle, colorPrimary = "#C1121F", badgeText = "LA MONTAÑA") {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    // Fondo
    ctx.fillStyle = "#FAF8F5";
    ctx.fillRect(0, 0, 512, 512);

    // Cabecera institucional roja
    ctx.fillStyle = colorPrimary;
    ctx.fillRect(0, 0, 512, 140);

    // Rayos dorados
    ctx.fillStyle = "#FFB703";
    ctx.beginPath();
    ctx.arc(256, 140, 70, Math.PI, 0, false);
    ctx.fill();

    // Texto de marca
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 34px 'Plus Jakarta Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("LA MONTAÑA AARON", 256, 65);

    ctx.fillStyle = "#FFB703";
    ctx.font = "bold 20px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("DISTRIBUCIONES SAS • NIT 901712016", 256, 100);

    // Título del Producto
    ctx.fillStyle = "#18181B";
    ctx.font = "900 28px 'Plus Jakarta Sans', sans-serif";
    wrapText(ctx, title.toUpperCase(), 256, 210, 460, 36);

    // Subtítulo / Gramaje
    ctx.fillStyle = colorPrimary;
    ctx.font = "bold 22px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText(subtitle, 256, 330);

    // Sellos de Calidad
    ctx.fillStyle = "#15803D";
    ctx.fillRect(106, 380, 300, 44);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 18px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("CADENA DE FRÍO GARANTIZADA", 256, 408);

    // Código de barras simulado
    ctx.fillStyle = "#18181B";
    for (let i = 80; i < 430; i += 8) {
      const w = Math.random() > 0.4 ? 4 : 2;
      ctx.fillRect(i, 445, w, 45);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(" ");
    let line = "";
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + " ";
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
  }

  // --- CASO 1: QUESO MOZZARELLA EN BLOQUE O BARRA ---
  if (name.includes("barra") || name.includes("bloque")) {
    const geo = new THREE.BoxGeometry(2.4, 1.4, 1.4);
    const texture = createBrandedTexture(product.name, product.presentation, "#C1121F");

    const matSide = new THREE.MeshStandardMaterial({
      color: 0xFDE047, // Amarillo mozzarella
      roughness: 0.4,
      metalness: 0.1
    });

    const matFront = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.25,
      metalness: 0.05
    });

    const materials = [matSide, matSide, matSide, matSide, matFront, matSide];
    const block = new THREE.Mesh(geo, materials);
    group.add(block);
  }
  // --- CASO 2: QUESO MOZZARELLA TAJADO / EMPAQUE AL VACÍO PLANO ---
  else if (name.includes("tajado") || name.includes("tocineta") || name.includes("jamón") || name.includes("jamon")) {
    // Paquete rectangular termoformado delgado
    const geo = new THREE.BoxGeometry(2.3, 2.6, 0.45);
    const texture = createBrandedTexture(product.name, product.presentation, name.includes("tocineta") ? "#991B1B" : "#C1121F");

    const matPlastic = new THREE.MeshPhysicalMaterial({
      color: 0xFFFFFF,
      roughness: 0.1,
      metalness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1
    });

    const matLabel = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.3,
      metalness: 0.05
    });

    const materials = [matPlastic, matPlastic, matPlastic, matPlastic, matLabel, matPlastic];
    const pouch = new THREE.Mesh(geo, materials);
    group.add(pouch);
  }
  // --- CASO 3: SUERO COSTEÑO O YOGURT (BOTELLA / TARRO CILÍNDRICO) ---
  else if (name.includes("suero") || name.includes("yogurt")) {
    // Botella cilíndrica con tapa
    const bodyGeo = new THREE.CylinderGeometry(0.85, 0.85, 2.4, 32);
    const texture = createBrandedTexture(product.name, product.presentation, "#0284C7");
    
    const bodyMat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.3
    });
    const bottle = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(bottle);

    // Tapa roja/dorada
    const capGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.35, 32);
    const capMat = new THREE.MeshStandardMaterial({
      color: 0xC1121F,
      roughness: 0.2,
      metalness: 0.3
    });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.y = 1.3;
    group.add(cap);
  }
  // --- CASO 4: CHORIZO O SALCHICHÓN (CILÍNDRICO / BASTÓN CÁRNICO) ---
  else if (cat === "chorizos" || name.includes("salchichón") || name.includes("salchicha")) {
    const bodyGeo = new THREE.CylinderGeometry(0.65, 0.65, 2.8, 32);
    const texture = createBrandedTexture(product.name, product.presentation, "#780000");

    const meatMat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.35,
      metalness: 0.1
    });
    const sausage = new THREE.Mesh(bodyGeo, meatMat);
    group.add(sausage);

    // Grapas metálicas en los extremos
    const clipGeo = new THREE.TorusGeometry(0.55, 0.08, 16, 32);
    const clipMat = new THREE.MeshStandardMaterial({ color: 0xD1D5DB, metalness: 0.8, roughness: 0.2 });
    const topClip = new THREE.Mesh(clipGeo, clipMat);
    topClip.position.y = 1.35;
    topClip.rotation.x = Math.PI / 2;
    group.add(topClip);

    const botClip = new THREE.Mesh(clipGeo, clipMat);
    botClip.position.y = -1.35;
    botClip.rotation.x = Math.PI / 2;
    group.add(botClip);
  }
  // --- CASO 5: GENÉRICO / FORMATO INSTITUCIONAL ---
  else {
    const geo = new THREE.BoxGeometry(2.2, 2.2, 1.2);
    const texture = createBrandedTexture(product.name, product.presentation, "#D97706");
    const matSide = new THREE.MeshStandardMaterial({ color: 0xF4F4F5, roughness: 0.4 });
    const matFront = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.25 });
    const materials = [matSide, matSide, matSide, matSide, matFront, matSide];
    const box = new THREE.Mesh(geo, materials);
    group.add(box);
  }

  // Ángulo inicial estético
  group.rotation.set(0.2, -0.4, 0);
  return group;
}

// Carga dinámica de Three.js desde CDN confiable
function loadThreeJS(callback) {
  if (typeof THREE !== "undefined") {
    callback();
    return;
  }

  const script = document.createElement("script");
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
  script.onload = () => {
    console.log("Three.js loaded successfully");
    callback();
  };
  script.onerror = () => {
    console.warn("Could not load Three.js via CDN, falling back to CSS 3D.");
    // Fallback simple si no hay red
    callback();
  };
  document.head.appendChild(script);
}

// Inicializar al cargar el DOM
document.addEventListener("DOMContentLoaded", () => {
  init3DCardTilt();
  init3DViewer();
});
