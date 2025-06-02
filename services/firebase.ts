// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCybUqPaJrYnl9OInmmXlYxiErJQeMHnec",
  authDomain: "social-media-app-da6d7.firebaseapp.com",
  projectId: "social-media-app-da6d7",
  storageBucket: "social-media-app-da6d7.firebasestorage.app",
  messagingSenderId: "1091688897074",
  appId: "1:1091688897074:web:89c96e4264663a8d603a2b",
  measurementId: "G-6YVN39XYVX"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app); 