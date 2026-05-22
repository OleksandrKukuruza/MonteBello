/* =======================
   CONTACT PAGE FORM
======================= */
const contactForm = document.getElementById("contactForm");
const contactContainer = document.querySelector(".contact-form");

if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("name").value;
        const email = document.getElementById("email").value;
        const subject = document.getElementById("subject").value;
        const message = document.getElementById("message").value;

        await db.collection("messages").add({
            type: "contact-page",
            name,
            email,
            subject,
            message,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showSystemMessage("Message sent successfully!", contactContainer);
        contactForm.reset();
    });
}

function showSystemMessage(text, container = document.body) {
    const div = document.createElement("div");
    div.className = "message system-msg";

    div.innerHTML = `
        <div class="system-bubble">
            <i class="fa-solid fa-circle-check"></i>
            <span>${text}</span>
        </div>
    `;

    container.appendChild(div);
}

/* =======================
   FOOTER FORM
======================= */
const footerForm = document.getElementById("footerForm");

if (footerForm) {
    footerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const inputs = footerForm.querySelectorAll("input, textarea");

        const data = {
            type: "footer-form",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()        };

        inputs.forEach(input => {
            if (input.type === "email") data.email = input.value;
            else if (input.type === "text" && !data.firstName) data.firstName = input.value;
            else if (input.type === "text") data.lastName = input.value;
            else if (input.tagName === "TEXTAREA") data.message = input.value;
        });

        await db.collection("messages").add(data);

        showSystemMessage("Your message has been sent!", footerFormContainer);
        footerForm.reset();
    });
}