import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-analytics.js";
import { getDatabase, ref, push, set } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-analytics.js";
//TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration

const firebaseConfig = {
  apiKey: "AIzaSyDy152jkYklRNnxg0g95xL5uG5VDqEGjXM",
  authDomain: "mypmr-70eed.firebaseapp.com",
  databaseURL: "https://mypmr-70eed-default-rtdb.firebaseio.com",
  projectId: "mypmr-70eed",
  storageBucket: "mypmr-70eed.firebasestorage.app",
  messagingSenderId: "577795964936",
  appId: "1:577795964936:web:394ac4e7731ef21482d1bd",
  measurementId: "G-5QMQT6RXPW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
// Initialize Realtime Database
const db = getDatabase(app);

// Function to save data to Firebase
export async function saveToFirebase(path, data) {
  try {
    const reference = push(ref(database, path));
    await set(reference, data);
    console.log('Data saved to Firebase:', data);
  } catch (error) {
    console.error('Error saving to Firebase:', error);
  }
}
