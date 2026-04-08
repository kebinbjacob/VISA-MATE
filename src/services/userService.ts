import { supabase } from "../supabase";
import { UserProfile, CVData } from "../types";
import { User } from "@supabase/supabase-js";

export async function getOrCreateUserProfile(user: User): Promise<UserProfile> {
  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    // PGRST116 means "no rows returned" which is expected for new users.
    // Any other error (like infinite recursion) should be thrown.
    console.error("Error fetching user profile:", fetchError);
    if (fetchError.message?.includes('recursion')) {
      throw new Error("RLS_RECURSION_ERROR");
    }
    // We might still want to proceed if it's some other weird error, but throwing is safer
    // to prevent primary key violations on insert.
  }

  if (existingUser) {
    return {
      id: existingUser.id,
      name: existingUser.name,
      email: existingUser.email,
      role: existingUser.role,
      subscriptionTier: existingUser.subscription_tier,
      cvData: existingUser.cv_data,
      createdAt: existingUser.created_at,
      updatedAt: existingUser.updated_at || existingUser.created_at,
      phone: existingUser.phone || user.user_metadata?.phone,
      photoUrl: existingUser.photo_url || user.user_metadata?.photoUrl || user.user_metadata?.avatar_url,
      headline: existingUser.headline || user.user_metadata?.headline,
      location: existingUser.location || user.user_metadata?.location,
      nationality: existingUser.nationality || user.user_metadata?.nationality,
      visaStatus: existingUser.visa_status || user.user_metadata?.visaStatus,
    } as UserProfile;
  }

  const newUserProfile = {
    id: user.id,
    name: user.user_metadata?.full_name || user.email?.split('@')[0] || "New User",
    email: user.email || "",
    phone: user.user_metadata?.phone || null,
    photo_url: user.user_metadata?.photoUrl || user.user_metadata?.avatar_url || null,
    headline: user.user_metadata?.headline || null,
    location: user.user_metadata?.location || null,
    nationality: user.user_metadata?.nationality || null,
    visa_status: user.user_metadata?.visaStatus || null,
    subscription_tier: "free",
    role: "user",
    cv_data: {
      summary: "",
      experience: [],
      education: [],
      skills: [],
      languages: [],
      noticePeriod: "",
      linkedin: ""
    }
  };

  const { data: insertedUser, error: insertError } = await supabase
    .from('users')
    .insert([newUserProfile])
    .select()
    .single();

  if (insertError) {
    console.error("Error creating user profile:", insertError);
    throw insertError;
  }

  return {
    id: insertedUser.id,
    name: insertedUser.name,
    email: insertedUser.email,
    role: insertedUser.role,
    subscriptionTier: insertedUser.subscription_tier,
    cvData: insertedUser.cv_data,
    createdAt: insertedUser.created_at,
    updatedAt: insertedUser.updated_at || insertedUser.created_at,
    phone: insertedUser.phone,
    photoUrl: insertedUser.photo_url,
    headline: insertedUser.headline,
    location: insertedUser.location,
    nationality: insertedUser.nationality,
    visaStatus: insertedUser.visa_status,
  } as UserProfile;
}

export async function updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<void> {
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.subscriptionTier !== undefined) updateData.subscription_tier = data.subscriptionTier;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.photoUrl !== undefined) updateData.photo_url = data.photoUrl;
  if (data.headline !== undefined) updateData.headline = data.headline;
  if (data.location !== undefined) updateData.location = data.location;
  if (data.nationality !== undefined) updateData.nationality = data.nationality;
  if (data.visaStatus !== undefined) updateData.visa_status = data.visaStatus;
  
  if (Object.keys(updateData).length > 0) {
    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId);

    if (error) throw error;
  }
}

export async function saveCVData(userId: string, cvData: CVData): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ cv_data: cvData })
    .eq('id', userId);

  if (error) throw error;
}

export async function getCVData(userId: string): Promise<CVData | null> {
  const { data, error } = await supabase
    .from('users')
    .select('cv_data')
    .eq('id', userId)
    .single();

  if (error) {
    console.error("Error fetching CV data:", error);
    return null;
  }
  
  return data?.cv_data || null;
}
