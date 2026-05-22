let allOrders = [];

function listenOrders() {
    db.collection("orders")
        .orderBy("createdAt", "desc")
        .onSnapshot(snapshot => {

            allOrders = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            renderOrders(allOrders);
        });
}



function renderOrders(list) {
    const container = document.getElementById("ordersContainer");

    container.innerHTML = list.map(o => {

        const isDelivery = o.type === "delivery";
        const isAdminOrder = o.createdBy === "admin";

        return `
            <div class="order-card">

                <div class="order-top">
                    <h3>${o.customerName || "No name"}</h3>

                    <span class="status status-${o.status}">
                        ${o.status}
                    </span>
                </div>

                <p>${o.email}</p>
                <p>${o.phone}</p>

                ${isAdminOrder ? '<span class="admin-badge"><i class="fa-solid fa-user-shield"></i> Admin Order</span>' : ""}

                <p>
                    <b>Type:</b>
${isDelivery 
    ? '<span class="type-badge delivery"><i class="fa-solid fa-truck"></i> Delivery</span>' 
    : '<span class="type-badge pickup"><i class="fa-solid fa-store"></i> Pickup</span>'
}                </p>

                <p>
                    <b>Address:</b>
                    ${
                        isDelivery
                            ? (o.address || "No address")
                            : (o.pickupAddress || "Pickup point")
                    }
                </p>

                <p><b>Date:</b> ${o.date || "-"}</p>
                <p><b>Time:</b> ${o.time || "-"}</p>

                <p><b>Total:</b> $${o.total}</p>

                <p>
                    <b>Payment:</b>
                    ${o.paymentStatus || "unknown"}
                    (${o.paymentMethod || "unknown"})
                </p>

                <div class="items">
                    ${(o.items || []).map(i =>
                        `<div>${i.name} × ${i.qty}</div>`
                    ).join("")}
                </div>

                <div class="status-buttons">
                    ${
                        isDelivery
                        ? `
                            <button onclick="updateStatus('${o.id}','preparing')">Preparing</button>
                            <button onclick="updateStatus('${o.id}','on_the_way')">On the way</button>
                            <button onclick="updateStatus('${o.id}','delivered')">Delivered</button>
                            <button onclick="updateStatus('${o.id}','cancelled')">Cancel</button>
                        `
                        : `
                            <button onclick="updateStatus('${o.id}','confirmed')">Confirmed</button>
                            <button onclick="updateStatus('${o.id}','ready')">Ready</button>
                            <button onclick="updateStatus('${o.id}','picked_up')">Picked up</button>
                            <button onclick="updateStatus('${o.id}','cancelled')">Cancel</button>
                        `
                    }
                </div>

                <div class="payment-method-buttons">
                    <button onclick="updatePaymentMethod('${o.id}','cash')">Cash</button>
                    <button onclick="updatePaymentMethod('${o.id}','card')">Card</button>
                </div>

                <div class="payment-buttons">
                    <button onclick="updatePayment('${o.id}','paid')">Paid</button>
                    <button onclick="updatePayment('${o.id}','pending')">Pending</button>
                    <button onclick="updatePayment('${o.id}','failed')">Failed</button>
                </div>

            </div>
        `;
    }).join("");
}

function filterOrders() {
    const status = document.getElementById("orderStatusFilter").value;

    if (status === "all") {
        renderOrders(allOrders);
        return;
    }

    const filtered = allOrders.filter(o => o.status === status);

    renderOrders(filtered);
}

async function updatePaymentMethod(orderId, method) {
    await db.collection("orders").doc(orderId).update({
        paymentMethod: method
    });
}

async function updateStatus(orderId, status) {
    try {
        await db.collection("orders").doc(orderId).update({
            status
        });

        console.log("STATUS UPDATED:", orderId, status);
    } catch (err) {
        console.error(err);
    }
}

async function updatePayment(orderId, paymentStatus) {
    try {
        await db.collection("orders").doc(orderId).update({
            paymentStatus
        });

        console.log("PAYMENT UPDATED:", orderId, paymentStatus);
    } catch (err) {
        console.error(err);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    checkAdmin();

    listenOrders();
    listenMessages();

    loadUsers();
    loadMenu();
    loadReservations();
});

function checkAdmin() {
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = "index.html";
            return;
        }

        const doc = await db.collection("users").doc(user.uid).get();

        if (doc.data()?.role !== "admin") {
            showToast("No access", "error");
            window.location.href = "index.html";
        }
    });
}


async function loadUsers() {
    const snap = await db.collection("users").get();

    const container = document.getElementById("usersContainer");

    container.innerHTML = snap.docs.map(d => {
        const u = d.data();

        return `
            <div class="user-card">
                <h3>${u.name}</h3>
                <p>${u.email}</p>
                <p><b>Role:</b> ${u.role}</p>
            </div>
        `;
    }).join("");
}

function toggleAdminItem(checkbox) {

    const item = {
        id: checkbox.value,
        name: checkbox.dataset.name,
        price: Number(checkbox.dataset.price),
        qty: 1
    };

    if (checkbox.checked) {

        selectedAdminItems.push(item);

    } else {

        selectedAdminItems = selectedAdminItems.filter(
            i => i.id !== item.id
        );
    }

    console.log(selectedAdminItems);
}






let editingMenuId = null;

function editMenuItem(id) {
    const item = allMenuItems.find(i => i.id === id);
    if (!item) return;

    editingMenuId = id;

    document.getElementById("editMenuName").value = item.name;
    document.getElementById("editMenuDescription").value = item.description || "";
    document.getElementById("editMenuPrice").value = item.price;
    document.getElementById("editMenuCategory").value = item.category;

    document.getElementById("editMenuModal").classList.add("active");
}


function closeEditModal() {
    document.getElementById("editMenuModal").classList.remove("active");
    editingMenuId = null;
}

async function saveMenuEdit() {
    if (!editingMenuId) return;

    const updated = {
        name: document.getElementById("editMenuName").value,
        description: document.getElementById("editMenuDescription").value,
        price: Number(document.getElementById("editMenuPrice").value),
        category: document.getElementById("editMenuCategory").value
    };

    try {
        await db.collection("menu").doc(editingMenuId).update(updated);

        closeEditModal();
        loadMenu();

    } catch (err) {
        console.error(err);
    }
}

let deletingMenuId = null;

function deleteMenuItem(id) {

    deletingMenuId = id;

    document
        .getElementById("deleteModal")
        .classList.add("active");
}

function closeDeleteModal() {

    document
        .getElementById("deleteModal")
        .classList.remove("active");

    deletingMenuId = null;
}

document
    .getElementById("confirmDeleteBtn")
    .addEventListener("click", async () => {

        if (!deletingMenuId) return;

        try {

            await db
                .collection("menu")
                .doc(deletingMenuId)
                .delete();

            closeDeleteModal();

            loadMenu();

        } catch (err) {
            console.error(err);
        }
});

let allMenuItems = [];

function openModal() {
    const modal = document.getElementById("editMenuModal");
    modal.classList.add("active");
}


const menuImageFile = document.getElementById("menuImageFile");
const fileName = document.getElementById("fileName");

menuImageFile.addEventListener("change", () => {

    if (menuImageFile.files.length > 0) {

        fileName.textContent = menuImageFile.files[0].name;

    } else {

        fileName.textContent = "No file selected";
    }
});

function renderMenu(list) {
    const container = document.getElementById("menuContainer");

    container.innerHTML = list.map(m => `
        <div class="menu-item">

            <p><b>${m.name}</b></p>
            <p>$${m.price}</p>

            <div class="menu-actions">
<button class="btn-edit" onclick="editMenuItem('${m.id}')">
    <i class="fa-solid fa-pen"></i> Edit
</button>

<button class="btn-delete" onclick="deleteMenuItem('${m.id}')">
    <i class="fa-solid fa-trash"></i> Delete
</button>
            </div>

        </div>
    `).join("");
}




function filterMenu() {
    const search = document.getElementById("menuSearch").value.toLowerCase();
    const category = document.getElementById("menuCategoryFilter").value;

    let filtered = allMenuItems;

    if (category !== "all") {
        filtered = filtered.filter(m => m.category === category);
    }

    if (search.trim()) {
        filtered = filtered.filter(m =>
            m.name.toLowerCase().includes(search)
        );
    }

    renderMenu(filtered);
}

function filterAdminMenu() {
    const search = document.getElementById("orderSearch").value.toLowerCase();
    const category = document.getElementById("orderCategoryFilter").value;

    let filtered = allMenuItems;

    if (category !== "all") {
        filtered = filtered.filter(m => m.category === category);
    }

    if (search.trim()) {
        filtered = filtered.filter(m =>
            m.name.toLowerCase().includes(search)
        );
    }

    renderAdminMenu(filtered);
}

function renderAdminMenu(list) {
    const adminMenu = document.getElementById("adminMenuItems");

    adminMenu.innerHTML = list.map(item => `
        <div class="admin-menu-item">

            <label class="admin-dish-card">

                <input 
                    type="checkbox"
                    value="${item.id}"
                    data-name="${item.name}"
                    data-price="${item.price}"
                    onchange="toggleAdminItem(this)"
                >

                <img src="${item.image}" class="admin-dish-img">

                <div class="admin-dish-info">
                    <h4>${item.name}</h4>
                    <p>$${item.price}</p>
                </div>

            </label>

        </div>
    `).join("");
}

async function loadMenu() {
    const snap = await db.collection("menu").get();

    allMenuItems = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    renderMenu(allMenuItems);
    renderAdminMenu(allMenuItems);
}


async function loadReservations() {
    const snap = await db.collection("reservations")
        .orderBy("createdAt", "desc")
        .get();

    const container = document.getElementById("reservationsContainer");

    container.innerHTML = snap.docs.map(doc => {
        const r = doc.data();

        return `
        <div class="reservation-card">
    
            <div class="reservation-top">
                <h3>${r.firstName} ${r.lastName}</h3>
    
                <span class="status status-${r.status}">
                    ${r.status || "booked"}
                </span>
            </div>
    
            <div class="reservation-info">
<p><i class="fa-solid fa-phone"></i> ${r.phone}</p>

                <div class="reservation-datetime">
                    <span><i class="fa-regular fa-calendar"></i> ${r.date}</span>
<span><i class="fa-regular fa-clock"></i> ${r.time}</span>
                </div>
    
<span class="reservation-people">
    <i class="fa-solid fa-user-group"></i>
    ${r.size} people
</span>
            </div>
    
            <div class="status-buttons">
                <button onclick="updateReservation('${doc.id}','booked')">Booked</button>
                <button onclick="updateReservation('${doc.id}','completed')">Completed</button>
                <button onclick="updateReservation('${doc.id}','cancelled')">Cancel</button>
    
                <button onclick="deleteReservation('${doc.id}')">Delete</button>
            </div>
    
        </div>
    `;
    }).join("");
}

async function deleteReservation(id) {
    try {
        const confirmDelete = confirm("Delete this reservation?");

        if (!confirmDelete) return;

        await db.collection("reservations").doc(id).delete();

        console.log("RESERVATION DELETED:", id);

        loadReservations();

    } catch (err) {
        console.error(err);
    }
}

async function updateReservation(id, status) {
    try {
        await db.collection("reservations").doc(id).update({
            status
        });

        console.log("RESERVATION UPDATED:", id, status);

        loadReservations();
    } catch (err) {
        console.error(err);
    }
}

let selectedAdminItems = [];

function showView(view) {
    const views = [
        "orders",
        "users",
        "messages",
        "menu",
        "reservations",
        "createOrder",
        "createReservation",
        "createMenu"
    ];

    views.forEach(v => {
        const el = document.getElementById(v + "View");
        if (el) el.style.display = "none";
    });

    const active = document.getElementById(view + "View");
    if (active) active.style.display = "block";

    if (view !== "createOrder") resetCreateOrderForm();
    if (view !== "createReservation") resetCreateReservationForm();
}

function resetCreateOrderForm() {
    const ids = [
        "adminCustomerName",
        "adminCustomerEmail",
        "adminCustomerPhone",
        "adminAddress",
        "adminDate",
        "adminTime"
    ];

    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });

    const payment = document.getElementById("adminPayment");
    if (payment) payment.value = "pending";
}

function resetCreateReservationForm() {

    document.getElementById("resFirstName").value = "";
    document.getElementById("resLastName").value = "";
    document.getElementById("resPhone").value = "";
    document.getElementById("resDate").value = "";
    document.getElementById("resTime").value = "";

    const size = document.getElementById("resSize");
    size.value = "2";

    document.getElementById("resDateLabel").textContent = "Choose date";
    document.getElementById("resTimeLabel").textContent = "Choose time";
}

async function createAdminOrder() {
    try {
        const order = {
            userId: "admin-created",
            customerName: document.getElementById("adminCustomerName").value,
            email: document.getElementById("adminCustomerEmail").value,
            phone: document.getElementById("adminCustomerPhone").value,

            type: document.getElementById("adminType").value,
            address: document.getElementById("adminAddress").value,

            date: document.getElementById("adminDate").value,
            time: document.getElementById("adminTime").value,

            paymentMethod: document.getElementById("adminPaymentMethod").value,
            paymentStatus: document.getElementById("adminPayment").value,

            status: "confirmed",

            items: selectedAdminItems,

            total: selectedAdminItems.reduce((sum, item) => {
                return sum + item.price * item.qty;
            }, 0),

            createdAt: firebase.firestore.Timestamp.now(),
            createdBy: "admin"
        };

        await db.collection("orders").add(order);

        showToast("Order created successfully", "success");

        document.querySelectorAll("#createOrderView input").forEach(i => i.value = "");

    } catch (err) {
        console.error(err);
        showToast("Error creating order", "error");
    }
}

async function createReservation() {
    try {
        const allowedSizes = [2, 4, 6, 8];

        const size = Number(document.getElementById("resSize").value);

        if (!allowedSizes.includes(size)) {
            showToast("Invalid table size selected", "error");
            return;
        }

        const reservation = {
            firstName: document.getElementById("resFirstName").value,
            lastName: document.getElementById("resLastName").value,
            phone: document.getElementById("resPhone").value,

            date: document.getElementById("resDate").value,
            time: document.getElementById("resTime").value,
            size: size,

            status: "booked",
            userId: "admin-created",
            createdAt: firebase.firestore.Timestamp.now(),
            createdBy: "admin"
        };

        await db.collection("reservations").add(reservation);

        showToast("Reservation created", "success");

        document.querySelectorAll("#createReservationView input").forEach(i => i.value = "");
        document.getElementById("resSize").value = "2";

        loadReservations();

    } catch (err) {
        console.error(err);
    }
}


async function createMenuItem() {
    try {

        const fileInput = document.getElementById("menuImageFile");
        const file = fileInput.files[0];

        if (!file) {
            showToast("Please select an image", "error");
            return;
        }

        // 🟢 беремо тільки ім'я файлу
        const imagePath = "images/menu/" + file.name;

        const item = {
            name: document.getElementById("menuName").value,
            description: document.getElementById("menuDescription").value,
            price: Number(document.getElementById("menuPrice").value),

            image: imagePath, 

            category: document.getElementById("menuCategory").value,
            vegan: document.getElementById("menuVegan").checked,
            featured: document.getElementById("menuFeatured").checked,

            createdAt: firebase.firestore.Timestamp.now()
        };

        await db.collection("menu").add(item);

        showToast("Dish added successfully", "success");

        loadMenu();

    } catch (err) {
        console.error(err);
        showToast("Error occurred", "error");
    }
}
document.getElementById("resDate").addEventListener("change", (e) => {
    const label = document.getElementById("dateLabel");
    const box = document.querySelector(".date-box");

    if (e.target.value) {
        const date = new Date(e.target.value);

        label.textContent = " " + date.toLocaleDateString("uk-UA");

        box.classList.add("filled");
    } else {
        label.textContent = "Choose date";
        box.classList.remove("filled");
    }
});



function openDatePicker(inputId, labelId) {
    const input = document.getElementById(inputId);
    input.showPicker?.() || input.focus();

    input.addEventListener("change", () => {
        const label = document.getElementById(labelId);

        if (input.value) {
            const date = new Date(input.value);
            label.textContent = date.toLocaleDateString("uk-UA");
        }
    }, { once: true });
}

function openTimePicker(inputId, labelId) {
    const input = document.getElementById(inputId);
    input.showPicker?.() || input.focus();

    input.addEventListener("change", () => {
        const label = document.getElementById(labelId);

        if (input.value) {
            label.textContent = input.value;
        }
    }, { once: true });
}

document.getElementById("resTime").addEventListener("change", (e) => {

    const label = document.getElementById("timeLabel");
    const box = document.querySelector(".time-box");

    if (e.target.value) {

        label.textContent = "" + e.target.value;

        box.classList.add("filled");

    } else {

        label.textContent = "Choose time";

        box.classList.remove("filled");
    }
});




function showToast(message, type = "success") {
    const toast = document.getElementById("toast");

    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}





function listenMessages() {

    db.collection("messages")
      .orderBy("createdAt", "desc")
      .onSnapshot(snapshot => {

          const container =
              document.getElementById("messagesContainer");

          container.innerHTML = "";

          snapshot.forEach(doc => {

              const msg = doc.data();

              container.innerHTML += `
                  <div class="message-card">

                      <div class="message-top">

                          <span class="message-type">
                              ${msg.type || "chat"}
                          </span>

                          <button
                              class="delete-message-btn"
                              onclick="deleteMessage('${doc.id}')">
                              Delete
                          </button>

                      </div>

                      <p>
                          <strong>Name:</strong>
                          ${msg.name || msg.firstName || "-"}
                      </p>

                      <p>
                          <strong>Email:</strong>
                          ${msg.email || "-"}
                      </p>

                      <p>
                          <strong>Subject:</strong>
                          ${msg.subject || "-"}
                      </p>

                      <p>
                          <strong>Message:</strong>
                      </p>

                      <div class="message-text">
                          ${msg.message || msg.text || ""}
                      </div>

                  </div>
              `;
          });

      });
}

async function deleteMessage(id) {

    const ok = confirm(
        "Delete this message?"
    );

    if (!ok) return;

    await db.collection("messages")
            .doc(id)
            .delete();
}