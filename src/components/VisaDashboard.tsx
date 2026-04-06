import React, { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { getUserVisas, addVisa, getVisaGuidance, getVisaStatusColor } from "../services/visaService";
import { Visa, VisaType, VisaStatus } from "../types";
import { differenceInDays, parseISO } from "date-fns";
import { Plus, AlertCircle, Info, Calendar, Building, Clock } from "lucide-react";

export default function VisaDashboard() {
  const { user } = useAuth();
  const [visas, setVisas] = useState<Visa[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  const loadVisas = async () => {
    try {
      const data = await getUserVisas(user!.id);
      setVisas(data);
    } catch (error) {
      console.error("Failed to load visas:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadVisas();
    }
  }, [user]);

  const handleAddVisa = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      await addVisa(user!.id, {
        type: formData.get("type") as VisaType,
        sponsor: formData.get("sponsor") as string,
        expiryDate: new Date(formData.get("expiryDate") as string).toISOString(),
        status: formData.get("status") as VisaStatus,
        notes: formData.get("notes") as string,
      });
      setIsAdding(false);
      loadVisas();
    } catch (error) {
      console.error("Failed to add visa:", error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Visa Tracker</h1>
        <button 
          onClick={() => setIsAdding(true)}
          className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Visa
        </button>
      </div>

      {isAdding && (
        <div className="data-grid p-6">
          <h2 className="text-lg font-bold mb-4">Add New Visa</h2>
          <form onSubmit={handleAddVisa} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Visa Type</label>
                <select name="type" className="w-full p-2 border border-gray-300 rounded-lg" required>
                  <option value="employment">Employment</option>
                  <option value="visit">Visit</option>
                  <option value="freelance">Freelance</option>
                  <option value="golden">Golden</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Status</label>
                <select name="status" className="w-full p-2 border border-gray-300 rounded-lg" required>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Sponsor / Company</label>
                <input type="text" name="sponsor" className="w-full p-2 border border-gray-300 rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Expiry Date</label>
                <input type="date" name="expiryDate" className="w-full p-2 border border-gray-300 rounded-lg" required />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-1">Notes (Optional)</label>
                <textarea name="notes" className="w-full p-2 border border-gray-300 rounded-lg" rows={2}></textarea>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-bold">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700">Save Visa</button>
            </div>
          </form>
        </div>
      )}

      {visas.length === 0 && !isAdding ? (
        <div className="data-grid p-12 text-center text-gray-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>No visas tracked yet. Add your current visa to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {visas.map(visa => {
            const daysRemaining = differenceInDays(parseISO(visa.expiryDate), new Date());
            const guidance = getVisaGuidance(visa);
            const statusColor = getVisaStatusColor(visa.expiryDate);

            return (
              <div key={visa.id} className="data-grid p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                  <div>
                    <h3 className="text-xl font-bold capitalize">{visa.type} Visa</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                      <span className="flex items-center gap-1"><Building className="w-4 h-4" /> {visa.sponsor}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Expires: {new Date(visa.expiryDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-lg border font-bold flex items-center gap-2 ${statusColor}`}>
                    <Clock className="w-5 h-5" />
                    {daysRemaining > 0 ? `${daysRemaining} Days Remaining` : 'Expired'}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <h4 className="font-bold flex items-center gap-2 mb-3 text-gray-900">
                    <Info className="w-4 h-4 text-blue-500" />
                    Guidance & Next Steps
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Required Steps</h5>
                      <ul className="list-disc list-inside text-sm space-y-1 text-gray-700">
                        {guidance.steps.map((step, i) => <li key={i}>{step}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Required Documents</h5>
                      <ul className="list-disc list-inside text-sm space-y-1 text-gray-700">
                        {guidance.documents.map((doc, i) => <li key={i}>{doc}</li>)}
                      </ul>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-4 text-sm">
                    <span className="bg-white px-3 py-1 rounded border border-gray-200 font-medium">Fee: {guidance.fees}</span>
                    <span className="bg-red-50 text-red-700 px-3 py-1 rounded border border-red-200 font-medium">Emergency: {guidance.emergency}</span>
                    {guidance.links.map((link, i) => (
                      <a key={i} href={link.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-medium px-3 py-1">
                        {link.label} &rarr;
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
