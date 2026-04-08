import { supabase } from "../supabase";
import { Application, ApplicationStatus, Job } from "../types";

export async function getUserApplications(userId: string): Promise<(Application & { job?: Job })[]> {
  const { data, error } = await supabase
    .from('applications')
    .select(`
      *,
      job:jobs(*)
    `)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error("Error fetching applications:", error);
    return [];
  }

  return data.map(app => ({
    id: app.id,
    userId: app.user_id,
    jobId: app.job_id,
    status: app.status,
    notes: app.notes,
    appliedAt: app.applied_at,
    updatedAt: app.updated_at,
    job: app.job ? {
      id: app.job.external_id || app.job.id,
      externalId: app.job.external_id,
      source: 'manual', // Fallback
      sourceUrl: '#',
      title: app.job.title,
      company: app.job.company,
      location: app.job.location,
      description: app.job.description,
      salaryMin: app.job.salary_min,
      salaryMax: app.job.salary_max,
      isRemote: app.job.is_remote,
      companyCulture: app.job.culture_tags,
      currency: "AED",
      jobType: "full_time",
      experienceLevel: "mid",
      skills: [],
      postedAt: app.job.created_at,
      isVerified: true,
      isActive: true,
    } : undefined
  })) as (Application & { job?: Job })[];
}

export async function addApplication(userId: string, job: Job, status: ApplicationStatus) {
  // First, ensure the job is saved in the jobs collection so we can reference it
  // Check if job exists first
  let jobId = null;
  const { data: existingJob } = await supabase
    .from('jobs')
    .select('id')
    .eq('external_id', job.id)
    .single();

  if (!existingJob) {
    const { data: newJob, error: jobError } = await supabase
      .from('jobs')
      .insert([{
        external_id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        description: job.description,
        salary_min: job.salaryMin,
        salary_max: job.salaryMax,
        is_remote: job.isRemote,
        culture_tags: job.companyCulture,
        job_type: job.jobType,
        experience_level: job.experienceLevel,
        source_url: job.sourceUrl,
        source: job.source,
        currency: job.currency,
        skills: job.skills,
        is_active: job.isActive,
        is_verified: job.isVerified,
        posted_at: job.postedAt
      }])
      .select('id')
      .single();
      
    if (jobError) {
      console.error("Error saving job:", jobError);
      throw jobError;
    }
    jobId = newJob.id;
  } else {
    jobId = existingJob.id;
  }

  const newApp = {
    user_id: userId,
    job_id: jobId,
    status: status
  };
  
  const { data, error } = await supabase
    .from('applications')
    .insert([newApp])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data.id;
}

export async function updateApplicationStatus(appId: string, status: ApplicationStatus) {
  const { error } = await supabase
    .from('applications')
    .update({ 
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', appId);

  if (error) throw error;
}

export async function deleteApplication(appId: string) {
  const { error } = await supabase
    .from('applications')
    .delete()
    .eq('id', appId);

  if (error) throw error;
}
