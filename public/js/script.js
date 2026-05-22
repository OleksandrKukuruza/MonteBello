
const chatBtn = document.getElementById('chatBtn');
const chatWindow = document.getElementById('chatWindow');
const closeChat = document.getElementById('closeChat');
const chatInput = document.getElementById("chatInput");
const chatBody = document.querySelector('.chat-body');

if (chatBtn && chatWindow && closeChat && chatInput) {

    chatBtn.onclick = () => {
        chatWindow.style.display = 'flex';
        chatBtn.style.display = 'none';
        setTimeout(() => chatInput.focus(), 100);
    };

    closeChat.onclick = () => {
        chatWindow.style.display = 'none';
        chatBtn.style.display = 'block';
    };

    chatInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendMessage();
    });
}

const sendBtn = document.getElementById("sendMsgBtn");

if (sendBtn) {
    sendBtn.addEventListener("click", sendMessage);
}

// send message
function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    // USER -> Firebase
    db.collection("messages").add({
        text: text,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        role: "user"
    });

    chatInput.value = "";

    // ADMIN reply (тільки UI, НЕ база)
    setTimeout(() => {
        showLocalAdminMessage("Thank you for your message! Wait for the administrator's response.");
    }, 800);
}

function showLocalAdminMessage(text) {
    const div = document.createElement("div");
    div.className = "message admin-msg";
    div.textContent = text;

    chatBody.appendChild(div);

    // автоскрол вниз
    chatBody.scrollTop = chatBody.scrollHeight;
}




// realtime messages
db.collection("messages")
  .orderBy("createdAt")
  .onSnapshot(snapshot => {
      chatBody.innerHTML = "";

      snapshot.forEach(doc => {
          const msg = doc.data();

          const div = document.createElement("div");
          div.className = "message user-msg";
          div.textContent = msg.text;

          chatBody.appendChild(div);
      });

      chatBody.scrollTop = chatBody.scrollHeight;
  });





document.getElementById("modalPickupBtn")?.addEventListener("click", () => {
    setOrderType("pickup");
});

document.getElementById("modalDeliveryBtn")?.addEventListener("click", () => {
    setOrderType("delivery");
});

const modalPickupBtn = document.getElementById('modalPickupBtn');
const modalDeliveryBtn = document.getElementById('modalDeliveryBtn');
const pickupContent = document.getElementById('pickupContent');
const deliveryContent = document.getElementById('deliveryContent');

// ЛОГІКА МОДАЛЬНОГО ВІКНА (ORDER ONLINE)
const orderModal = document.getElementById('orderModal');
const closeModal = document.getElementById('closeModal');
const openModalBtn = document.getElementById('openModalBtn');

if (openModalBtn && orderModal) {
    openModalBtn.onclick = function() {
        orderModal.style.display = 'flex';
    }
}

if (closeModal) {
    closeModal.onclick = function() {
        orderModal.style.display = 'none';
    }
}

// Закриття модалки при кліку на фон
window.addEventListener('click', function(event) {

    if (event.target === orderModal) {
        orderModal.style.display = 'none';
    }

    if (event.target === dishModal) {
        dishModal.style.display = 'none';
    }
});

const asapTime = document.getElementById('asapTime');
const scheduleTime = document.getElementById('scheduleTime');
const pickupScheduleDetails = document.getElementById('pickupScheduleDetails');

function togglePickupSchedule() {

    if (!pickupScheduleDetails) return;

    if (scheduleTime && scheduleTime.checked) {
        pickupScheduleDetails.style.display = 'block';
    } else {
        pickupScheduleDetails.style.display = 'none';
    }
}

if (asapTime && scheduleTime) {
    asapTime.addEventListener('change', togglePickupSchedule);
    scheduleTime.addEventListener('change', togglePickupSchedule);
}



const deliveryInput = document.getElementById('deliveryInput');
const autocompleteList = document.getElementById('autocomplete-list');
let debounceTimer;

if (deliveryInput) {
    deliveryInput.addEventListener('input', function() {
        const query = this.value;

        clearTimeout(debounceTimer);

        if (query.length < 3) {
            autocompleteList.innerHTML = '';
            autocompleteList.style.display = 'none';
            return;
        }

        debounceTimer = setTimeout(() => {
            fetchRealAddresses(query);
        }, 300);
    });
}


// Функція запиту з обмеженням по країні
async function fetchRealAddresses(query) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`;

    try {
        const response = await fetch(url, {
            headers: { 'Accept-Language': 'uk' } 
        });
        const data = await response.json();
        displaySuggestions(data);
    } catch (error) {
        console.error('Помилка завантаження адрес:', error);
    }
}

function displaySuggestions(locations) {
    autocompleteList.innerHTML = '';
    if (locations.length === 0) {
        autocompleteList.style.display = 'none';
        return;
    }
    autocompleteList.style.display = 'block';

    locations.forEach(loc => {
        const item = document.createElement('div');
        item.classList.add('suggestion-item');
        
        const addr = loc.address;
        const countryName = addr.country || "";
        
        const displayParts = [
            addr.road, 
            addr.city || addr.town || addr.village, 
            addr.state, 
            countryName
        ].filter(Boolean);
        
        const cleanName = [...new Set(displayParts)].join(', ');

        item.innerText = cleanName;
        
        item.addEventListener('click', function() {
            deliveryInput.value = cleanName;
        
            const draft = JSON.parse(localStorage.getItem("orderDraft")) || {};
            draft.address = cleanName;
            localStorage.setItem("orderDraft", JSON.stringify(draft));
        
            autocompleteList.style.display = 'none';

            const errorBlock = document.getElementById('deliveryError');
            const timeSettings = document.getElementById('deliveryTimeSettings');
            const saveBtn = document.getElementById('saveOrderBtn');

            if (countryName === "Україна" || loc.address.country_code === "ua") {
                if (errorBlock) errorBlock.style.display = 'none';
                if (timeSettings) timeSettings.style.display = 'block';
                deliveryInput.style.borderColor = '#ccc';
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.style.backgroundColor = '#000';
                    saveBtn.style.color = '#fff';
                    saveBtn.style.cursor = 'pointer';
                }
            } else {
                if (errorBlock) errorBlock.style.display = 'block';
                if (timeSettings) timeSettings.style.display = 'none';
                deliveryInput.style.borderColor = '#ff4d4d';
                if (saveBtn) {
                    saveBtn.disabled = true;
                    saveBtn.style.backgroundColor = '#ccc'; 
                    saveBtn.style.cursor = 'not-allowed';
                }
            }
        });
        
        autocompleteList.appendChild(item);
    });
}

document.addEventListener('click', (e) => {
    if (deliveryInput && autocompleteList && e.target !== deliveryInput) {
        autocompleteList.style.display = 'none';
    }
});


// ЛОГІКА ПЕРЕМИКАННЯ ЧАСУ ДЛЯ DELIVERY
const asapDelivery = document.getElementById('asapDelivery');
const scheduleDelivery = document.getElementById('scheduleDelivery');
const deliveryScheduleDetails = document.getElementById('deliveryScheduleDetails');

function toggleDeliverySchedule() {
    if (scheduleDelivery && scheduleDelivery.checked) {
        deliveryScheduleDetails.style.display = 'block';
    } else {
        deliveryScheduleDetails.style.display = 'none';
    }
}

if (asapDelivery && scheduleDelivery) {
    asapDelivery.addEventListener('change', toggleDeliverySchedule);
    scheduleDelivery.addEventListener('change', toggleDeliverySchedule);
}


let cart = JSON.parse(localStorage.getItem("cart")) || [];
const cartIcon = document.getElementById("cartIcon");
const cartSidebar = document.getElementById("cartSidebar");
const cartOverlay = document.getElementById("cartOverlay");
const closeCart = document.getElementById("closeCart");

function getCart() {
    return JSON.parse(localStorage.getItem("cart")) || [];
}

function updateCartCount() {

    const cart = JSON.parse(localStorage.getItem("cart")) || [];

    const count = cart.reduce((sum, item) => {
        return sum + Number(item.qty || 0);
    }, 0);

    const cartCount = document.querySelector(".cart-count");

    if (cartCount) {
        cartCount.textContent = count;
    }
}

if (cartIcon) {
    cartIcon.addEventListener("click", function (e) {
        e.preventDefault();

        const cart = getCart();
        const user = firebase.auth().currentUser;

        if (cart.length === 0) {
            if (user) {
                window.location.href = "profile.html";
                return;
            }

            if (cartSidebar) {
                cartSidebar.classList.add("open");
            }

            if (cartOverlay) {
                cartOverlay.classList.add("active");
            }

            return;
        }

        if (cartSidebar) {
            cartSidebar.classList.add("open");
        }

        if (cartOverlay) {
            cartOverlay.classList.add("active");
        }
    });
}


if (closeCart) {
    closeCart.addEventListener("click", () => {
        if (cartSidebar) {
            cartSidebar.classList.remove("open");
        }

        if (cartOverlay) {
            cartOverlay.classList.remove("active");
        }
    });
}

if (cartOverlay) {
    cartOverlay.addEventListener("click", () => {
        if (cartSidebar) {
            cartSidebar.classList.remove("open");
        }

        if (cartOverlay) {
            cartOverlay.classList.remove("active");
        }
    });
}

updateCartCount();




const saveOrderBtn = document.getElementById('saveOrderBtn');

// Елементи на головній сторінці, де відображається текст
const displayTimeText = document.getElementById('displayTimeText');
const displayAddressText = document.getElementById('displayAddressText');

if (saveOrderBtn) {
    saveOrderBtn.onclick = function () {

        
        const draftRaw = localStorage.getItem("orderDraft");
        const draft = draftRaw ? JSON.parse(draftRaw) : {};
        const isDelivery = draft.type === "delivery";

        if (!draft.type) {
            draft.type = "pickup";
        }

        let finalTimeLabel = "";
        let finalAddressLabel = "";

        if (isDelivery) {

            finalAddressLabel = `Delivery Address: ${draft.address || ""}`;

            const isScheduled = document.getElementById('scheduleDelivery')?.checked;

            if (isScheduled) {
                const date = document.getElementById('deliveryDate')?.value || "";
                const time = document.getElementById('deliveryTime')?.value || "";
                finalTimeLabel = `Delivery time: ${date} ${time}`;
            } else {
                finalTimeLabel = "Delivery time: ASAP";
            }

        } else {

            finalAddressLabel = "Pickup Address: Monte Bello Pickup Point";

            const isScheduled = document.getElementById('scheduleTime')?.checked;

            if (isScheduled) {
                const date = document.getElementById('pickupDate')?.value || "";
                const time = document.getElementById('pickupTime')?.value || "";
                finalTimeLabel = `Pickup time: ${date} ${time}`;
            } else {
                finalTimeLabel = "Pickup time: ASAP";
            }
        }

        saveOrderDraft();

        if (displayTimeText) displayTimeText.textContent = finalTimeLabel;
        if (displayAddressText) displayAddressText.textContent = finalAddressLabel;

        if (orderModal) orderModal.style.display = 'none';
    };
}

function saveOrderDraft() {
    const existing = JSON.parse(localStorage.getItem("orderDraft")) || {};

    const type = existing.type || "pickup";

    const newDraft = {
        ...existing, 

        type,

        name: document.getElementById("customerName")?.value || "",
        email: document.getElementById("customerEmail")?.value || "",
        phone: document.getElementById("customerPhone")?.value || "",
        note: document.getElementById("customerNote")?.value || "",

        address:
    document.getElementById("deliveryInput")?.value ||
    document.getElementById("customerAddress")?.value ||
    "",

        date: document.getElementById("deliveryDate")?.value || "",
        time: document.getElementById("deliveryTime")?.value || ""
    };

    localStorage.setItem("orderDraft", JSON.stringify(newDraft));
}

document.getElementById("pickupDate")?.addEventListener("change", saveOrderDraft);

document.getElementById("pickupTime")?.addEventListener("change", saveOrderDraft);

const changeTimeLink = document.getElementById('changeTimeLink');
const changeAddrLink = document.getElementById('changeAddrLink');

if (changeTimeLink) {
    changeTimeLink.onclick = (e) => {
        e.preventDefault();
        orderModal.style.display = 'flex';
    };
}

if (changeAddrLink) {
    changeAddrLink.onclick = (e) => {
        e.preventDefault();
        orderModal.style.display = 'flex';
    };
}





// ЛОГІКА МОДАЛЬНОГО ВІКНА СТРАВИ
const dishModal = document.getElementById('dishModal');
const closeDishModal = document.getElementById('closeDishModal');
let currentDish = {};
let quantity = 1;


// Кнопка "Add to cart" у модальному вікні
const confirmBtn = document.getElementById('confirmAddToCart');

if (confirmBtn) {
    confirmBtn.onclick = function() {
        const request = document.getElementById('request').value.trim();

        const existingItem = cart.find(item =>
            item.name === currentDish.name &&
            (item.request || "") === request
        );

        if (existingItem) {
            const unitPrice =
                parseFloat(existingItem.price) / parseInt(existingItem.qty);

            existingItem.qty = parseInt(existingItem.qty) + quantity;
            existingItem.price = (unitPrice * existingItem.qty).toFixed(2);
        } else {
            const finalItem = {
                name: currentDish.name,
                price: (currentDish.price * quantity).toFixed(2),
                qty: quantity,
                img: currentDish.img,
                request
            };

            cart.push(finalItem);
        }

        localStorage.setItem("cart", JSON.stringify(cart));
        updateCartUI();

        dishModal.style.display = 'none';
        cartSidebar.classList.add('open');
        cartOverlay.classList.add('active');
    };
}


// ЛОГІКА КЕРУВАННЯ КІЛЬКІСТЮ
const plusQty = document.getElementById('plusQty');

if (plusQty) {
    plusQty.onclick = function() {

    quantity++;
    document.getElementById('qtyValue').textContent = quantity;
    document.getElementById('modalTotalBtn').textContent = (currentDish.price * quantity).toFixed(2);
};
}

const minusQty = document.getElementById('minusQty');

if (minusQty) {
    minusQty.onclick = function() {

    if (quantity > 1) {
        quantity--;
        document.getElementById('qtyValue').textContent = quantity;
        document.getElementById('modalTotalBtn').textContent = (currentDish.price * quantity).toFixed(2);
    }
};
}
if (closeDishModal && dishModal) {
    closeDishModal.onclick = () => {
        dishModal.style.display = 'none';
    };
}





// ЛОГІКА КОШИКА (ДОДАВАННЯ ТА ОНОВЛЕННЯ)

const cartCountElement = document.querySelector('.cart-count');
const cartSidebarContent = document.querySelector('.cart-sidebar-content');
const cartTitleCount = document.querySelector('.cart-title');

// Функція, яка перемальовує кошик щоразу, коли щось змінюється
function updateCartUI() {
    if (!cartCountElement || !cartSidebarContent || !cartTitleCount) {
        return;
    }

    const totalItems = cart.reduce((sum, item) => sum + parseInt(item.qty), 0);

    cartCountElement.textContent = totalItems;
    cartTitleCount.innerHTML = `<strong>Cart</strong> (${totalItems} item${totalItems !== 1 ? 's' : ''})`;

    if (cart.length === 0) {
        cartSidebarContent.innerHTML = '<p class="empty-message">Your cart is empty.</p>';
        localStorage.setItem("cart", JSON.stringify(cart));
        return;
    }

    let cartHTML = '<div class="cart-items-wrapper" style="padding: 20px; flex: 1; overflow-y: auto;">';
    let grandTotal = 0;

    cart.forEach((item, index) => {
        const unitPrice = parseFloat(item.price) / parseInt(item.qty);
        const itemTotal = unitPrice * parseInt(item.qty);

        grandTotal += itemTotal;

        cartHTML += `
            <div class="cart-item-row" style="display: flex; gap: 15px; margin-bottom: 25px; position: relative;">
                <img src="${item.img}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 4px;">

                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <span style="font-weight: bold; font-size: 14px; padding-right: 20px;">
                            ${item.name}
                        </span>

                        <button onclick="removeFromCart(${index})"
                                style="background: none; border: none; cursor: pointer; font-size: 16px;">
                            🗑
                        </button>
                    </div>

                    <div style="font-size: 13px; margin: 5px 0;">
                        $${unitPrice.toFixed(2)}
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">

                        <div class="qty-mini-control"
                             style="border: 1px solid #ccc; display: flex; align-items: center;">

                            <button onclick="decreaseCartQty(${index})"
                                    style="padding: 2px 8px; border: none; background: none; cursor: pointer;">
                                —
                            </button>

                            <span style="padding: 0 8px; font-size: 13px;">
                                ${item.qty}
                            </span>

                            <button onclick="increaseCartQty(${index})"
                                    style="padding: 2px 8px; border: none; background: none; cursor: pointer;">
                                +
                            </button>

                        </div>

                        <div style="font-weight: bold; font-size: 14px;">
                            $${itemTotal.toFixed(2)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    cartHTML += `
        </div>

        <div class="cart-footer-area" style="padding: 20px; border-top: 1px solid #eee; background: #fff;">
            <div style="display: flex; justify-content: space-between; font-size: 16px; margin-bottom: 5px;">
                <span>Estimated total</span>
                <span style="font-weight: bold;">$${grandTotal.toFixed(2)}</span>
            </div>

            <p style="font-size: 11px; margin-bottom: 20px;">
                Taxes and shipping are calculated at checkout.
            </p>

            <button class="btn-checkout"
                    style="width: 100%; background: #000; color: #fff; padding: 14px; border: none; font-weight: bold; margin-bottom: 10px; cursor: pointer;">
                Checkout
            </button>

            <button class="btn-view-cart"
                    style="width: 100%; background: #fff; color: #000; padding: 14px; border: 1px solid #000; font-weight: bold; margin-bottom: 15px; cursor: pointer;">
                View Cart
            </button>
        </div>
    `;

    cartSidebarContent.innerHTML = cartHTML;
    localStorage.setItem("cart", JSON.stringify(cart));
}


window.increaseCartQty = function(index) {
    const item = cart[index];

    const unitPrice = parseFloat(item.price) / parseInt(item.qty);

    item.qty = parseInt(item.qty) + 1;
    item.price = (unitPrice * item.qty).toFixed(2);

    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartUI();
};

window.decreaseCartQty = function(index) {
    const item = cart[index];

    if (parseInt(item.qty) <= 1) {
        removeFromCart(index);
        return;
    }

    const unitPrice = parseFloat(item.price) / parseInt(item.qty);

    item.qty = parseInt(item.qty) - 1;
    item.price = (unitPrice * item.qty).toFixed(2);

    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartUI();
};

// Функція для видалення товару 
window.removeFromCart = function(index) {
    cart.splice(index, 1);
    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartUI();
}


function renderUser(user, userData) {
    const userSection = document.getElementById("userSection");

    if (!user) {
        userSection.innerHTML = `<a href="login.html">Log In</a>`;
        return;
    }

    const name = userData?.name || user.displayName || "User";

    userSection.innerHTML = `
    <div class="user-dropdown">
        <button class="user-btn" id="userBtn">
            <i class="fa-solid fa-user"></i> ${name}
        </button>

        <div class="user-menu" id="userMenu">
            <a href="profile.html" class="user-item">My Profile</a>
            <button id="logoutBtn" class="user-item danger">Logout</button>
        </div>
    </div>
`;

    const btn = document.getElementById("userBtn");
    const menu = document.getElementById("userMenu");
    const logoutBtn = document.getElementById("logoutBtn");

    btn.onclick = (e) => {
        e.stopPropagation();
        menu.classList.toggle("show");
    };

    logoutBtn.onclick = async () => {
        await firebase.auth().signOut();
        window.location.reload();
    };

    document.addEventListener("click", () => {
        menu.classList.remove("show");
    });
}


firebase.auth().onAuthStateChanged(async (user) => {

    if (!user) {
        renderUser(null, null);
        hideLoader();
        return;
    }

    const doc = await db.collection("users").doc(user.uid).get();
    const data = doc.data();

    renderUser(user, data);

    if (!localStorage.getItem("cart")) {
        localStorage.setItem("cart", JSON.stringify([]));
    }

    hideLoader();
});







async function checkUserAndRedirect() {
    const user = firebase.auth().currentUser;
    const cart = JSON.parse(localStorage.getItem("cart")) || [];

    if (cart.length === 0) {
        alert("Cart is empty");
        return;
    }

    if (user) {
        window.location.href = "profile.html";
    } else {
        alert("Please log in first");
        window.location.href = "login.html";
    }
}



document.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn-view-cart")) {
        e.preventDefault();
        checkUserAndRedirect();
    }
});



window.addEventListener("load", () => {

    const loader = document.getElementById("pageLoader");

    // ДАТА І ЧАС

    const now = new Date();

    // YYYY-MM-DD
    const today = now.toISOString().split("T")[0];

    // +30 хв
    now.setMinutes(now.getMinutes() + 30);

    // округлення до 5 хв
    let minutes = now.getMinutes();
    minutes = Math.ceil(minutes / 5) * 5;

    if (minutes === 60) {
        now.setHours(now.getHours() + 1);
        minutes = 0;
    }

    now.setMinutes(minutes);

    const hours = String(now.getHours()).padStart(2, "0");
    const mins = String(now.getMinutes()).padStart(2, "0");

    const defaultTime = `${hours}:${mins}`;

    //  DELIVERY 

    const deliveryDate = document.getElementById("deliveryDate");
    const deliveryTime = document.getElementById("deliveryTime");

    if (deliveryDate) {
        deliveryDate.min = today;
        deliveryDate.value = today;
    }

    generateTimeOptions(deliveryTime, today, defaultTime);

    // PICKUP 

    const pickupDate = document.getElementById("pickupDate");
    const pickupTime = document.getElementById("pickupTime");

    if (pickupDate) {
        pickupDate.min = today;
        pickupDate.value = today;
    }

    generateTimeOptions(pickupTime, today, defaultTime);

    // КОШИК

    cart = JSON.parse(localStorage.getItem("cart")) || [];

    updateCartUI();
    updateCartCount();

    setTimeout(() => {
        if (loader) {
            loader.classList.add("hide");
        }
    }, 800);
});



function generateTimeOptions(selectElement, minDate, selectedTime) {
    if (!selectElement) return;

    selectElement.innerHTML = "";

    const now = new Date();
    const todayStr = new Date().toISOString().split("T")[0];

    let startHour = 0;
    let startMinute = 0;

    if (minDate === todayStr) {

        now.setMinutes(now.getMinutes() + 30);

        let minutes = now.getMinutes();
        minutes = Math.ceil(minutes / 5) * 5;

        if (minutes === 60) {
            now.setHours(now.getHours() + 1);
            minutes = 0;
        }

        startHour = now.getHours();
        startMinute = minutes;
    }

    for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += 5) {

            if (minDate === todayStr) {
                if (hour < startHour) continue;
                if (hour === startHour && minute < startMinute) continue;
            }

            const h = String(hour).padStart(2, "0");
            const m = String(minute).padStart(2, "0");

            const time = `${h}:${m}`;

            const option = document.createElement("option");
            option.value = time;
            option.textContent = time;

            if (time === selectedTime) {
                option.selected = true;
            }

            selectElement.appendChild(option);
        }
    }
}


function hideLoader() {
    const loader = document.getElementById("pageLoader");
    if (loader) {
        loader.classList.add("hide");
    }
}


function applyOrderTypeUI() {
    const draft = JSON.parse(localStorage.getItem("orderDraft")) || {};

    const pickupContent = document.getElementById('pickupContent');
    const deliveryContent = document.getElementById('deliveryContent');

    const modalPickupBtn = document.getElementById('modalPickupBtn');
    const modalDeliveryBtn = document.getElementById('modalDeliveryBtn');

    if (draft.type === "delivery") {
        modalDeliveryBtn?.classList.add("active");
        modalPickupBtn?.classList.remove("active");

        deliveryContent.style.display = "block";
        pickupContent.style.display = "none";
    } else {
        modalPickupBtn?.classList.add("active");
        modalDeliveryBtn?.classList.remove("active");

        pickupContent.style.display = "block";
        deliveryContent.style.display = "none";
    }
}

function setOrderType(type) {
    const draft = JSON.parse(localStorage.getItem("orderDraft")) || {};

    draft.type = type;

    localStorage.setItem("orderDraft", JSON.stringify(draft));

    applyOrderTypeUI();
    saveOrderDraft(); 
}



async function loadMenuFromFirebase() {

    const snap = await db.collection("menu").get();

    const grouped = {};

    snap.docs.forEach(doc => {

        const item = doc.data();

        if (!grouped[item.category]) {
            grouped[item.category] = [];
        }

        grouped[item.category].push(item);
    });

    Object.keys(grouped).forEach(category => {

        const container = document.getElementById(category + "Container");

        if (!container) return;

        container.innerHTML = grouped[category].map(item => {

            return `
                <div class="order-card">

                    <div class="order-card-text">

                        <h4>
                            ${item.featured ? "★ " : ""}
                            ${item.name}
                        </h4>

                        <p>${item.description}</p>

                        ${
                            item.vegan
                            ? `<span class="vegan-tag">🌱 Vegan</span>`
                            : ""
                        }

                        <span class="order-price">
                            $${item.price}
                        </span>

                    </div>

                    <div class="order-card-img">
                        <img
                            src="${item.image}"
                            alt="${item.name}"
                        >
                    </div>

                </div>
            `;
        }).join("");
    });

    initDishModalEvents();
}

function initDishModalEvents() {

    document.querySelectorAll('.order-card').forEach(card => {

        card.onclick = function() {

            currentDish = {

                name: card.querySelector('h4').textContent,

                desc: card.querySelector('p').textContent,

                price: parseFloat(
                    card.querySelector('.order-price')
                    .textContent
                    .replace('$', '')
                ),

                img: card.querySelector('img').src
            };

            document.getElementById('modalDishName').textContent = currentDish.name;

            document.getElementById('modalDishDesc').textContent = currentDish.desc;

            document.getElementById('modalDishImg').src = currentDish.img;

            document.getElementById('modalTotalBtn').textContent =
                currentDish.price.toFixed(2);

            quantity = 1;

            document.getElementById('qtyValue').textContent = quantity;

            document.getElementById('request').value = '';

            dishModal.style.display = 'flex';
        };
    });
}


async function loadMenuPage() {
    const snap = await db.collection("menu").get();

    const items = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    const container = document.getElementById("menuContainer");

    container.innerHTML = items.map(item => `
        <div class="menu-item">
            <img src="${item.image}" alt="${item.name}">

            <div class="item-info">
                <h4>${item.featured ? "★ " : ""}${item.name}</h4>

                <p>${item.description || ""}</p>

                ${item.vegan ? `<span class="vegan-tag">🌱 Vegan</span>` : ""}

                <span class="price">$${item.price}</span>
            </div>
        </div>
    `).join("");
}

window.addEventListener("load", () => {
    loadMenuPage();

    loadMenuFromFirebase();

});




const menuToggle = document.getElementById("menuToggle");
const navMenu = document.getElementById("navMenu");

menuToggle.addEventListener("click", () => {
    navMenu.classList.toggle("active");
});
