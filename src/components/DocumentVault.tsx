import React, { useState, useRef, useEffect } from "react";
import { FolderOpen, FileText, UploadCloud, MoreVertical, Search, Filter, ShieldCheck, Clock, FileImage, File, Trash2 } from "lucide-react";
import { useAuth } from "./FirebaseProvider";
import { getUserDocuments, addDocument, deleteDocument } from "../services/documentService";
import { Document } from "../types";

type VaultFile = {
  id: string;
  name: string;
  type: string;
  size: string;
  updatedAt: string;
  isFolder: boolean;
  count?: number;
  icon: any;
  color: string;
  bg: string;
};

export default function DocumentVault() {
  const { user } = useAuth();
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      loadDocuments();
    }
  }, [user]);

  const loadDocuments = async () => {
    try {
      const docs = await getUserDocuments(user!.uid);
      const mappedFiles = docs.map(doc => {
        const ext = doc.type;
        let icon = File;
        let color = 'text-blue-600';
        let bg = 'bg-blue-50';
        
        if (ext === 'PDF') { icon = FileText; color = 'text-red-600'; bg = 'bg-red-50'; }
        else if (['JPG', 'PNG', 'JPEG'].includes(ext)) { icon = FileImage; color = 'text-emerald-600'; bg = 'bg-emerald-50'; }
        else if (doc.isFolder) { icon = FolderOpen; color = 'text-blue-600'; bg = 'bg-blue-50'; }

        return {
          id: doc.id,
          name: doc.name,
          type: ext,
          size: doc.size,
          updatedAt: new Date(doc.createdAt).toLocaleDateString(),
          isFolder: doc.isFolder,
          icon, color, bg
        };
      });
      setFiles(mappedFiles);
    } catch (error) {
      console.error("Failed to load documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && user) {
      const uploadedFile = e.target.files[0];
      const ext = uploadedFile.name.split('.').pop()?.toUpperCase() || 'FILE';
      const sizeStr = (uploadedFile.size / (1024 * 1024)).toFixed(1) + ' MB';
      
      try {
        await addDocument(user.uid, {
          name: uploadedFile.name,
          type: ext,
          size: sizeStr,
          isFolder: false,
        });
        loadDocuments();
      } catch (error) {
        console.error("Failed to upload document:", error);
      }
    }
  };

  const handleDeleteFile = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteDocument(id);
      setFiles(files.filter(f => f.id !== id));
    } catch (error) {
      console.error("Failed to delete document:", error);
    }
  };

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-4">Document Vault</h1>
          <p className="text-gray-600 max-w-2xl text-lg">
            Securely store and manage your essential expat documents. All files are encrypted and stored locally.
          </p>
        </div>
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="bg-blue-700 hover:bg-blue-800 text-white font-bold px-6 py-3 rounded-xl transition-colors shadow-sm flex items-center gap-2 shrink-0"
        >
          <UploadCloud className="w-5 h-5" /> Upload Document
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleFileUpload}
        />
      </div>

      {/* Stats & Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Files</p>
            <h3 className="text-2xl font-bold text-gray-900">{files.filter(f => !f.isFolder).length}</h3>
          </div>
        </div>
        
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Storage Used</p>
            <h3 className="text-2xl font-bold text-gray-900">
              {files.reduce((acc, f) => acc + parseFloat(f.size || '0'), 0).toFixed(1)} MB
            </h3>
          </div>
        </div>
        
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Recently Added</p>
            <h3 className="text-2xl font-bold text-gray-900">
              {files.filter(f => {
                const date = new Date(f.updatedAt);
                const now = new Date();
                return (now.getTime() - date.getTime()) < 7 * 24 * 60 * 60 * 1000;
              }).length}
            </h3>
          </div>
        </div>

        <div className="bg-gray-50 rounded-3xl p-6 border border-gray-200 border-dashed flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-100 transition-colors">
          <span className="text-sm font-bold text-gray-600">+ Create Folder</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/50">
          <div className="relative w-full sm:w-96">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search documents..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
              <Filter className="w-4 h-4" /> Filter
            </button>
            <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
              <button className="px-4 py-2 bg-white text-gray-900 text-sm font-bold rounded-lg shadow-sm">Grid</button>
              <button className="px-4 py-2 text-gray-500 hover:text-gray-900 text-sm font-semibold rounded-lg transition-colors">List</button>
            </div>
          </div>
        </div>

        {/* Document Grid */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredFiles.length === 0 ? (
            <div className="col-span-full py-12 text-center text-gray-500">
              <FolderOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No documents found matching "{searchQuery}"</p>
            </div>
          ) : (
            filteredFiles.map(file => (
              <div key={file.id} className={`group p-5 rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all cursor-pointer ${file.isFolder ? 'bg-white' : 'bg-gray-50/50'}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 ${file.bg} rounded-xl flex items-center justify-center ${file.color} group-hover:scale-110 transition-transform`}>
                    <file.icon className={`w-6 h-6 ${file.isFolder ? 'fill-blue-100' : ''}`} />
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => handleDeleteFile(file.id, e)} className="p-1 text-gray-400 hover:text-red-600 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button className="p-1 text-gray-400 hover:text-gray-900 rounded">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <h3 className="font-bold text-gray-900 mb-1 truncate" title={file.name}>{file.name}</h3>
                <p className="text-xs text-gray-500">
                  {file.isFolder ? `${file.count} files • Updated ${file.updatedAt}` : `${file.type} • ${file.size}`}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
