const partySize = document.getElementById("partySize");
const bookingDate = document.getElementById("bookingDate");
const bookingTime = document.getElementById("bookingTime");
const bookingForm = document.getElementById("bookingForm");

if (bookingDate) {
    bookingDate.addEventListener("click", function () {
        if (this.showPicker) {
            this.showPicker();
        }
    });
}

const guestFields = document.querySelectorAll(".guest-field");
const guestPhoneField = document.getElementById("guestPhone");

async function toggleGuestFields(user) {
    if (!user) {
        guestFields.forEach(field => {
            field.style.display = "block";
        });
        return;
    }

    const userDoc = await db.collection("users").doc(user.uid).get();
    const userData = userDoc.data() || {};

    const hasPhone = !!userData.phone;

    guestFields.forEach(field => {
        field.style.display = "none";
    });

    if (!hasPhone && guestPhoneField) {
        guestPhoneField.closest(".guest-field").style.display = "block";
    }
}

firebase.auth().onAuthStateChanged(async (user) => {
    await toggleGuestFields(user);
});

const countrySelect = document.getElementById("countryCode");

const countryPhoneCodes = {
    UA: "+380",
    PL: "+48",
    DE: "+49",
    US: "+1",
    GB: "+44",
    FR: "+33",
    IT: "+39",
    ES: "+34",
    CA: "+1",
    TR: "+90"
};

function fillCountries(defaultCode = "UA") {
    countrySelect.innerHTML = "";

    for (const [country, code] of Object.entries(countryPhoneCodes)) {
        const option = document.createElement("option");
        option.value = code;
        option.textContent = `${country} ${code}`;

        if (country === defaultCode) {
            option.selected = true;
        }

        countrySelect.appendChild(option);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const countryCode = await detectCountryByIP();

    fillCountries(countryCode);

    console.log("Detected country:", countryCode);
});

function getFullPhone() {
    return countrySelect.value + document.getElementById("guestPhone").value.trim();
}

async function detectCountryByIP() {
    try {
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();

        return data.country_code; 
    } catch (e) {
        console.error("IP detection failed", e);
        return "UA"; // fallback
    }
}


async function getReservationsByDate(date) {
    const snap = await db.collection("reservations")
        .where("date", "==", date)
        .where("status", "==", "booked")
        .get();

    return snap.docs.map(doc => doc.data());
}

async function isSizeAvailable(size, date, timeSlots) {
    for (const slot of timeSlots) {
        const table = await getAvailableTable(size, date, slot);
        if (table) return true;
    }
    return false;
}

async function updateAvailableSizes() {
    const date = bookingDate.value;
    const sizes = Object.keys(tables);
    const selected = Number(partySize.value);

    partySize.innerHTML = "";

    let selectedStillValid = false;

    for (const size of sizes) {
        const available = await isSizeAvailable(
            Number(size),
            date,
            baseTimeSlots
        );

        if (available) {
            const option = document.createElement("option");
            option.value = size;
            option.textContent = `${size} persons`;
            partySize.appendChild(option);

            if (Number(size) === selected) {
                selectedStillValid = true;
            }
        }
    }

    if (selected && !selectedStillValid) {
        partySize.value = "";
        bookingTime.innerHTML = "";
    }
}



if (partySize && bookingDate && bookingTime && bookingForm) {

    const tables = {
        2: ["table-01", "table-02", "table-03", "table-04", "table-05", "table-06", "table-07", "table-08", "table-09", "table-10"],
        4: ["table-11", "table-12", "table-13", "table-14", "table-15", "table-16", "table-17"],
        6: ["table-18", "table-19", "table-20", "table-21", "table-22"],
        8: ["table-23", "table-24"]
    };

    function getExpectedDuration(size) {
        if (size <= 2) return 90;      // обід/малий столик
        if (size <= 4) return 120;     // стандарт
        if (size <= 6) return 150;     // довше
        return 180;                    // великі компанії
    }
    
    const bufferTime = 60; // запас після гостей
    
    const baseTimeSlots = generateTimeSlots(12, 24);

    function sortSlots(slots) {
        return slots.sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
    }
   
    function getSlotsForDate(selectedDate) {
    const offset = getDayOffset(selectedDate);

    if (offset === 0) {
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        return baseTimeSlots.filter(slot => {
            return timeToMinutes(slot) > currentMinutes;
        });
    }

    if (offset === 1) {
        return tomorrowTimeSlots;
    }

    return baseTimeSlots;
}

    function generateTimeSlots(start = 12, end = 24) {
        const slots = [];
    
        for (let h = start; h < end; h++) {
            slots.push(`${String(h).padStart(2, "0")}:00`);
            slots.push(`${String(h).padStart(2, "0")}:30`);
        }
    
        return slots;
    }

    function getLocalDateString(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    const today = new Date();
    const todayString = getLocalDateString(today);

    bookingDate.min = todayString;
    bookingDate.value = todayString;

    async function getReservations() {
        const snapshot = await db.collection("reservations").get();
    
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    }

    function timeToMinutes(time) {
        const [h, m] = time.split(":").map(Number);
        return h * 60 + m;
    }

    function getEndTime(startTime, duration) {
        return timeToMinutes(startTime) + duration;
    }

    function getReservationWindow(time, size) {
    const duration = getExpectedDuration(size) + bufferTime;

    const start = timeToMinutes(time);
    const end = start + duration;

    return { start, end };
}

function isConflict(existingTime, newTime, size) {
    const a = getReservationWindow(existingTime, size);
    const b = getReservationWindow(newTime, size);

    return a.start < b.end && b.start < a.end;
}

    function getDayOffset(selectedDate) {
        const start = new Date(todayString);
        const selected = new Date(selectedDate);

        start.setHours(0, 0, 0, 0);
        selected.setHours(0, 0, 0, 0);

        return Math.floor((selected - start) / (1000 * 60 * 60 * 24));
    }

    function getSlotsForDate(selectedDate) {
        const now = new Date();
        const selected = new Date(selectedDate);
    
        const isToday = now.toDateString() === selected.toDateString();
    
        let slots = baseTimeSlots;
    
        if (isToday) {
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
            slots = slots.filter(slot =>
                timeToMinutes(slot) > currentMinutes
            );
        }
    
        return slots;
    }

    async function getAvailableTable(size, date, time) {
        const tableList = tables[Number(size)] || [];
        const reservations = await getReservationsByDate(date);
    
        const newWindow = getReservationWindow(time, size);
    
        for (const tableId of tableList) {
    
            const hasConflict = reservations.some(r => {
                if (r.tableId !== tableId) return false;
                if (r.status !== "booked") return false;
    
                const existingWindow = getReservationWindow(r.time, size);
    
                return (
                    newWindow.start < existingWindow.end &&
                    newWindow.end > existingWindow.start
                );
            });
    
            if (!hasConflict) {
                return tableId;
            }
        }
    
        return null;
    }
    

    async function updateAvailableTimes() {
        const size = Number(partySize.value);
        const date = bookingDate.value;
    
        let slots = getSlotsForDate(date);
    
        slots = sortSlots(slots);
    
        bookingTime.innerHTML = "";
    
        const results = await Promise.all(
            slots.map(async (slot) => {
                const tableId = await getAvailableTable(size, date, slot);
                return tableId ? slot : null;
            })
        );
    
        const validSlots = results
            .filter(Boolean)
            .sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
    
        validSlots.forEach(slot => {
            const option = document.createElement("option");
            option.value = slot;
            option.textContent = slot;
            bookingTime.appendChild(option);
        });
    
        if (!bookingTime.children.length) {
            const option = document.createElement("option");
            option.textContent = "No available tables";
            option.disabled = true;
            bookingTime.appendChild(option);
        }
    
        await updateAvailableSizes();
    }


    async function hasReservationForDate(userId, phone, date) {
        let query;
    
        if (userId) {
            query = db.collection("reservations")
                .where("userId", "==", userId)
                .where("date", "==", date)
                .where("status", "==", "booked");
        } else {
            query = db.collection("reservations")
                .where("phone", "==", phone)
                .where("date", "==", date)
                .where("status", "==", "booked");
        }
    
        const snapshot = await query.limit(1).get();
    
        return !snapshot.empty;
    }
    

    partySize.addEventListener("change", updateAvailableTimes);
    bookingDate.addEventListener("change", updateAvailableTimes);

    let isSubmitting = false;

    bookingForm?.addEventListener("submit", async function (e) {
        e.preventDefault();
    
        if (isSubmitting) return; // 🚫 блокує подвійний клік
        isSubmitting = true;
    
        try {
            const size = Number(partySize.value);
            const date = bookingDate.value;
            const time = bookingTime.value;
    
            if (!time || time === "No tables available") {
                alert("No available tables.");
                return;
            }
    
            const user = firebase.auth().currentUser;
    
            let firstName = "";
            let lastName = "";
            let phone = "";
            let userId = null;
    
            if (user) {
                userId = user.uid;
    
                const userDoc = await db.collection("users").doc(user.uid).get();
                const userData = userDoc.data() || {};
    
                firstName = userData.firstName || userData.name || "";
                lastName = userData.lastName || "";
                phone = userData.phone || "";
    
                if (!phone && guestPhoneField) {
                    phone = guestPhoneField.value.trim();
                }
            } else {
                firstName = document.getElementById("guestFirstName").value.trim();
                lastName = document.getElementById("guestLastName").value.trim();
                phone = document.getElementById("guestPhone").value.trim();
    
                if (!firstName || !lastName || !phone) {
                    alert("Please fill in your contact details.");
                    return;
                }
            }
    
            const alreadyBooked = await hasReservationForDate(userId, phone, date);
    
            if (alreadyBooked) {
                alert("You already have a reservation for this date.");
                return;
            }
    
            const tableId = await getAvailableTable(size, date, time);
    
            if (!tableId) {
                alert("No available tables.");
                await updateAvailableTimes();
                return;
            }
    
            await db.collection("reservations").add({
                userId,
                firstName,
                lastName,
                phone,
                size,
                date,
                time,
                tableId,
                status: "booked",
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
    
            alert(`Reservation confirmed.\nTable: ${tableId}\n${date} ${time}`);
    
            bookingForm.reset();
            bookingDate.value = getLocalDateString();
    
            await updateAvailableSizes();
            await updateAvailableTimes();
    
            partySize.value = "";
            bookingTime.innerHTML = "";
            bookingTime.disabled = true;
    
        } catch (error) {
            console.error(error);
            alert("Failed to save reservation.");
        } finally {
            isSubmitting = false; // 🔓 розблокування
        }
    });
    
    updateAvailableTimes();
}

async function cancelReservation(reservationId) {
    await db.collection("reservations").doc(reservationId).update({
        status: "cancelled"
    });

    alert("Reservation cancelled");
}