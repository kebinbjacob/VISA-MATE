import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { FileText, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ContentItem {
  id: string;
  key: string;
  title: string;
  body: string;
  is_active: boolean;
}

export default function Resources() {
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('is_active', true)
        .neq('key', 'homepage_announcement') // Exclude homepage announcement from this list
        .order('key');
        
      if (error) throw error;
      
      setContents(data || []);
      if (data && data.length > 0) {
        setExpandedId(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching content:", error);
    } finally {
      setLoading(false);
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
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Resources & Guides</h1>
        <p className="text-gray-600">Helpful information, FAQs, and guides for your expat journey.</p>
      </div>

      {contents.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-sm">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">No Resources Available</h3>
          <p className="text-gray-500">Check back later for updates and new guides.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {contents.map((item) => (
            <div 
              key={item.id} 
              className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm transition-all"
            >
              <button
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                className="w-full px-6 py-5 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${expandedId === item.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{item.title || item.key.replace(/_/g, ' ')}</h3>
                </div>
                {expandedId === item.id ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
              
              {expandedId === item.id && (
                <div className="px-6 pb-6 pt-2 border-t border-gray-100">
                  <div className="prose prose-blue max-w-none prose-headings:font-bold prose-a:text-blue-600">
                    <ReactMarkdown>{item.body}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
