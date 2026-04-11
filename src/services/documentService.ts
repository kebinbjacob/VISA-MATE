import { supabase } from "../supabase";
import { Document } from "../types";

export async function getUserDocuments(userId: string): Promise<Document[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching documents:", error);
    return [];
  }

  return data.map(doc => ({
    id: doc.id,
    userId: doc.user_id,
    name: doc.name,
    type: doc.type,
    size: doc.size,
    url: doc.url,
    storagePath: doc.storage_path,
    isFolder: doc.is_folder,
    parentId: doc.parent_id,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at
  })) as Document[];
}

export async function uploadDocumentFile(userId: string, file: File): Promise<{ url: string, storagePath: string }> {
  const storagePath = `users/${userId}/documents/${Date.now()}_${file.name}`;
  
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, file);

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage
    .from('documents')
    .getPublicUrl(storagePath);

  return { url: data.publicUrl, storagePath };
}

export async function addDocument(userId: string, docData: Omit<Document, "id" | "userId" | "createdAt" | "updatedAt">) {
  const newDoc = {
    user_id: userId,
    name: docData.name,
    type: docData.type,
    size: docData.size,
    url: docData.url,
    storage_path: docData.storagePath,
    is_folder: docData.isFolder,
    parent_id: docData.parentId
  };
  
  const { data, error } = await supabase
    .from('documents')
    .insert([newDoc])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data.id;
}

export async function deleteDocument(docId: string) {
  // First get the document to find its storage path
  const { data: doc, error: fetchError } = await supabase
    .from('documents')
    .select('storage_path')
    .eq('id', docId)
    .single();

  if (fetchError) {
    console.error("Error fetching document to delete:", fetchError);
    return;
  }

  // If it has a storage path, delete the file from Supabase Storage
  if (doc?.storage_path) {
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([doc.storage_path]);
      
    if (storageError) {
      console.error("Failed to delete file from storage:", storageError);
    }
  }
  
  // Delete the database record
  const { error: deleteError } = await supabase
    .from('documents')
    .delete()
    .eq('id', docId);

  if (deleteError) {
    throw deleteError;
  }
}

export async function updateDocument(docId: string, updates: Partial<Document>) {
  const dbUpdates: any = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.type !== undefined) dbUpdates.type = updates.type;
  if (updates.size !== undefined) dbUpdates.size = updates.size;
  if (updates.url !== undefined) dbUpdates.url = updates.url;
  if (updates.storagePath !== undefined) dbUpdates.storage_path = updates.storagePath;
  if (updates.isFolder !== undefined) dbUpdates.is_folder = updates.isFolder;
  if (updates.parentId !== undefined) dbUpdates.parent_id = updates.parentId;
  
  dbUpdates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('documents')
    .update(dbUpdates)
    .eq('id', docId);

  if (error) {
    throw error;
  }
}
