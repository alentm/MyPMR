import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-analytics.js";
import { getDatabase, ref, push, set, get, child } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-database.js";
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
const database = getDatabase(app);


// function to compare the deviceids
async function findEntryByDeviceId(deviceId) {
  
  const snapshot = await get(ref(database, 'glucose_monitor'));

  if (snapshot.exists()) {
    const entries = snapshot.val();

    for (const key in entries) {
      if (entries[key].deviceId === deviceId) {
        return { key, data: entries[key] };
      }
    }
  }

  return null; // No match found
}
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
