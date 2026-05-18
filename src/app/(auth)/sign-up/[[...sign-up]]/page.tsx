import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="absolute inset-0 bg-glow opacity-50" />
      <div className="relative z-10">
        <SignUp appearance={{ elements: { formButtonPrimary: 'bg-blue-600 hover:bg-blue-500' } }} />
      </div>
    </div>
  );
}
