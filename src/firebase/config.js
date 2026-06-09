import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey:            "AIzaSyBn8rIsANetiHx1rK2Qaoo6rrONsLcIpkc",
  authDomain:        "ouvidoria-manager.firebaseapp.com",
  projectId:         "ouvidoria-manager",
  storageBucket:     "ouvidoria-manager.firebasestorage.app",
  messagingSenderId: "194113777380",
  appId:             "1:194113777380:web:8ca501836a96f8926606f1"
}

const app       = initializeApp(firebaseConfig)
export const auth    = getAuth(app)
export const db      = getFirestore(app)
export const storage = getStorage(app)