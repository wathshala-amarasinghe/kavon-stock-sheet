export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Activity } from "lucide-react";

export default async function ActivityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: logs, error } = await supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#0A0A0A]">
      <Sidebar userEmail={user.email || ""} />
      
      <main className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <div className="p-4 md:p-8 flex-1">
          <div className="flex flex-col mb-8">
            <h1 className="text-3xl font-black uppercase tracking-widest text-white mb-1 flex items-center gap-3">
              <Activity className="text-[#E60000]" />
              Activity Log
            </h1>
            <p className="text-gray-400 text-sm">
              Your recent actions and events.
            </p>
          </div>

          <div className="bg-[#111111] border border-gray-800 rounded-xl overflow-hidden">
            {error ? (
              <div className="p-8 text-center">
                <p className="text-[#E60000]">Failed to load activity logs.</p>
              </div>
            ) : !logs || logs.length === 0 ? (
              <div className="p-12 text-center">
                <Activity size={48} className="mx-auto mb-4 text-gray-700" />
                <h3 className="text-xl font-bold text-gray-300 mb-2">No Activity Yet</h3>
                <p className="text-gray-500">Your actions will appear here once you start using the application.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {logs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-gray-900/50 transition-colors flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{log.summary}</p>
                      <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">
                        {log.action_type.replace(/_/g, ' ')}
                      </div>
                    </div>
                    <div className="text-sm text-gray-400 text-right">
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
