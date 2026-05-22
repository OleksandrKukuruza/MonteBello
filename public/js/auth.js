async function registerUser(name, email, password) {
    try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        const user = cred.user;

        await db.collection("users").doc(user.uid).set({
            name,
            email,
            role: "user",
            providers: ["password"]
        });

        window.location.href = "index.html";

    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

async function loginUser(email, password) {
    try {
        const cred = await auth.signInWithEmailAndPassword(email, password);
        const user = cred.user;

        const doc = await db.collection("users").doc(user.uid).get();
        const data = doc.data();

        if (data?.role === "admin") {
            localStorage.setItem("role", "admin");
        } else {
            localStorage.setItem("role", "user");
        }

        window.location.href = "index.html";

    } catch (error) {
        console.error(error);
        alert("Помилка входу");
    }
}



async function googleLogin() {
    try {
        const result = await auth.signInWithPopup(provider);
        const user = result.user;

        const ref = db.collection("users").doc(user.uid);
        const doc = await ref.get();

        if (!doc.exists) {
            await ref.set({
                name: user.displayName,
                email: user.email,
                role: "user",
                providers: ["google"]
            });
        }

        window.location.href = "index.html";

    } catch (error) {
        console.error(error);
    }
}



async function linkEmailPassword(email, password) {
    try {
        const user = auth.currentUser;

        if (!user) {
            alert("Спочатку зайди через Google");
            return;
        }

        const credential =
            firebase.auth.EmailAuthProvider.credential(email, password);

        await user.linkWithCredential(credential);

        await db.collection("users").doc(user.uid).update({
            providers: firebase.firestore.FieldValue.arrayUnion("password")
        });

        alert("Email + password прив’язано!");

    } catch (error) {
        console.error(error);

        if (error.code === "auth/email-already-in-use") {
            alert("Цей email вже використовується");
        } else if (error.code === "auth/credential-already-in-use") {
            alert("Цей акаунт вже прив’язаний");
        } else {
            alert(error.message);
        }
    }
}


function getCurrentUser() {
    return new Promise((resolve) => {
        auth.onAuthStateChanged(async (user) => {
            if (!user) return resolve(null);

            const doc = await db.collection("users").doc(user.uid).get();
            resolve(doc.data());
        });
    });
}

function logoutUser() {
    auth.signOut().then(() => {
        window.location.href = "index.html";
    });
}

document.getElementById("loginForm").addEventListener("submit", (e) => {
    e.preventDefault();

    loginUser(
        document.getElementById("loginEmail").value,
        document.getElementById("loginPassword").value
    );
});

document.getElementById("registerForm").addEventListener("submit", (e) => {
    e.preventDefault();

    registerUser(
        document.getElementById("registerName").value,
        document.getElementById("registerEmail").value,
        document.getElementById("registerPassword").value
    );
});

document.querySelector(".googleLoginBtn").addEventListener("click", googleLogin);

