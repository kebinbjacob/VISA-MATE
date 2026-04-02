import { db } from "../firebase";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp, orderBy } from "firebase/firestore";
import { Application, ApplicationStatus } from "../types";

export async function getUserApplications(userId: string): Promise<Application[]> {
  const q = query(
    collection(db, "applications"),
    where("userId", "==", userId),
    orderBy("updatedAt", "desc")
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Application[];
}

export async function addApplication(userId: string, jobId: string, status: ApplicationStatus) {
  const newApp = {
    userId,
    jobId,
    status,
    appliedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  
  const docRef = await addDoc(collection(db, "applications"), newApp);
  return docRef.id;
}

export async function deleteApplication(appId: string) {
  await deleteDoc(doc(db, "applications", appId));
}
