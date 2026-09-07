import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="max-w-sm w-full space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-medium">Pilotage</h1>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
