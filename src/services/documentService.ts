import { db } from "../firebase";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp, orderBy } from "firebase/firestore";
import { Document } from "../types";

export async function getUserDocuments(userId: string): Promise<Document[]> {
  const q = query(
    collection(db, "documents"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Document[];
}

export async function addDocument(userId: string, docData: Omit<Document, "id" | "userId" | "createdAt" | "updatedAt">) {
  const newDoc = {
    ...docData,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  
  const docRef = await addDoc(collection(db, "documents"), newDoc);
  return docRef.id;
}

export async function deleteDocument(docId: string) {
  await deleteDoc(doc(db, "documents", docId));
}
