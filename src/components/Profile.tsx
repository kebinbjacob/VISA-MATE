import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './FirebaseProvider';
import { getOrCreateUserProfile, updateUserProfile } from '../services/userService';
import { UserProfile } from '../types';
import { updateProfile } from 'firebase/auth';
import { Camera, Save, Loader2, User as UserIcon } from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
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
    try {
      await updateUserProfile(user.uid, formData);
      setProfile(prev => prev ? { ...prev, ...formData } : null);
    } catch (error) {
      console.error("Error saving profile:", error);
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
        img.src = event.target?.result as string;
        
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
            await updateUserProfile(user.uid, { photoUrl: base64Url });
            setProfile(prev => prev ? { ...prev, photoUrl: base64Url } : null);
          } catch (err) {
            console.error("Error saving profile picture:", err);
          } finally {
            setUploading(false);
          }
        };
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

      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row gap-10 items-start">
          
          {/* Profile Picture Section */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg flex items-center justify-center">
                {profile?.photoUrl ? (
                  <img src={profile.photoUrl} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <UserIcon className="w-12 h-12 text-gray-400" />
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 bg-blue-600 text-white p-2.5 rounded-full shadow-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900">Profile Picture</p>
              <p className="text-xs text-gray-500 mt-1">JPG, GIF or PNG. Max 2MB.</p>
            </div>
          </div>

          {/* Form Section */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
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
              <label className="text-sm font-semibold text-gray-700">Email Address</label>
              <input
                type="email"
                value={profile?.email || ''}
                disabled
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 outline-none cursor-not-allowed"
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

            <div className="space-y-2 md:col-span-2">
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
  );
}
