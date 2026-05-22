// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB8EzUjE1QpHroRNFWrvHUEmIsvlsGx5BM",
  authDomain: "montebello-9b4f0.firebaseapp.com",
  projectId: "montebello-9b4f0",
  storageBucket: "montebello-9b4f0.firebasestorage.app",
  messagingSenderId: "720378169476",
  appId: "1:720378169476:web:e9863a0357cd758e85dad1",
  measurementId: "G-J3RWSB28MT"
};


firebase.initializeApp(firebaseConfig);


const auth = firebase.auth();
const db = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();

