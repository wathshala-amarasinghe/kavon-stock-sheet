"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { registerSchema } from "./schema";

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterForm({ action }: { action: (formData: FormData) => Promise<{ error?: string } | undefined> }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = (data: RegisterFormValues) => {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.append("fullName", data.fullName);
      formData.append("email", data.email);
      formData.append("password", data.password);
      formData.append("confirmPassword", data.confirmPassword);
      
      const result = await action(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="fullName" className="text-gray-300">Full Name</Label>
        <Input
          id="fullName"
          className="bg-black border-gray-700 text-white focus-visible:ring-[#E60000]"
          autoComplete="name"
          {...register("fullName")}
        />
        {errors.fullName && (
          <p className="text-[#E60000] text-sm mt-1" aria-live="polite">{errors.fullName.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-gray-300">Email Address</Label>
        <Input
          id="email"
          type="email"
          className="bg-black border-gray-700 text-white focus-visible:ring-[#E60000]"
          autoComplete="email"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-[#E60000] text-sm mt-1" aria-live="polite">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-gray-300">Password</Label>
        <Input
          id="password"
          type="password"
          className="bg-black border-gray-700 text-white focus-visible:ring-[#E60000]"
          autoComplete="new-password"
          {...register("password")}
        />
        {errors.password && (
          <p className="text-[#E60000] text-sm mt-1" aria-live="polite">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-gray-300">Confirm Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          className="bg-black border-gray-700 text-white focus-visible:ring-[#E60000]"
          autoComplete="new-password"
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <p className="text-[#E60000] text-sm mt-1" aria-live="polite">{errors.confirmPassword.message}</p>
        )}
      </div>

      {error && (
        <div className="p-3 bg-[#E60000]/10 border border-[#E60000]/20 rounded text-[#E60000] text-sm text-center" aria-live="assertive">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="w-full bg-[#E60000] hover:bg-[#CC0000] text-white font-bold tracking-wider uppercase h-12"
      >
        {isPending ? (
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        ) : (
          "Create Account"
        )}
      </Button>

      <div className="text-center mt-6">
        <p className="text-gray-400 text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-[#E60000] hover:text-[#CC0000] font-bold uppercase tracking-wide">
            Log In
          </Link>
        </p>
      </div>
    </form>
  );
}
