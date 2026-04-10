import React, { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { getUserApplications, updateApplicationStatus, deleteApplication, addApplication } from "../services/applicationService";
import { Application, ApplicationStatus, Job } from "../types";
import { Briefcase, MapPin, Globe, Clock, Trash2, ExternalLink, GripVertical, Plus, X } from "lucide-react";
import { formatCurrency } from "../lib/utils";
import { DndContext, DragEndEvent, closestCorners, useDraggable, useDroppable } from "@dnd-kit/core";
import toast from "react-hot-toast";
import ConfirmModal from "./ui/ConfirmModal";

const STATUS_COLORS: Record<ApplicationStatus, { bg: string, text: string, border: string, header: string }> = {
  saved: { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200", header: "bg-gray-200" },
  applied: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", header: "bg-blue-200" },
  interview: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", header: "bg-purple-200" },
  offer: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", header: "bg-emerald-200" },
  rejected: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", header: "bg-red-200" }
};

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  interview: "Interviewing",
  offer: "Offer Received",
  rejected: "Rejected"
};

const COLUMNS: ApplicationStatus[] = ['saved', 'applied', 'interview', 'offer', 'rejected'];

function JobCard({ app, onDelete }: { key?: string | number, app: Application & { job?: Job }, onDelete: (id: string) => void | Promise<void> }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: app.id,
    data: { status: app.status }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 999 : undefined,
    opacity: isDragging ? 0.8 : 1,
  } : undefined;

  const job = app.job;
  if (!job) return null;

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`bg-white rounded-2xl p-4 border shadow-sm mb-3 relative group ${isDragging ? 'shadow-xl ring-2 ring-blue-500 border-transparent' : 'border-gray-200 hover:border-blue-300 hover:shadow-md'} transition-all`}
    >
      <div 
        {...attributes} 
        {...listeners}
        className="absolute top-3 right-3 p-1 text-gray-300 hover:text-gray-600 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="w-5 h-5" />
      </div>
      
      <h3 className="font-bold text-gray-900 pr-8 leading-tight mb-1">{job.title}</h3>
      <p className="text-sm text-gray-600 font-medium mb-3">{job.company}</p>
      
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{job.location}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Briefcase className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{job.salaryMin ? `${formatCurrency(job.salaryMin)} - ${formatCurrency(job.salaryMax || job.salaryMin)}` : "Salary Negotiable"}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <a 
          href={job.sourceUrl} 
          target="_blank" 
          rel="noreferrer"
          className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          onPointerDown={(e) => e.stopPropagation()}
        >
          View Job <ExternalLink className="w-3 h-3" />
        </a>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(app.id); }}
          onPointerDown={(e) => e.stopPropagation()}
          className="text-gray-400 hover:text-red-600 transition-colors"
          title="Remove"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function KanbanColumn({ status, title, applications, onDelete }: { key?: string | number, status: ApplicationStatus, title: string, applications: (Application & { job?: Job })[], onDelete: (id: string) => void | Promise<void> }) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  return (
    <div className="flex flex-col w-80 shrink-0">
      <div className={`px-4 py-3 rounded-t-2xl font-bold text-sm flex items-center justify-between ${STATUS_COLORS[status].header} text-gray-800`}>
        <span>{title}</span>
        <span className="bg-white/50 px-2 py-0.5 rounded-full text-xs">{applications.length}</span>
      </div>
      <div 
        ref={setNodeRef}
        className={`flex-1 p-3 rounded-b-2xl border-x border-b min-h-[500px] transition-colors ${
          isOver ? 'bg-blue-50 border-blue-200' : 'bg-gray-50/50 border-gray-200'
        }`}
      >
        {applications.map(app => (
          <JobCard key={app.id} app={app} onDelete={onDelete} />
        ))}
        {applications.length === 0 && (
          <div className="h-24 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-sm text-gray-400 font-medium">
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}

export default function JobTracker() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<(Application & { job?: Job })[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Manual Job Form State
  const [newJobTitle, setNewJobTitle] = useState("");
  const [newJobCompany, setNewJobCompany] = useState("");
  const [newJobLocation, setNewJobLocation] = useState("");
  const [newJobSalaryMin, setNewJobSalaryMin] = useState("");
  const [newJobSalaryMax, setNewJobSalaryMax] = useState("");
  const [newJobUrl, setNewJobUrl] = useState("");
  const [newJobStatus, setNewJobStatus] = useState<ApplicationStatus>("saved");
  const [appToDelete, setAppToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadApplications();
    }
  }, [user]);

  const loadApplications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const apps = await getUserApplications(user.id);
      setApplications(apps);
    } catch (error) {
      console.error("Failed to load applications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const appId = active.id as string;
    const newStatus = over.id as ApplicationStatus;
    const currentStatus = active.data.current?.status;

    if (currentStatus === newStatus) return;

    // Optimistic update
    setApplications(prev => prev.map(app => 
      app.id === appId ? { ...app, status: newStatus } : app
    ));

    try {
      await updateApplicationStatus(appId, newStatus);
      toast.success("Status updated");
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update status");
      // Revert on failure
      setApplications(prev => prev.map(app => 
        app.id === appId ? { ...app, status: currentStatus } : app
      ));
    }
  };

  const handleDelete = async () => {
    if (!appToDelete) return;
    try {
      await deleteApplication(appToDelete);
      setApplications(prev => prev.filter(app => app.id !== appToDelete));
      toast.success("Job removed from tracker");
    } catch (error) {
      console.error("Failed to delete application:", error);
      toast.error("Failed to remove job");
    } finally {
      setAppToDelete(null);
    }
  };

  const handleAddManualJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsAdding(true);

    try {
      const manualJob: Job = {
        id: `manual-${Date.now()}`,
        externalId: `manual-${Date.now()}`,
        source: 'manual',
        sourceUrl: newJobUrl || '#',
        title: newJobTitle,
        company: newJobCompany,
        location: newJobLocation || 'Remote',
        description: 'Manually added job',
        salaryMin: newJobSalaryMin ? Number(newJobSalaryMin) : undefined,
        salaryMax: newJobSalaryMax ? Number(newJobSalaryMax) : undefined,
        currency: 'AED',
        jobType: 'full_time',
        experienceLevel: 'mid',
        skills: [],
        postedAt: new Date().toISOString(),
        isVerified: false,
        isActive: true,
      };

      await addApplication(user.id, manualJob, newJobStatus);
      
      // Reload applications to get the new one with its ID
      await loadApplications();
      
      // Reset form and close modal
      setNewJobTitle("");
      setNewJobCompany("");
      setNewJobLocation("");
      setNewJobSalaryMin("");
      setNewJobSalaryMax("");
      setNewJobUrl("");
      setNewJobStatus("saved");
      setIsAddModalOpen(false);
      toast.success("Job added successfully");
    } catch (error) {
      console.error("Failed to add manual job:", error);
      toast.error("Failed to add job. Please try again.");
    } finally {
      setIsAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 h-full flex flex-col">
      <ConfirmModal
        isOpen={!!appToDelete}
        title="Remove Job"
        message="Are you sure you want to remove this job from your tracker? This action cannot be undone."
        confirmText="Remove"
        onConfirm={handleDelete}
        onCancel={() => setAppToDelete(null)}
        type="danger"
      />
      <div className="mb-8 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-4">
            Application <span className="text-blue-700">Tracker.</span>
          </h1>
          <p className="text-gray-600 max-w-2xl text-lg">
            Drag and drop your saved jobs to track your application progress.
          </p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors font-bold text-sm shadow-sm shrink-0"
        >
          <Plus className="w-5 h-5" />
          Add Job Manually
        </button>
      </div>

      <div className="flex-1 overflow-x-auto hide-scrollbar pb-8">
        <div className="flex gap-6 h-full items-start">
          <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
            {COLUMNS.map(status => (
              <KanbanColumn 
                key={status}
                status={status}
                title={STATUS_LABELS[status]}
                applications={applications.filter(a => a.status === status)}
                onDelete={(id) => setAppToDelete(id)}
              />
            ))}
          </DndContext>
        </div>
      </div>

      {/* Add Manual Job Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
              <h3 className="text-xl font-bold text-gray-900">Add Job Manually</h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-100 hover:bg-gray-200 p-2 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6">
              <form id="add-job-form" onSubmit={handleAddManualJob} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Job Title *</label>
                  <input 
                    type="text" 
                    required
                    value={newJobTitle}
                    onChange={(e) => setNewJobTitle(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                    placeholder="e.g. Senior Frontend Developer"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Company *</label>
                  <input 
                    type="text" 
                    required
                    value={newJobCompany}
                    onChange={(e) => setNewJobCompany(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                    placeholder="e.g. Acme Corp"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Location</label>
                  <input 
                    type="text" 
                    value={newJobLocation}
                    onChange={(e) => setNewJobLocation(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                    placeholder="e.g. Dubai, UAE or Remote"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Min Salary (AED)</label>
                    <input 
                      type="number" 
                      value={newJobSalaryMin}
                      onChange={(e) => setNewJobSalaryMin(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                      placeholder="e.g. 15000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Max Salary (AED)</label>
                    <input 
                      type="number" 
                      value={newJobSalaryMax}
                      onChange={(e) => setNewJobSalaryMax(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                      placeholder="e.g. 25000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Job URL</label>
                  <input 
                    type="url" 
                    value={newJobUrl}
                    onChange={(e) => setNewJobUrl(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                    placeholder="https://..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Initial Status</label>
                  <select 
                    value={newJobStatus}
                    onChange={(e) => setNewJobStatus(e.target.value as ApplicationStatus)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow bg-white"
                  >
                    <option value="saved">Saved</option>
                    <option value="applied">Applied</option>
                    <option value="interview">Interviewing</option>
                    <option value="offer">Offer Received</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 shrink-0 bg-gray-50">
              <button 
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                form="add-job-form"
                disabled={isAdding}
                className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
              >
                {isAdding ? "Adding..." : "Add Job"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
