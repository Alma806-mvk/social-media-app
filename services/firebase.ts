// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
<<<<<<< HEAD
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
=======
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
>>>>>>> 8f1a7c647a85c08a403fa4c0f544b3fb1e8fd6eb
