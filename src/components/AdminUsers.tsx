import React, { useState, useEffect, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../supabase";
import { UserProfile } from "../types";
import { Search, Shield, User, Edit2, Plus, X, Mail, Ban, CheckCircle, Trash2 } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { getOrCreateUserProfile } from "../services/userService";
import { createClient } from "@supabase/supabase-js";
import toast from "react-hot-toast";

export default function AdminUsers() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("user");
  const [isCreating, setIsCreating] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState("");
  const [editSubscriptionTier, setEditSubscriptionTier] = useState<"free" | "premium">("free");
  const [editBonusCredits, setEditBonusCredits] = useState<number>(0);
  const [isUpdating, setIsUpdating] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      getOrCreateUserProfile(user).then(p => {
        setProfile(p);
        setProfileLoading(false);
      });
    }
  }, [user]);

  useEffect(() => {
    if (profile?.role === 'super_admin') {
      fetchUsers();
    }
  }, [profile]);

  const fetchUsers = async () => {
    try {
      setErrorMsg(null);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      const mappedUsers = (data || []).map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status || 'active',
        subscriptionTier: u.subscription_tier,
        bonusCredits: u.bonus_credits || 0,
        createdAt: u.created_at,
        updatedAt: u.updated_at,
      })) as UserProfile[];
      
      setUsers(mappedUsers);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      setErrorMsg(error.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId);
        
      if (error) throw error;
      
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole as any } : u));
      toast.success("User role updated successfully");
    } catch (error: any) {
      console.error("Error updating role:", error);
      toast.error(`Failed to update user role: ${error.message || 'Unknown error'}`);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ status: newStatus })
        .eq('id', userId);
        
      if (error) throw error;
      
      setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus as any } : u));
      toast.success(`User ${newStatus === 'suspended' ? 'suspended' : 'activated'} successfully`);
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error(`Failed to update user status: ${error.message || 'Unknown error'}`);
    }
  };

  const handleResetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      toast.success(`Password reset email sent to ${email}`);
    } catch (error: any) {
      console.error("Error sending reset email:", error);
      toast.error(`Failed to send reset email: ${error.message}`);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    const toastId = toast.loading("Creating user...");
    
    try {
      // Create a secondary client to avoid modifying the current session
      const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
      const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;
      
      const adminAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      });

      // 1. Create the user in Supabase Auth
      const { data: authData, error: authError } = await adminAuthClient.auth.signUp({
        email: newUserEmail,
        password: newUserPassword,
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Update the user's role in the public.users table
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            name: newUserName,
            role: newUserRole,
            status: 'active'
          })
          .eq('id', authData.user.id);
          
        if (updateError) throw updateError;
        
        // Refresh the user list
        await fetchUsers();
        setIsCreateModalOpen(false);
        setNewUserName("");
        setNewUserEmail("");
        setNewUserPassword("");
        setNewUserRole("user");
        toast.success("User created successfully", { id: toastId });
      }
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error(`Failed to create user: ${error.message}`, { id: toastId });
    } finally {
      setIsCreating(false);
    }
  };

  const openEditModal = (u: UserProfile) => {
    setEditingUser(u);
    setEditName(u.name || "");
    setEditSubscriptionTier(u.subscriptionTier || "free");
    setEditBonusCredits(u.bonusCredits || 0);
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsUpdating(true);
    const toastId = toast.loading("Updating user...");

    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          name: editName,
          subscription_tier: editSubscriptionTier,
          bonus_credits: editBonusCredits
        })
        .eq('id', editingUser.id);
        
      if (error) throw error;
      
      setUsers(users.map(u => u.id === editingUser.id ? { ...u, name: editName, subscriptionTier: editSubscriptionTier, bonusCredits: editBonusCredits } : u));
      toast.success("User updated successfully", { id: toastId });
      setIsEditModalOpen(false);
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error(`Failed to update user: ${error.message}`, { id: toastId });
    } finally {
      setIsUpdating(false);
    }
  };

  const confirmDeleteUser = (u: UserProfile) => {
    setUserToDelete(u);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    const toastId = toast.loading("Deleting user profile data...");

    try {
      // Note: This only deletes the public.users record (and cascaded data).
      // It does not delete the auth.users record due to Supabase security restrictions on the client.
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userToDelete.id);
        
      if (error) throw error;
      
      setUsers(users.filter(u => u.id !== userToDelete.id));
      toast.success("User profile data deleted successfully", { id: toastId });
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(`Failed to delete user: ${error.message}`, { id: toastId });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    const lowerQuery = searchQuery.toLowerCase();
    return users.filter(u => 
      (u.name && u.name.toLowerCase().includes(lowerQuery)) ||
      (u.email && u.email.toLowerCase().includes(lowerQuery))
    );
  }, [users, searchQuery]);

  if (profileLoading) {
    return <div className="p-8 text-center text-gray-500">Loading...</div>;
  }

  if (profile?.role !== 'super_admin') {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 text-sm">Manage user accounts, roles, and statuses.</p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users by name or email..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
                <th className="p-4 font-medium">User</th>
                <th className="p-4 font-medium">Email</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Role</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">Loading users...</td>
                </tr>
              ) : errorMsg ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center">
                    <div className="text-red-500 mb-4 font-medium">Error: {errorMsg}</div>
                    {errorMsg.includes('recursion') && (
                      <div className="bg-red-50 text-red-800 p-4 rounded-xl text-left text-sm max-w-2xl mx-auto border border-red-200">
                        <p className="font-bold mb-2">How to fix this Supabase RLS error:</p>
                        <p className="mb-2">This is a known issue with Supabase Row Level Security (RLS) policies referencing the same table. Please run this SQL in your Supabase SQL Editor:</p>
                        <pre className="bg-white p-3 rounded border border-red-100 overflow-x-auto text-xs">
{`-- Drop the existing recursive policies
DROP POLICY IF EXISTS "Super Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Super Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Super Admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Super Admins can delete users" ON public.users;

-- Create a secure function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- Create new policies using the function
CREATE POLICY "Super Admins can view all users" ON public.users FOR SELECT USING (public.get_user_role() = 'super_admin');
CREATE POLICY "Super Admins can update all users" ON public.users FOR UPDATE USING (public.get_user_role() = 'super_admin');
CREATE POLICY "Super Admins can insert users" ON public.users FOR INSERT WITH CHECK (public.get_user_role() = 'super_admin');
CREATE POLICY "Super Admins can delete users" ON public.users FOR DELETE USING (public.get_user_role() = 'super_admin');`}
                        </pre>
                      </div>
                    )}
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">No users found.</td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${u.status === 'suspended' ? 'opacity-60' : ''}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${u.status === 'suspended' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                          {u.status === 'suspended' ? <Ban className="w-4 h-4" /> : <User className="w-4 h-4" />}
                        </div>
                        <div>
                          <span className="font-medium text-gray-900 block">{u.name || 'Unknown'}</span>
                          <span className="text-xs text-gray-500 capitalize">{u.subscriptionTier} Tier</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-gray-600">{u.email}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        u.status === 'suspended' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {u.status === 'suspended' ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="p-4">
                      <select 
                        value={u.role || 'user'}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className={`text-xs font-medium rounded-full px-3 py-1 outline-none border-2 ${
                          u.role === 'super_admin' ? 'bg-red-50 text-red-700 border-red-200' :
                          u.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          u.role === 'publisher' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          u.role === 'editor' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          'bg-gray-50 text-gray-700 border-gray-200'
                        }`}
                      >
                        <option value="user">User</option>
                        <option value="editor">Editor</option>
                        <option value="publisher">Publisher</option>
                        <option value="admin">Admin</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </td>
                    <td className="p-4 flex justify-end gap-2">
                      <button 
                        onClick={() => handleResetPassword(u.email)}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50"
                        title="Send Password Reset Email"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleStatusChange(u.id, u.status === 'suspended' ? 'active' : 'suspended')}
                        className={`p-2 transition-colors rounded-lg ${
                          u.status === 'suspended' 
                            ? 'text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600' 
                            : 'text-gray-400 hover:bg-red-50 hover:text-red-600'
                        }`}
                        title={u.status === 'suspended' ? 'Activate User' : 'Suspend User'}
                      >
                        {u.status === 'suspended' ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                      </button>
                      <button 
                        onClick={() => openEditModal(u)}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50"
                        title="Edit User"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => confirmDeleteUser(u)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                        title="Delete User Data"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">Edit User Details</h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address (Read-only)</label>
                <input 
                  type="email" 
                  disabled
                  value={editingUser.email}
                  className="w-full px-4 py-2 border border-gray-200 bg-gray-50 rounded-xl text-gray-500 outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Email changes require user verification.</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Tier</label>
                <select 
                  value={editSubscriptionTier}
                  onChange={(e) => setEditSubscriptionTier(e.target.value as "free" | "premium")}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="free">Free</option>
                  <option value="premium">Premium</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bonus AI Credits</label>
                <input 
                  type="number" 
                  min="0"
                  value={editBonusCredits}
                  onChange={(e) => setEditBonusCredits(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Manually add or remove bonus credits for this user.</p>
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isUpdating}
                  className="px-6 py-2 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isUpdating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">Create New User</h3>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="John Doe"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input 
                  type="email" 
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="john@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input 
                  type="password" 
                  required
                  minLength={6}
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Minimum 6 characters"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select 
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="user">User</option>
                  <option value="editor">Editor</option>
                  <option value="publisher">Publisher</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isCreating}
                  className="px-6 py-2 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isCreating ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete User Modal */}
      {isDeleteModalOpen && userToDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete User Data?</h3>
              <p className="text-gray-500 mb-6">
                Are you sure you want to delete the profile data for <strong>{userToDelete.name || userToDelete.email}</strong>? 
                This action cannot be undone and will remove their profile, CVs, and documents from the platform.
              </p>
              <div className="flex justify-center gap-3">
                <button 
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setUserToDelete(null);
                  }}
                  className="px-6 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteUser}
                  disabled={isDeleting}
                  className="px-6 py-2 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isDeleting ? "Deleting..." : "Yes, Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
