"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const parsed = loginSchema.safeParse({ email, password });
  if (!parsed.success) {
    return { error: "Invalid credentials" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "Invalid credentials" };
  }

  // Safe logging on successful login
  try {
    await supabase.rpc('log_user_activity', {
      p_action_type: 'login',
      p_summary: 'Logged in',
    });
  } catch (e) {
    // Suppress error so login still succeeds if logging fails
    console.error("Failed to log login activity", e);
  }

  redirect("/");
}

export async function logoutAction() {
  const supabase = await createClient();

  // Attempt to log out activity before terminating session
  try {
    await supabase.rpc('log_user_activity', {
      p_action_type: 'logout',
      p_summary: 'Logged out',
    });
  } catch (e) {
    console.error("Failed to log logout activity", e);
  }

  await supabase.auth.signOut();
  redirect("/login");
}
