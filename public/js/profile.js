async function loadUserData() {
    const user = firebase.auth().currentUser;
    if (!user) return;

    try {
        const doc = await db.collection("users").doc(user.uid).get();
        const data = doc.exists ? doc.data() : {};

        const nameInput = document.getElementById("customerName");
        const emailInput = document.getElementById("customerEmail");
        const phoneInput = document.getElementById("customerPhone");
        const addressInput = document.getElementById("customerAddress");

        if (nameInput) nameInput.value = data.name || "";
        if (emailInput) emailInput.value = user.email || "";
        if (phoneInput) phoneInput.value = data.phone || "";

        const draft = JSON.parse(localStorage.getItem("orderDraft")) || {};

        if (!draft.paymentMethod) {
            draft.paymentMethod = "card";
            localStorage.setItem("orderDraft", JSON.stringify(draft));
        }

        // LAST ORDER (SAFE FIX)

        let lastOrder = null;

        const snap = await db.collection("orders")
            .where("userId", "==", user.uid)
            .orderBy("createdAt", "desc")
            .limit(1)
            .get();

        if (!snap.empty) {
            lastOrder = snap.docs[0].data();
        }

        // ADDRESS

        if (addressInput) {
            addressInput.value =
                draft.address ||
                lastOrder?.address ||
                data.address ||
                "";
        }

        // DATE

        const dateInput = document.getElementById("deliveryDate");
        if (dateInput) {
            dateInput.value =
                draft.date ||
                lastOrder?.date ||
                "";
        }

        // TIME

        const timeInput = document.getElementById("deliveryTime");

        if (timeInput) {
            const selectedDate =
                draft.date ||
                lastOrder?.date ||
                new Date().toISOString().split("T")[0];

            const selectedTime =
                draft.time ||
                lastOrder?.time ||
                "12:00";

            generateTimeOptions(
                timeInput,
                selectedDate,
                selectedTime
            );
        }

        // UI TEXT

        const displayTimeText = document.getElementById("displayTimeText");

        const dateFinal =
            draft.date ||
            lastOrder?.date ||
            "";

        const timeFinal =
            draft.time ||
            lastOrder?.time ||
            "";

        if (displayTimeText) {
            if (draft.timeType === "asap" || lastOrder?.timeType === "asap") {
                displayTimeText.textContent = "Delivery time: Up to 60 minutes";
            } else {
                displayTimeText.textContent =
                    `Delivery time: ${dateFinal} ${timeFinal}`.trim();
            }
        }

        // LIVE LISTENER (SAFE)

        db.collection("orders")
            .where("userId", "==", user.uid)
            .orderBy("createdAt", "desc")
            .limit(1)
            .onSnapshot((snapshot) => {
                if (!snapshot.empty) {
                    const order = snapshot.docs[0].data();
                    renderLastOrder(order);
                }
            });

    } catch (err) {
        console.error("loadUserData error:", err);
    }

syncCheckoutFields();
}

function syncCheckoutFields() {
    const draft = JSON.parse(localStorage.getItem("orderDraft")) || {};

    const user = firebase.auth().currentUser;

    const nameInput = document.getElementById("customerName");
    const emailInput = document.getElementById("customerEmail");
    const phoneInput = document.getElementById("customerPhone");
    const addressInput = document.getElementById("customerAddress");
    const deliveryInput = document.getElementById("deliveryInput");


    if (nameInput && !nameInput.value) {
        nameInput.value = draft.name || "";
    }

    if (emailInput && user) {
        emailInput.value = user.email || "";
    }

    if (phoneInput) {
        phoneInput.value =
            draft.phone ||
            phoneInput.value || "";
    }

    if (addressInput) {
        addressInput.value =
            draft.address ||
            addressInput.value || "";
    }

    if (deliveryInput) {
        deliveryInput.value =
            draft.address ||
            deliveryInput.value || "";
    }
}

function setAddressField(addressInput, draft, lastOrder, data) {
    if (!addressInput) return;

    const type =
        draft.type ||
        lastOrder?.type ||
        "delivery";

    if (type === "delivery") {

        const address =
            draft.address ||
            lastOrder?.deliveryAddress ||
            data.address ||
            "";

        addressInput.value = address;

    } else {

        addressInput.value = "";
        addressInput.placeholder = PICKUP_ADDRESS;
        addressInput.disabled = true;
    }
}

document.getElementById("deliveryBtn")?.addEventListener("click", () => {
    setOrderType("delivery");
});

document.getElementById("pickupBtn")?.addEventListener("click", () => {
    setOrderType("pickup");
});


function generateTimeOptions(select, selectedDate, selectedTime = "") {
    if (!select) return;

    select.innerHTML = "";

    const now = new Date();
    const isToday = selectedDate === now.toISOString().split("T")[0];

    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 5) {

            const time = 
                String(h).padStart(2, "0") + ":" +
                String(m).padStart(2, "0");

            if (isToday) {
                const [currH, currM] = [now.getHours(), now.getMinutes()];
                const [tH, tM] = [h, m];

                const currentMinutes = currH * 60 + currM;
                const optionMinutes = tH * 60 + tM;

                if (optionMinutes < currentMinutes + 30) {
                    continue;
                }
            }

            const option = document.createElement("option");
            option.value = time;
            option.textContent = time;

            if (time === selectedTime) {
                option.selected = true;
            }

            select.appendChild(option);
        }
    }
}

document.getElementById("deliveryDate")?.addEventListener("change", (e) => {

    const selectedDate = e.target.value;

    generateTimeOptions(
        document.getElementById("deliveryTime"),
        selectedDate,
        ""
    );

    saveOrderDraft();
});

let draftTimer;

document.getElementById("deliveryInput")?.addEventListener("input", (e) => {
    clearTimeout(draftTimer);

    draftTimer = setTimeout(() => {
        saveOrderDraft();
    }, 200);
});

document.getElementById("deliveryDate")?.addEventListener("change", (e) => {
    const draft = JSON.parse(localStorage.getItem("orderDraft")) || {};
    draft.date = e.target.value;
    localStorage.setItem("orderDraft", JSON.stringify(draft));
});

document.getElementById("deliveryTime")?.addEventListener("change", (e) => {
    const draft = JSON.parse(localStorage.getItem("orderDraft")) || {};
    draft.time = e.target.value;
    localStorage.setItem("orderDraft", JSON.stringify(draft));
});

function loadCartPage() {
    const cartData = JSON.parse(localStorage.getItem('cart')) || [];

    const container = document.getElementById('fullCartList');
    if (!container) return;

    const checkoutPanel = document.querySelector('.cart-summary');

    if (cartData.length === 0) {
        container.innerHTML = '<p>Your cart is empty</p>';
        document.getElementById('subtotal').textContent = '$0.00';
        document.getElementById('total').textContent = '$0.00';

        if (checkoutPanel) checkoutPanel.style.display = 'none';
        return;
    }

    if (checkoutPanel) checkoutPanel.style.display = 'block';

    let total = 0;

    container.innerHTML = cartData.map((item, index) => {
        total += Number(item.price);

        return `
            <div class="cart-item">
                <img src="${item.img}">
                <div style="flex:1">
                    <p>${item.name}</p>
                    <p>$${(item.price / item.qty).toFixed(2)}</p>
                </div>

                <div class="qty-box">
                    <button onclick="decreaseFullCartQty(${index})">-</button>
                    <span>${item.qty}</span>
                    <button onclick="increaseFullCartQty(${index})">+</button>
                </div>

                <p style="margin-left:20px;">$${Number(item.price).toFixed(2)}</p>
            </div>
        `;
    }).join('');

    document.getElementById('subtotal').textContent = '$' + total.toFixed(2);
    document.getElementById('total').textContent = '$' + total.toFixed(2);
}

window.increaseFullCartQty = function(index) {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const item = cart[index];

    if (!item) return;

    const unitPrice = parseFloat(item.price) / parseInt(item.qty);

    item.qty = parseInt(item.qty) + 1;
    item.price = (unitPrice * item.qty).toFixed(2);

    localStorage.setItem("cart", JSON.stringify(cart));
    loadCartPage();
};

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("fullCartList")) {
        loadCartPage();
    }

    if (document.getElementById("menuContainer")) {
        loadMenuPage();
    }
});

window.decreaseFullCartQty = function(index) {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const item = cart[index];

    if (!item) return;

    if (parseInt(item.qty) <= 1) {
        cart.splice(index, 1);
    } else {
        const unitPrice = parseFloat(item.price) / parseInt(item.qty);

        item.qty = parseInt(item.qty) - 1;
        item.price = (unitPrice * item.qty).toFixed(2);
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    loadCartPage();
};


        loadCartPage();


let pendingOrder = null;
const PICKUP_ADDRESS = "Pickup Point: ul. Marszałkowska 10, Warsaw";

function getPickupAddress() {
    return "Pickup Point: ul. Marszałkowska 10, Warsaw";
}

function applyOrderTypeUI() {
    const draft = JSON.parse(localStorage.getItem("orderDraft")) || {};
    const type = draft.type || "delivery";

    const profileAddressInput = document.getElementById("customerAddress");
    const checkoutAddressInput = document.getElementById("deliveryInput");

    if (type === "delivery") {

        if (profileAddressInput) {
            profileAddressInput.disabled = false;
            profileAddressInput.placeholder = "Enter delivery address";
            profileAddressInput.value = draft.address || "";
        }

        if (checkoutAddressInput) {
            checkoutAddressInput.disabled = false;
            checkoutAddressInput.placeholder = "Enter address";
            checkoutAddressInput.value = draft.address || "";
        }
    }

    if (type === "pickup") {

        const pickup = getPickupAddress();

        if (profileAddressInput) {
            profileAddressInput.disabled = true;
            profileAddressInput.value = pickup;
        }

        if (checkoutAddressInput) {
            checkoutAddressInput.disabled = true;
            checkoutAddressInput.value = pickup;
        }
    }
}

async function placeOrder() {
    const user = firebase.auth().currentUser;
    if (!user) return alert("Login required");

    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const draft = JSON.parse(localStorage.getItem("orderDraft")) || {};

    if (cart.length === 0) return alert("Cart is empty");

    const total = cart.reduce((sum, item) => sum + Number(item.price), 0);
    const isDelivery = draft.type === "delivery";

    const paymentMethod = draft.paymentMethod || "card";


    const address =
    draft.address ||
    document.getElementById("deliveryInput")?.value ||
    document.getElementById("customerAddress")?.value ||
    "";
    if (isDelivery && !address.trim()) {
        alert("Delivery address is required");
        return;
    }

const customerName =
    draft.name || document.getElementById("customerName")?.value || "";

const email =
    draft.email || document.getElementById("customerEmail")?.value || "";

const phone =
    draft.phone || document.getElementById("customerPhone")?.value || "";

    const selectedDate =
    draft.date ||
    document.getElementById("deliveryDate")?.value ||
    "";

const selectedTime =
    draft.time ||
    document.getElementById("deliveryTime")?.value ||
    "";

const timeType =
    selectedDate && selectedTime
        ? "scheduled"
        : "asap";

    const order = {
        userId: user.uid,
        type: draft.type,
    
        customerName,
        email,
        phone,
    
        items: cart,
        total,
    
        address: isDelivery ? address : null,
        pickupAddress: !isDelivery ? getPickupAddress() : null,
    
        
        timeType,
        date: selectedDate,
        time: selectedTime,

        paymentMethod,
        paymentStatus: paymentMethod === "card" ? "paid" : "pending",
    
        status: "new",
    
        createdAt: firebase.firestore.Timestamp.now()
    };

    await db.collection("orders").add(order);

    localStorage.removeItem("cart");
    localStorage.removeItem("orderDraft");

    loadCartPage();
    await loadLastOrder();
}

function setPaymentMethod(method) {
    const draft = JSON.parse(localStorage.getItem("orderDraft")) || {};
    draft.paymentMethod = method;
    localStorage.setItem("orderDraft", JSON.stringify(draft));
}

document.querySelectorAll('input[name="paymentMethod"]').forEach(input => {
    input.addEventListener('change', (e) => {
        const method = e.target.value;

        const draft = JSON.parse(localStorage.getItem("orderDraft")) || {};
        draft.paymentMethod = method;

        localStorage.setItem("orderDraft", JSON.stringify(draft));
    });
});

function loadPaymentMethod() {
    const draft = JSON.parse(localStorage.getItem("orderDraft")) || {};

    const method = draft.paymentMethod || "card";

    const radio = document.querySelector(`input[name="paymentMethod"][value="${method}"]`);
    if (radio) radio.checked = true;
}

window.addEventListener("load", loadPaymentMethod);

document.getElementById("closePaymentModal").onclick = () => {
    document.getElementById("paymentModal").style.display = "none";
};

async function completePayment() {
    if (!pendingOrder) return;

    pendingOrder.status = "paid";

    await db.collection("orders").add({
        ...pendingOrder,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    localStorage.removeItem("cart");

    document.getElementById("paymentModal").style.display = "none";

    loadCartPage();
    await loadLastOrder();

    pendingOrder = null;

    alert("Payment successful");
}

function payWithApple() {
    completePayment();
}

function payNow() {
    const name = document.getElementById("cardName").value.trim();
    const number = document.getElementById("cardNumber").value.trim();
    const expiry = document.getElementById("cardExpiry").value.trim();
    const cvc = document.getElementById("cardCvc").value.trim();

    if (!name || !number || !expiry || !cvc) {
        alert("Please fill all card fields");
        return;
    }

    completePayment();
}


function renderLastOrder(order) {
    if (!order) return;

    const box = document.getElementById("lastOrderBox");
    const content = document.getElementById("lastOrderContent");

    if (!box || !content) return;

    box.style.display = "block";

    const itemsHTML = (order.items || [])
        .map(item => `
            <div class="last-order-item">
                <span>${item.name} × ${item.qty}</span>
                <span>$${Number(item.price).toFixed(2)}</span>
            </div>
        `).join("");

    let addressText = "";

    if (order.type === "delivery") {
        addressText = `Delivery: ${order.address || ""}`;
    } else {
        addressText = `${order.pickupAddress || PICKUP_ADDRESS}`;
    }

let deliveryTimeText = "";

if (order.date && order.time) {

    deliveryTimeText = `
        <div>
            <div><strong>Date:</strong> ${order.date}</div>
            <div><strong>Time:</strong> ${order.time}</div>
        </div>
    `;

} else {

    deliveryTimeText = "Up to 60 minutes";
}

    content.innerHTML = `
        <div class="last-order-card">

            <div class="last-order-row">
                <span><strong>Order Type</strong></span>
                <span>
                    ${order.type === "delivery" ? "Delivery" : "Pickup"}
                </span>
            </div>

            <div class="last-order-row">
                <span><strong>Name</strong></span>
                <span>${order.customerName || ""}</span>
            </div>

            <div class="last-order-row">
                <span><strong>Email</strong></span>
                <span>${order.email || ""}</span>
            </div>

            <div class="last-order-row">
                <span><strong>Phone</strong></span>
                <span>${order.phone || ""}</span>
            </div>

            <div class="last-order-row">
                <span><strong>Address</strong></span>
                <span>${addressText}</span>
            </div>

            <div class="last-order-row">
                <span><strong>Delivery Time</strong></span>
                <span>${deliveryTimeText}</span>
            </div>

            <div class="last-order-row">
                <span><strong>Status</strong></span>
                <span>${order.status || "unknown"}</span>
            </div>

            <div class="last-order-row">
                <span><strong>Payment</strong></span>
                <span>
                    ${
                        order.paymentMethod === "cash"
                            ? "Cash"
                            : "Card"
                    }
                </span>
            </div>

            <div class="last-order-items">
                ${itemsHTML}
            </div>

            <div class="last-order-total">
                <span>Total</span>
                <span>$${Number(order.total || 0).toFixed(2)}</span>
            </div>

        </div>
    `;
}


async function loadLastOrder() {
    const user = firebase.auth().currentUser;

    
    if (!user) return;

    const box = document.getElementById("lastOrderBox");
    const content = document.getElementById("lastOrderContent");

    if (!box || !content) return;

    try {
        const snapshot = await db.collection("orders")
            .where("userId", "==", user.uid)
            .orderBy("createdAt", "desc")
            .limit(1)
            .get();

        if (snapshot.empty) {
            box.style.display = "none";
            return;
        }

        const doc = snapshot.docs[0];

        const lastOrder = {
            id: doc.id,
            ...doc.data()
        };

        box.style.display = "block";
        renderLastOrder(lastOrder);

    } catch (err) {
        console.error("loadLastOrder error:", err);
        box.style.display = "none";
    }
}


async function loadUserReservation(showAll = false) {
    const user = firebase.auth().currentUser;
    if (!user) return;

    const container = document.getElementById("profileBooking");
    if (!container) return;

    try {
        const snap = await db.collection("reservations")
            .where("userId", "==", user.uid)
            .get();

        if (snap.empty) {
            container.innerHTML = "<p>No reservations yet</p>";
            return;
        }

        const reservations = snap.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .sort((a, b) => {
                const aCreated = a.createdAt ? a.createdAt.toDate() : new Date(0);
                const bCreated = b.createdAt ? b.createdAt.toDate() : new Date(0);
                return bCreated - aCreated;
            });

        const visibleReservations = showAll
            ? reservations
            : reservations.slice(0, 1);

        container.innerHTML = visibleReservations.map(r => {
            const reservationDateTime = new Date(`${r.date}T${r.time}`);
            const now = new Date();
            const diffHours = (reservationDateTime - now) / (1000 * 60 * 60);

            let status = r.status || "booked";

            if (status !== "cancelled" && reservationDateTime < now) {
                status = "completed";
            }

            let cancelButton = "";

            if (status === "booked") {
                if (diffHours >= 2) {
                    cancelButton = `
                        <button class="cancel-btn" data-id="${r.id}">
                            Cancel reservation
                        </button>
                    `;
                } else {
                    cancelButton = `
                        <button class="cancel-btn" disabled style="opacity:.5;">
                            Cannot cancel (&lt;2h left)
                        </button>
                    `;
                }
            }

            return `
                <div class="profile-card">

                    <div class="profile-row">
                        <span>Name</span>
                        <span>${r.firstName} ${r.lastName}</span>
                    </div>

                    <div class="profile-row">
                        <span>Phone</span>
                        <span>${r.phone}</span>
                    </div>

                    <div class="profile-row">
                        <span>Date</span>
                        <span>${r.date}</span>
                    </div>

                    <div class="profile-row">
                        <span>Time</span>
                        <span>${r.time}</span>
                    </div>

                    <div class="profile-row">
                        <span>People</span>
                        <span>${r.size}</span>
                    </div>

                    <div class="profile-row">
                        <span>Status</span>
                        <span class="status-badge status-${status}">
                            ${status}
                        </span>
                    </div>

                    ${cancelButton}

                </div>
            `;
        }).join("");

        if (!showAll && reservations.length > 1) {
            container.innerHTML += `
                <button id="showMoreReservations" class="show-more-btn">
                    Show more
                </button>
            `;
        }

        const showMoreBtn = document.getElementById("showMoreReservations");
        if (showMoreBtn) {
            showMoreBtn.onclick = () => loadUserReservation(true);
        }

        document.querySelectorAll(".cancel-btn[data-id]").forEach(btn => {
            btn.onclick = async () => {
                const reservationId = btn.dataset.id;

                await db.collection("reservations").doc(reservationId).update({
                    status: "cancelled"
                });

                await loadUserReservation(showAll);
            };
        });

    } catch (err) {
        console.error("Reservation load error:", err);
    }
}




document.addEventListener("DOMContentLoaded", () => {
    loadCartPage();
});

firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) return;

    try {
        await loadUserData();
        loadDraftToCheckout();
        syncCheckoutFields();
    
        await loadUserReservation();

        setTimeout(() => {
            loadLastOrder();
        }, 300);

    } catch (e) {
        console.error("Loading error:", e);
    }
});


function loadOrderDraft() {
    const draft = JSON.parse(localStorage.getItem("orderDraft") || "{}");
    if (!draft || Object.keys(draft).length === 0) return;

    const deliveryInput = document.getElementById("deliveryInput");

    if (draft.type === "delivery") {
        if (modalDeliveryBtn) modalDeliveryBtn.click();

        if (deliveryInput) {
            deliveryInput.value = draft.address || "";
        }

        const dateInput = document.getElementById("deliveryDate");
        const timeInput = document.getElementById("deliveryTime");

        if (dateInput) dateInput.value = draft.date || "";
        if (timeInput) timeInput.value = draft.time || "";
    }

    if (draft.type === "pickup") {
        if (modalPickupBtn) modalPickupBtn.click();
    }
}



function loadDraftToCheckout() {
    const draft = JSON.parse(localStorage.getItem("orderDraft")) || {};

    const map = {
        customerName: draft.name,
        customerEmail: draft.email,
        customerPhone: draft.phone,
        customerAddress: draft.address,
        customerNote: draft.note,
        deliveryInput: draft.address,
        deliveryDate: draft.date,
        deliveryTime: draft.time
    };

    Object.entries(map).forEach(([id, value]) => {
        const el = document.getElementById(id);

        if (
            el &&
            value !== undefined &&
            value !== null &&
            el.value === ""
        ) {
            el.value = value;
        }
    });
}

window.addEventListener("load", () => {
    loadDraftToCheckout();
});

document.querySelectorAll(
    "#customerName, #customerEmail, #customerPhone, #customerAddress, #customerNote"
).forEach(el => {
    el?.addEventListener("input", saveOrderDraft);
});

document.querySelectorAll(
    "#deliveryDate, #deliveryTime"
).forEach(el => {
    el?.addEventListener("change", saveOrderDraft);
});









firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) return;

    const doc = await db.collection("users").doc(user.uid).get();
    const data = doc.data();

    if (data?.role === "admin") {
        document.getElementById("adminBtn").style.display = "block";
    }
});