import React, { useState, useEffect } from "react";
import { FileText, Save, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "../supabase";

interface ContentItem {
  id: string;
  key: string;
  title: string;
  body: string;
  is_active: boolean;
}

export default function AdminContent() {
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    body: "",
    is_active: true,
  });

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .order('key');
        
      if (error) throw error;
      
      setContents(data || []);
      if (data && data.length > 0 && !selectedKey) {
        handleSelect(data[0]);
      }
    } catch (error) {
      console.error("Error fetching content:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item: ContentItem) => {
    setSelectedKey(item.key);
    setFormData({
      title: item.title || "",
      body: item.body || "",
      is_active: item.is_active,
    });
    setSaveSuccess(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKey) return;
    
    setSaving(true);
    setSaveSuccess(false);
    
    try {
      const { error } = await supabase
        .from('content')
        .update({
          title: formData.title,
          body: formData.body,
          is_active: formData.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('key', selectedKey);

      if (error) throw error;
      
      setSaveSuccess(true);
      fetchContent(); // Refresh list to get updated data
      
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      console.error("Error saving content:", error);
      alert(`Failed to save: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const formatKeyName = (key: string) => {
    return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Content Management</h1>
        <p className="text-gray-500 text-sm">Manage static pages, FAQs, and announcements.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-2">
          {contents.map((item) => (
            <button 
              key={item.key}
              onClick={() => handleSelect(item)}
              className={`w-full text-left px-4 py-3 rounded-xl font-medium border flex items-center gap-3 transition-colors ${
                selectedKey === item.key 
                  ? 'bg-blue-50 text-blue-700 border-blue-200' 
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <FileText className={`w-5 h-5 ${selectedKey === item.key ? 'text-blue-600' : 'text-gray-400'}`} />
              {formatKeyName(item.key)}
            </button>
          ))}
          {contents.length === 0 && (
            <div className="p-4 text-center text-gray-500 text-sm border border-dashed border-gray-300 rounded-xl">
              No content blocks found in database.
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {selectedKey ? (
            <>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Edit: {formatKeyName(selectedKey)}</h2>
              
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input 
                    type="text" 
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                  <textarea 
                    rows={12}
                    required
                    value={formData.body}
                    onChange={(e) => setFormData({...formData, body: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-y font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">You can use Markdown or HTML formatting here.</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="isActive" 
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" 
                  />
                  <label htmlFor="isActive" className="text-sm text-gray-700 font-medium">Display this content</label>
                </div>
                
                <div className="pt-4 flex justify-end items-center gap-4">
                  {saveSuccess && (
                    <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                      <CheckCircle className="w-4 h-4" /> Saved successfully
                    </span>
                  )}
                  <button 
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-70"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? 'Saving...' : 'Publish Changes'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
              <FileText className="w-12 h-12 mb-4 text-gray-300" />
              <p>Select a content block from the left to edit.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
