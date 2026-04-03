import { db } from "../firebase";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp, orderBy, setDoc, updateDoc, getDoc } from "firebase/firestore";
import { Application, ApplicationStatus, Job } from "../types";

export async function getUserApplications(userId: string): Promise<(Application & { job?: Job })[]> {
  const q = query(
    collection(db, "applications"),
    where("userId", "==", userId),
    orderBy("updatedAt", "desc")
  );
  
  const snapshot = await getDocs(q);
  const apps = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Application[];

  // Fetch jobs for these applications
  const appsWithJobs = await Promise.all(apps.map(async (app) => {
    const jobDoc = await getDoc(doc(db, "jobs", app.jobId));
    return {
      ...app,
      job: jobDoc.exists() ? { id: jobDoc.id, ...jobDoc.data() } as Job : undefined
    };
  }));

  return appsWithJobs;
}

export async function addApplication(userId: string, job: Job, status: ApplicationStatus) {
  // First, ensure the job is saved in the jobs collection so we can reference it
  const jobRef = doc(db, "jobs", job.id);
  await setDoc(jobRef, job, { merge: true });

  const newApp = {
    userId,
    jobId: job.id,
    status,
    appliedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  
  const docRef = await addDoc(collection(db, "applications"), newApp);
  return docRef.id;
}

export async function updateApplicationStatus(appId: string, status: ApplicationStatus) {
  const appRef = doc(db, "applications", appId);
  await updateDoc(appRef, {
    status,
    updatedAt: serverTimestamp()
  });
}

export async function deleteApplication(appId: string) {
  await deleteDoc(doc(db, "applications", appId));
}
