import { registerAction } from "./actions";
import { RegisterForm } from "./RegisterForm";
import Image from "next/image";

export default function RegisterPage() {
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
            Create an Account
          </p>
        </div>
        <RegisterForm action={registerAction} />
      </div>
    </div>
  );
}
