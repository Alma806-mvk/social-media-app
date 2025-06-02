// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBK1xOZKCNZgShvbgK41SIH0Gy4ueuv7O8",
  authDomain: "content-creation-ai-e0f29.firebaseapp.com",
  projectId: "content-creation-ai-e0f29",
  storageBucket: "content-creation-ai-e0f29.firebasestorage.app",
  messagingSenderId: "572383616929",
  appId: "1:572383616929:web:b7fc03d5e059eae160f5e0",
  measurementId: "G-L9LY1X9N43"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics }; 