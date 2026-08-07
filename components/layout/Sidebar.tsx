"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Home, PlusCircle, LogOut, Activity } from "lucide-react";
import { logoutAction } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarProps {
  userEmail: string;
}

export function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { name: "Home", href: "/", icon: Home, disabled: false },
    { name: "Create Stock Sheet", href: "/stock-sheets/new", icon: PlusCircle, disabled: false },
    { name: "Activity", href: "/activity", icon: Activity, disabled: false },
  ];

  const closeSidebar = () => setIsOpen(false);

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-[#0A0A0A] border-b border-gray-800">
        <div className="text-xl font-black uppercase tracking-widest text-[#E60000]">
          KAVON
        </div>
        <button onClick={() => setIsOpen(!isOpen)} className="text-white p-2">
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar Content */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-[#111111] border-r border-gray-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6">
          <h1 className="text-2xl font-black uppercase tracking-widest text-[#E60000] mb-1">
            KAVON
          </h1>
          <p className="text-xs text-gray-500 uppercase tracking-widest">
            Admin Panel
          </p>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            if (item.disabled) {
              return (
                <div 
                  key={item.name}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-gray-500 cursor-not-allowed"
                >
                  <Icon size={18} />
                  <span className="font-medium text-sm">{item.name}</span>
                </div>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={closeSidebar}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors font-medium text-sm",
                  isActive 
                    ? "bg-[#E60000]/10 text-[#E60000]" 
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                )}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="mb-4">
            <p className="text-xs text-gray-500 uppercase mb-1">Signed in as</p>
            <p className="text-sm font-medium text-gray-300 truncate" title={userEmail}>
              {userEmail}
            </p>
          </div>
          
          <form action={logoutAction}>
            <Button 
              type="submit" 
              variant="outline" 
              className="w-full bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              <LogOut size={16} className="mr-2" />
              Log Out
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
