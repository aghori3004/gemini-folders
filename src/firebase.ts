// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyA31VmBJpIcsEjxt_A6k6gaDv2AHZSXWmU",
    authDomain: "gemini-folders.firebaseapp.com",
    projectId: "gemini-folders",
    storageBucket: "gemini-folders.firebasestorage.app",
    messagingSenderId: "232018677282",
    appId: "1:232018677282:web:26f2f083cd07a33ea1047b",
    measurementId: "G-5HSTJ7HEVL"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);