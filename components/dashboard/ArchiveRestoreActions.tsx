"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Archive, RefreshCcw, Loader2 } from "lucide-react";
import { setArchiveStateAction } from "@/app/stock-sheets/[id]/archive-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ArchiveRestoreActionsProps {
  id: string;
  status: "ACTIVE" | "ARCHIVED";
  referenceNumber: string;
  designName: string;
}

export function ArchiveRestoreActions({ id, status, referenceNumber, designName }: ArchiveRestoreActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const handleArchive = () => {
    startTransition(async () => {
      const result = await setArchiveStateAction(id, true);
      if (result.error) {
        alert(result.error);
      } else {
        setOpen(false);
      }
    });
  };

  const handleRestore = () => {
    startTransition(async () => {
      const result = await setArchiveStateAction(id, false);
      if (result.error) {
        alert(result.error);
      }
    });
  };

  if (status === "ACTIVE") {
    return (
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="flex-1 sm:flex-none bg-transparent border-gray-700 text-gray-300 hover:text-[#E60000] hover:bg-red-950">
            <Archive size={16} className="mr-2" />
            Archive
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="bg-[#111111] border border-gray-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Stock Sheet</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to archive <strong>{referenceNumber}</strong> ({designName})? 
              <br/><br/>
              This is a reversible action. The stock sheet will be moved to the Archived view and will become read-only, but its data and design image will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending} className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isPending} onClick={handleArchive} className="bg-[#E60000] text-white hover:bg-[#CC0000]">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Archive Stock Sheet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <Button 
      onClick={handleRestore} 
      disabled={isPending}
      variant="outline" 
      className="flex-1 sm:flex-none bg-transparent border-green-900 text-green-500 hover:text-green-400 hover:bg-green-950/50"
    >
      {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw size={16} className="mr-2" />}
      Restore Stock Sheet
    </Button>
  );
}
