// ================================================================
// FIREBASE SERVICE — Auth + Firestore + Storage
// ================================================================

import {
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth'

import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, query, where, orderBy,
  serverTimestamp, onSnapshot, writeBatch
} from 'firebase/firestore'

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { auth, db, storage } from './config.js'

// ──────────────────────────────────────────
// AUTH
// ──────────────────────────────────────────

export const login = (email, password) =>
  signInWithEmailAndPassword(auth, email, password)

export const logout = () => signOut(auth)

export const onAuth = (cb) => onAuthStateChanged(auth, cb)

export const createUser = async (email, password, name, role) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(cred.user, { displayName: name })
  await setUserProfile(cred.user.uid, { name, email, role, createdAt: serverTimestamp() })
  return cred.user
}

// ──────────────────────────────────────────
// PERFIS DE USUÁRIO (coleção "users")
// ──────────────────────────────────────────

export const setUserProfile = (uid, data) =>
  updateDoc(doc(db, 'users', uid), data).catch(() =>
    addDoc(collection(db, 'users'), { uid, ...data })
      .then(() => setDoc_safe(uid, data))
  )

async function setDoc_safe(uid, data) {
  const { setDoc } = await import('firebase/firestore')
  return setDoc(doc(db, 'users', uid), data, { merge: true })
}

export const getUserProfile = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export const getAllUsers = async () => {
  const snap = await getDocs(collection(db, 'users'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const updateUserProfile = (uid, data) => {
  const { setDoc } = import('firebase/firestore')
  return import('firebase/firestore').then(({ setDoc }) =>
    setDoc(doc(db, 'users', uid), data, { merge: true })
  )
}

export const deleteUserFromFirestore = (uid) =>
  deleteDoc(doc(db, 'users', uid))

// ──────────────────────────────────────────
// CASOS (coleção "casos")
// ──────────────────────────────────────────

export const addCaso = (data) =>
  addDoc(collection(db, 'casos'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })

export const updateCaso = (id, data) =>
  updateDoc(doc(db, 'casos', id), { ...data, updatedAt: serverTimestamp() })

export const deleteCaso = (id) =>
  deleteDoc(doc(db, 'casos', id))

export const getCasos = async (filters = {}) => {
  let q = collection(db, 'casos')
  const constraints = []

  if (filters.analista && filters.analista !== 'all')
    constraints.push(where('analista', '==', filters.analista))
  if (filters.status && filters.status !== 'all')
    constraints.push(where('statusResolucao', '==', filters.status))
  if (filters.ofensor && filters.ofensor !== 'all')
    constraints.push(where('ofensorPrincipal', '==', filters.ofensor))

  constraints.push(orderBy('dataRecebimento', 'desc'))

  const snap = await getDocs(query(q, ...constraints))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const onCasos = (cb) =>
  onSnapshot(
    query(collection(db, 'casos'), orderBy('dataRecebimento', 'desc')),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  )

// Importação em lote (planilha)
export const importCasosLote = async (rows) => {
  const batch = writeBatch(db)
  rows.forEach(row => {
    const ref = doc(collection(db, 'casos'))
    batch.set(ref, { ...row, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
  })
  return batch.commit()
}

// ──────────────────────────────────────────
// STORAGE — upload de planilhas
// ──────────────────────────────────────────

export const uploadPlanilha = async (file) => {
  const storageRef = ref(storage, `planilhas/${Date.now()}_${file.name}`)
  const snap = await uploadBytes(storageRef, file)
  return getDownloadURL(snap.ref)
}
