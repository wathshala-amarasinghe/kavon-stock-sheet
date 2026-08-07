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
    // Log full details server-side for diagnosis
    console.error("Signup error code:", error.code);
    console.error("Signup error message:", error.message);
    console.error("Signup error status:", error.status);

    // If signups are disabled in Supabase dashboard
    if (error.status === 422 || error.message?.toLowerCase().includes('signup')) {
      return { error: "New registrations are currently disabled. Please contact the administrator." };
    }

    return { error: "Registration failed. Please try again." };
  }

  // Handle both email-confirmation-enabled and disabled cases
  if (data.user && !data.session) {
    // Email confirmation is enabled
    return { success: "Please check your email to confirm your account." };
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
