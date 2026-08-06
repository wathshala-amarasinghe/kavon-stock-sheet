import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { logoutAction } from "./login/actions";
import { Button } from "@/components/ui/button";

export const instant = false;

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#111111] border border-gray-800 p-12 rounded-xl shadow-2xl text-center">
        <h1 className="text-4xl font-black uppercase tracking-widest text-[#E60000] mb-4">
          KAVON Stock Sheet
        </h1>
        <div className="bg-[#1A1A1A] p-6 rounded-lg mb-8 border border-gray-800">
          <p className="text-gray-400 mb-2 uppercase tracking-widest text-sm">Signed in as</p>
          <p className="text-xl font-medium">{user.email}</p>
        </div>
        
        <div className="inline-block px-4 py-2 bg-green-900/30 text-green-400 border border-green-800 rounded-full mb-8 font-medium">
          ✓ Authentication successful
        </div>

        <form action={logoutAction}>
          <Button 
            type="submit" 
            variant="outline" 
            className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white uppercase tracking-wider h-12 px-8 bg-transparent"
          >
            Log Out
          </Button>
        </form>
      </div>
    </div>
  );
}
