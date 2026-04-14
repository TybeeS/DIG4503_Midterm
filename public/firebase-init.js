import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAzNlRBXJF5uC6VK7CS7Gp9WlY1yigdYXY",
  authDomain: "pollview.firebaseapp.com",
  projectId: "pollview",
  storageBucket: "pollview.firebasestorage.app",
  messagingSenderId: "1043894229076",
  appId: "1:1043894229076:web:b0bd810c5143a201f3f5c1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
