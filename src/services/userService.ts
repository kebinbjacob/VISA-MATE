import { db } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { UserProfile, CVData } from "../types";
import { User } from "firebase/auth";

export async function getOrCreateUserProfile(user: User): Promise<UserProfile> {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return { id: userSnap.id, ...userSnap.data() } as UserProfile;
  }

  const newUserProfile = {
    name: user.displayName || "New User",
    email: user.email || "",
    photoUrl: user.photoURL || "",
    subscriptionTier: "free",
    role: "user",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    cvData: {
      summary: "",
      experience: [],
      education: [],
      skills: [],
      languages: [],
      noticePeriod: "",
      linkedin: ""
    }
  };

  await setDoc(userRef, newUserProfile);
  
  return { id: user.uid, ...newUserProfile } as unknown as UserProfile;
}

export async function updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<void> {
  const userRef = doc(db, "users", userId);
  await setDoc(userRef, { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

export async function saveCVData(userId: string, cvData: CVData): Promise<void> {
  const userRef = doc(db, "users", userId);
  await setDoc(userRef, { cvData, updatedAt: serverTimestamp() }, { merge: true });
}

export async function getCVData(userId: string): Promise<CVData | null> {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const data = userSnap.data();
    return data.cvData || null;
  }
  return null;
}
