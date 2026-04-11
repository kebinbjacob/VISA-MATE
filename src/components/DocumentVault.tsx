import React, { useState, useRef, useEffect } from "react";
import { FolderOpen, FileText, UploadCloud, MoreVertical, Search, Filter, ShieldCheck, Clock, FileImage, File, Trash2, Eye, Download, ShieldAlert } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { getUserDocuments, addDocument, deleteDocument, uploadDocumentFile } from "../services/documentService";
import { Document } from "../types";
import { formatDate } from "../lib/utils";
import toast from "react-hot-toast";

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
  url?: string;
};

export default function DocumentVault() {
  const { user } = useAuth();
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  useEffect(() => {
    if (user) {
      loadDocuments();
    }
  }, [user]);

  const loadDocuments = async () => {
    try {
      const docs = await getUserDocuments(user!.id);
      const mappedFiles = docs.map(doc => {
        const ext = doc.type;
        let icon = File;
        let color = 'text-blue-600';
        let bg = 'bg-blue-50';
        
        if (doc.isFolder) { icon = FolderOpen; color = 'text-blue-600'; bg = 'bg-blue-50'; }
        else if (ext === 'PDF') { icon = FileText; color = 'text-red-600'; bg = 'bg-red-50'; }
        else if (['JPG', 'PNG', 'JPEG'].includes(ext)) { icon = FileImage; color = 'text-emerald-600'; bg = 'bg-emerald-50'; }

        return {
          id: doc.id,
          name: doc.name,
          type: ext,
          size: doc.size,
          updatedAt: formatDate(doc.createdAt),
          isFolder: doc.isFolder,
          url: doc.url,
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
      
      setUploading(true);
      const toastId = toast.loading(`Uploading ${uploadedFile.name}...`);
      try {
        let uploadResult;
        try {
          uploadResult = await uploadDocumentFile(user.id, uploadedFile);
        } catch (storageErr: any) {
          console.error("Storage upload error:", storageErr);
          throw new Error(`Storage Error: ${storageErr.message || 'Failed to upload file to storage bucket. Check Storage RLS policies.'}`);
        }

        try {
          await addDocument(user.id, {
            name: uploadedFile.name,
            type: ext,
            size: sizeStr,
            isFolder: false,
            url: uploadResult.url,
            storagePath: uploadResult.storagePath,
          });
        } catch (dbErr: any) {
          console.error("Database insert error:", dbErr);
          throw new Error(`Database Error: ${dbErr.message || 'Failed to save document record. Check Database RLS policies.'}`);
        }
        
        loadDocuments();
        toast.success("Document uploaded successfully!", { id: toastId });
      } catch (error: any) {
        console.error("Failed to upload document:", error);
        if (error.code === 'storage/retry-limit-exceeded' || error.message?.includes('retry-limit-exceeded')) {
          setStorageError(true);
          toast.dismiss(toastId);
        } else {
          toast.error(error.message + "\n\nPlease run the provided SQL in your Supabase SQL Editor to fix this.", { id: toastId });
        }
      } finally {
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  const handleCreateFolder = async () => {
    if (!user || !newFolderName || newFolderName.trim() === "") return;

    const toastId = toast.loading("Creating folder...");
    try {
      await addDocument(user.id, {
        name: newFolderName.trim(),
        type: "FOLDER",
        size: "0 KB",
        isFolder: true,
      });
      setNewFolderName("");
      setIsCreateFolderModalOpen(false);
      loadDocuments();
      toast.success("Folder created successfully!", { id: toastId });
    } catch (error) {
      console.error("Failed to create folder:", error);
      toast.error("Failed to create folder.", { id: toastId });
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

  const handleViewFile = (file: VaultFile, e: React.MouseEvent) => {
    e.stopPropagation();
    if (file.url) {
      window.open(file.url, '_blank');
    } else {
      toast.error(`Viewing ${file.name} is not supported in this demo.`);
    }
  };

  const handleDownloadFile = (file: VaultFile, e: React.MouseEvent) => {
    e.stopPropagation();
    if (file.url) {
      const a = document.createElement('a');
      a.href = file.url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      toast.error(`Downloading ${file.name} is not supported in this demo.`);
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
          disabled={uploading}
          className="bg-blue-700 hover:bg-blue-800 text-white font-bold px-6 py-3 rounded-xl transition-colors shadow-sm flex items-center gap-2 shrink-0 disabled:opacity-50"
        >
          <UploadCloud className={`w-5 h-5 ${uploading ? 'animate-bounce' : ''}`} /> 
          {uploading ? 'Uploading...' : 'Upload Document'}
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleFileUpload}
        />
      </div>

      {storageError && (
        <div className="mb-8 bg-red-50 border border-red-200 rounded-2xl p-6 flex items-start gap-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0 text-red-600">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-red-800 font-bold text-lg mb-1">Supabase Storage Not Configured</h3>
            <p className="text-red-700 text-sm mb-3">
              We couldn't upload your document because the Supabase Storage bucket is not configured or accessible.
            </p>
            <ol className="list-decimal list-inside text-sm text-red-700 space-y-1 mb-4">
              <li>Ensure you have created a storage bucket named <strong>documents</strong> in your Supabase project.</li>
              <li>Check that the bucket is set to public or has the correct RLS policies for authenticated users.</li>
            </ol>
            <button 
              onClick={() => setStorageError(false)}
              className="px-4 py-2 bg-red-100 text-red-700 font-bold rounded-lg text-sm hover:bg-red-200 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

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

        <div 
          onClick={() => setIsCreateFolderModalOpen(true)}
          className="bg-gray-50 rounded-3xl p-6 border border-gray-200 border-dashed flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-100 transition-colors"
        >
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
                    {!file.isFolder && (
                      <>
                        <button onClick={(e) => handleViewFile(file, e)} className="p-1 text-gray-400 hover:text-blue-600 rounded" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => handleDownloadFile(file, e)} className="p-1 text-gray-400 hover:text-emerald-600 rounded" title="Download">
                          <Download className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button onClick={(e) => handleDeleteFile(file.id, e)} className="p-1 text-gray-400 hover:text-red-600 rounded" title="Delete">
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

      {/* Create Folder Modal */}
      {isCreateFolderModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Folder</h2>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder Name"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsCreateFolderModalOpen(false);
                  setNewFolderName("");
                }}
                className="px-4 py-2 text-gray-600 font-semibold hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
