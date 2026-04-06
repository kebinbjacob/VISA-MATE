import React, { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { getUserApplications, updateApplicationStatus, deleteApplication } from "../services/applicationService";
import { Application, ApplicationStatus, Job } from "../types";
import { Briefcase, MapPin, Globe, Clock, Trash2, ExternalLink, GripVertical } from "lucide-react";
import { formatCurrency } from "../lib/utils";
import { DndContext, DragEndEvent, closestCorners, useDraggable, useDroppable } from "@dnd-kit/core";

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

function JobCard({ app, onDelete }: { app: Application & { job?: Job }, onDelete: (id: string) => void }) {
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

function KanbanColumn({ status, title, applications, onDelete }: { status: ApplicationStatus, title: string, applications: (Application & { job?: Job })[], onDelete: (id: string) => void }) {
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
    } catch (error) {
      console.error("Failed to update status:", error);
      // Revert on failure
      setApplications(prev => prev.map(app => 
        app.id === appId ? { ...app, status: currentStatus } : app
      ));
    }
  };

  const handleDelete = async (appId: string) => {
    if (!window.confirm("Are you sure you want to remove this job from your tracker?")) return;
    try {
      await deleteApplication(appId);
      setApplications(prev => prev.filter(app => app.id !== appId));
    } catch (error) {
      console.error("Failed to delete application:", error);
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
      <div className="mb-8 shrink-0">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-4">
          Application <span className="text-blue-700">Tracker.</span>
        </h1>
        <p className="text-gray-600 max-w-2xl text-lg">
          Drag and drop your saved jobs to track your application progress.
        </p>
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
                onDelete={handleDelete}
              />
            ))}
          </DndContext>
        </div>
      </div>
    </div>
  );
}
