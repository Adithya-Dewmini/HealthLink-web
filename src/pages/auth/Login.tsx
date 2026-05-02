import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { useAuth } from "../../hooks/useAuth";
import { getBaseRouteForRole, getDefaultRouteForRole } from "../../services/auth.service";

type LocationState = {
  from?: {
    pathname?: string;
  };
};

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isInitializing, loading, login, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (!isInitializing && isAuthenticated && user) {
    return <Navigate to={getDefaultRouteForRole(user.role)} replace />;
  }

  useEffect(() => {
    if (error) {
      setError("");
    }
  }, [email, password]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError("Enter your email and password.");
      return;
    }

    setError("");

    try {
      const sessionUser = await login({
        email: email.trim(),
        password,
      });

      const state = location.state as LocationState | null;
      const intendedPath = state?.from?.pathname;
      const basePath = getBaseRouteForRole(sessionUser.role);
      const redirectPath =
        intendedPath && intendedPath.startsWith(basePath)
          ? intendedPath
          : getDefaultRouteForRole(sessionUser.role);

      navigate(redirectPath, { replace: true });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to sign in.");
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-[#F5F7FA]">
      <div className="hidden w-1/2 p-4 lg:flex">
        <section className="relative flex w-full flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e3a8a] to-[#0f172a] p-12 text-white shadow-2xl">
          <div className="absolute -left-1/4 -top-1/4 h-1/2 w-1/2 rounded-full bg-blue-500 opacity-20 blur-[100px]" />

          <div className="relative z-10 flex flex-col items-start">
            <span className="mb-8 rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-sm font-medium tracking-wide text-blue-100 backdrop-blur-md">
              HealthLink
            </span>
            <h1 className="mb-6 max-w-lg text-4xl font-bold leading-tight tracking-tight lg:text-5xl">
              Role-based healthcare operations in one platform
            </h1>
            <p className="max-w-md text-lg text-blue-100/80">
              Sign in with the credentials assigned to your account. HealthLink resolves access
              from the backend and sends you to the correct workspace automatically.
            </p>
          </div>

          <div className="relative z-10 mt-12 grid gap-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-colors hover:bg-white/10">
              <h3 className="mb-1 text-lg font-semibold text-white">Global access</h3>
              <p className="text-sm text-blue-100/70">
                System admins govern platform-wide users, clinics, and verification.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-colors hover:bg-white/10">
              <h3 className="mb-1 text-lg font-semibold text-white">Invited workspaces</h3>
              <p className="text-sm text-blue-100/70">
                Center staff, doctors, pharmacists, and receptionists use invited account access.
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="flex w-full flex-col justify-center px-4 sm:px-6 lg:w-1/2 lg:px-8">
        <div className="mx-auto w-full max-w-md">
          <section className="rounded-2xl bg-white p-8 shadow-[0_2px_20px_rgb(0,0,0,0.04)] sm:p-10">
            <div className="mb-8">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-blue-600">
                Secure login
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                Sign in to HealthLink
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Authentication resolves your role and redirects you automatically.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                id="email"
                type="email"
                label="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@healthlink.com"
                autoComplete="email"
                wrapperClassName="flex flex-col space-y-1.5"
                labelClassName="text-sm font-medium text-gray-900"
                className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-1"
              />

              <div className="space-y-1.5">
                <Input
                  id="password"
                  type="password"
                  label="Password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  wrapperClassName="flex flex-col space-y-1.5"
                  labelClassName="text-sm font-medium text-gray-900"
                  className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-1"
                />
                <div className="flex justify-end pt-1">
                  <Link
                    to="/reset-password"
                    className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-500"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              {error ? (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="pt-2">
                <Button
                  type="submit"
                  isLoading={loading}
                  className="flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition-all duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Sign in
                </Button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
