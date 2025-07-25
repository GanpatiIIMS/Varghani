// Import the functions you need from the SDKs
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAHsZKA9iDOG9y-XQMjiLKNNDKSe6jH1ls",
  authDomain: "varghanicollection.firebaseapp.com",
  projectId: "varghanicollection",
  storageBucket: "varghanicollection.firebasestorage.app",
  messagingSenderId: "785254121180",
  appId: "1:785254121180:web:46edb36834a7979cddbe19"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);