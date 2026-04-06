import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthProvider';
import { getOrCreateUserProfile, updateUserProfile } from '../services/userService';
import { UserProfile } from '../types';
import { Camera, Save, Loader2, User as UserIcon } from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    headline: '',
    location: '',
    nationality: '',
    visaStatus: '',
  });

  useEffect(() => {
    if (user) {
      getOrCreateUserProfile(user).then((p) => {
        setProfile(p);
        setFormData({
          name: p.name || '',
          phone: p.phone || '',
          headline: p.headline || '',
          location: p.location || '',
          nationality: p.nationality || '',
          visaStatus: p.visaStatus || '',
        });
        setLoading(false);
      }).catch(err => {
        console.error("Error fetching profile:", err);
        setLoading(false);
      });
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!user || !profile) return;
    setSaving(true);
    setMessage(null);
    try {
      await updateUserProfile(user.id, formData);
      setProfile(prev => prev ? { ...prev, ...formData } : null);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error: any) {
      console.error("Error saving profile:", error);
      setMessage({ type: 'error', text: error.message || 'Failed to save profile. Make sure database columns exist.' });
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      // Create a FileReader to read the image
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async (event) => {
        const img = new Image();
        
        img.onload = async () => {
          // Resize image to max 256x256 to keep base64 string small for Firestore
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 256;
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG
          const base64Url = canvas.toDataURL('image/jpeg', 0.8);
          
          try {
            await updateUserProfile(user.id, { photoUrl: base64Url });
            setProfile(prev => prev ? { ...prev, photoUrl: base64Url } : null);
            setMessage({ type: 'success', text: 'Profile picture updated successfully!' });
          } catch (err: any) {
            console.error("Error saving profile picture:", err);
            setMessage({ type: 'error', text: err.message || 'Failed to save profile picture. Make sure database columns exist.' });
          } finally {
            setUploading(false);
          }
        };

        img.onerror = (error) => {
          console.error("Error loading image:", error);
          setUploading(false);
        };

        img.src = event.target?.result as string;
      };
      
      reader.onerror = (error) => {
        console.error("Error reading file:", error);
        setUploading(false);
      };
    } catch (error) {
      console.error("Error processing profile picture:", error);
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Save Changes
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-sm font-medium ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
            <div className="bg-blue-600 h-24 relative">
               <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full overflow-hidden bg-white border-4 border-white shadow-xl flex items-center justify-center">
                      {profile?.photoUrl ? (
                        <img src={profile.photoUrl} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full bg-blue-50 flex items-center justify-center text-blue-600 text-3xl font-bold">
                          {profile?.name ? profile.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 rounded-full transition-opacity flex items-center justify-center disabled:opacity-50"
                    >
                      {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      accept="image/png, image/jpeg, image/webp" 
                      className="hidden" 
                    />
                  </div>
               </div>
            </div>
            <div className="pt-16 pb-6 px-6 text-center">
              <h3 className="text-xl font-bold text-gray-900">{profile?.name || 'Anonymous User'}</h3>
              <p className="text-sm text-gray-500 mb-6">{user?.email}</p>
              
              <div className="space-y-4 text-left border-t border-gray-100 pt-6">
                <div className="flex items-start gap-3">
                  <UserIcon className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">User ID (System ID)</p>
                    <p className="text-xs font-mono text-gray-600 break-all">{user?.id}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <UserIcon className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Login Email</p>
                    <p className="text-xs text-gray-600">{user?.email}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Form Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-blue-600" />
                Personal Details
              </h2>
              <p className="text-sm text-gray-500 mt-1">Update your identity and contact information.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                  placeholder="+971 50 123 4567"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Professional Headline</label>
                <input
                  type="text"
                  name="headline"
                  value={formData.headline}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                  placeholder="Senior Software Engineer"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                  placeholder="Dubai, UAE"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Nationality</label>
                <input
                  type="text"
                  name="nationality"
                  value={formData.nationality}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                  placeholder="e.g. Indian, British"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Current Visa Status</label>
                <select
                  name="visaStatus"
                  value={formData.visaStatus}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all bg-white"
                >
                  <option value="">Select Visa Status</option>
                  <option value="employment">Employment Visa</option>
                  <option value="visit">Visit Visa</option>
                  <option value="freelance">Freelance Visa</option>
                  <option value="golden">Golden Visa</option>
                  <option value="dependent">Dependent Visa</option>
                  <option value="none">No Visa / Outside UAE</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
