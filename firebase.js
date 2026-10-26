// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCM2Sj1ocQi7H5nokbznGFy1HzoJPY58QM",
  authDomain: "study-gateway-ai.firebaseapp.com",
  projectId: "study-gateway-ai",
  storageBucket: "study-gateway-ai.firebasestorage.app",
  messagingSenderId: "960186781802",
  appId: "1:960186781802:web:8c7dead1eda74f0b6cba13",
  measurementId: "G-WPYCXQYNQJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
