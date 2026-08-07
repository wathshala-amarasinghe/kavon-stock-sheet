"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { loginAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import Image from "next/image";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (data: LoginFormValues) => {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.append("email", data.email);
      formData.append("password", data.password);
      
      const result = await loginAction(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#111111] border border-gray-800 p-8 rounded-xl shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4">
            <Image 
              src="/brand/logo.png" 
              alt="KAVON Logo" 
              width={160} 
              height={45} 
              priority
              className="object-contain"
            />
          </div>
          <p className="text-gray-400 text-sm tracking-widest uppercase">
            Wear Power. Wear KAVON.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-300">Email Address</Label>
            <Input
              id="email"
              type="email"
              className="bg-black border-gray-700 text-white focus-visible:ring-[#E60000]"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-[#E60000] text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-300">Password</Label>
            <Input
              id="password"
              type="password"
              className="bg-black border-gray-700 text-white focus-visible:ring-[#E60000]"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-[#E60000] text-sm mt-1">{errors.password.message}</p>
            )}
          </div>

          {error && (
            <div className="p-3 bg-[#E60000]/10 border border-[#E60000]/20 rounded text-[#E60000] text-sm text-center">
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
              "Log In"
            )}
          </Button>

          <div className="text-center mt-6">
            <p className="text-gray-400 text-sm">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-[#E60000] hover:text-[#CC0000] font-bold uppercase tracking-wide">
                Create account
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
