"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { registerSchema } from "./schema";

export async function registerAction(formData: FormData) {
  const fullName = formData.get("fullName") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  const parsed = registerSchema.safeParse({ fullName, email, password, confirmPassword });
  if (!parsed.success) {
    return { error: "Invalid registration details" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
      },
    },
  });

  if (error) {
    // Return a generic error to prevent enumeration or specific details exposure
    console.error("Signup error:", error);
    return { error: "Registration failed. Please try again or try logging in." };
  }

  // Safe logging on successful registration
  if (data.session) {
    try {
      await supabase.rpc('log_user_activity', {
        p_action_type: 'account_created',
        p_summary: 'Account created',
      });
    } catch (e) {
      console.error("Failed to log account created activity", e);
    }
  }

  redirect("/");
}
