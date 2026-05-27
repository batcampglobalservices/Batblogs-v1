import { ChangeEvent, FormEvent, useState } from 'react';
import { CredentialResponse, GoogleLogin } from '@react-oauth/google';
import { Link, useNavigate } from 'react-router-dom';
import { PageReveal } from '../components/motion/Reveal';
import { apiRequest, AuthResponse, setAuthSession } from '../lib/api';

type LoginErrors = {
  username?: string;
  password?: string;
};

const heroImage =
  'https://plus.unsplash.com/premium_photo-1682434403587-1313db01ed02?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

const inputClass = (hasError: boolean) =>
  `w-full rounded-2xl border bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 ${
    hasError
      ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-100'
      : 'border-slate-200 focus:border-sky-400 focus:ring-4 focus:ring-sky-100'
  }`;

const LoginPage = () => {
  const navigate = useNavigate();
  const googleEnabled = Boolean(process.env.REACT_APP_GOOGLE_CLIENT_ID);
  const [formValues, setFormValues] = useState({
    username: '',
    password: '',
    rememberMe: false,
  });
  const [errors, setErrors] = useState<LoginErrors>({});
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitTone, setSubmitTone] = useState<'idle' | 'error' | 'success'>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const finishAuth = (data: AuthResponse, persistSession: boolean) => {
    setAuthSession(data.token, data.user, persistSession);
    setSubmitTone('success');
    setSubmitMessage('Login successful. Redirecting...');

    if (data.user.role === 'superadmin') {
      navigate('/superadmin', { replace: true });
      return;
    }

    navigate('/', { replace: true });
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;

    setFormValues((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (name === 'username' || name === 'password') {
      setErrors((current) => ({
        ...current,
        [name]: undefined,
      }));
    }

    setSubmitTone('idle');
    setSubmitMessage('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const nextErrors: LoginErrors = {};
    if (!formValues.username.trim()) {
      nextErrors.username = 'Enter your username.';
    }
    if (!formValues.password) {
      nextErrors.password = 'Enter your password.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await apiRequest<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: formValues.username.trim(),
          password: formValues.password,
        }),
      });

      finishAuth(data, formValues.rememberMe);
    } catch (error) {
      setSubmitTone('error');
      setSubmitMessage(
        error instanceof Error ? error.message : 'Login failed. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (isSubmitting) {
      return;
    }

    if (!credentialResponse.credential) {
      setSubmitTone('error');
      setSubmitMessage('Google sign-in did not return a valid credential.');
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await apiRequest<AuthResponse>('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });

      finishAuth(data, formValues.rememberMe);
    } catch (error) {
      setSubmitTone('error');
      setSubmitMessage(
        error instanceof Error ? error.message : 'Google login failed. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleError = () => {
    setSubmitTone('error');
    setSubmitMessage('Google login was cancelled or failed.');
  };

  return (
    <PageReveal>
      <section className="bg-linear-to-br from-slate-100 via-sky-50 to-slate-200 px-4 py-8 sm:px-6 md:px-10 md:py-14">
        <div className="mx-auto max-w-6xl">
        <div className="overflow-hidden rounded-4xl border border-white/70 bg-white/70 shadow-2xl shadow-slate-900/10 backdrop-blur">
          <div className="grid grid-cols-1 lg:grid-cols-[1.08fr_0.92fr]">
            <div
              className="relative min-h-70 bg-cover bg-center sm:min-h-85 lg:min-h-170"
              style={{
                backgroundImage: `linear-gradient(180deg, rgba(15, 23, 42, 0.14), rgba(15, 23, 42, 0.74)), url(${heroImage})`,
              }}
            >
              <div className="flex h-full flex-col justify-between p-6 text-white sm:p-8 lg:p-10">
                <div className="inline-flex w-fit rounded-2xl border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] backdrop-blur-sm">
                  BatBlogs
                </div>

                <div className="max-w-lg">
                  <p className="mb-3 text-sm font-medium text-white/80">
                    Welcome back
                  </p>
                  <h1 className="text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
                    Pick up your next story exactly where you left it.
                  </h1>
                  <p className="mt-4 max-w-md text-sm leading-7 text-white/85 sm:text-base">
                    Sign in to manage drafts, publish posts, explore trending
                    topics, and keep your audience growing.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/92 p-6 sm:p-8 lg:p-10">
              <div className="mx-auto max-w-md">
                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                    Login
                  </p>
                  <h2 className="mt-3 text-3xl font-black text-slate-900">
                    Good to see you again
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Use your username and password, or continue with Google.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-slate-900">
                      Continue with Google
                    </p>
                    <p className="text-xs text-slate-500">
                      Use the Google account linked to your BatBlogs profile
                    </p>
                  </div>

                  {googleEnabled ? (
                    <div className="flex justify-center">
                      <GoogleLogin
                        text="continue_with"
                        shape="pill"
                        theme="outline"
                        size="large"
                        onSuccess={handleGoogleSuccess}
                        onError={handleGoogleError}
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        setSubmitTone('error') ||
                        setSubmitMessage(
                          'Set REACT_APP_GOOGLE_CLIENT_ID in the frontend env to enable Google login.'
                        )
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                    >
                      Google login not configured yet
                    </button>
                  )}
                </div>

                <div className="my-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-xs font-medium uppercase tracking-widest text-slate-400">
                    or
                  </span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                  <div>
                    <label
                      htmlFor="username"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Username
                    </label>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      spellCheck={false}
                      value={formValues.username}
                      onChange={handleChange}
                      placeholder="Enter your username"
                      className={inputClass(Boolean(errors.username))}
                    />
                    {errors.username && (
                      <p className="mt-2 text-xs font-medium text-rose-600">
                        {errors.username}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Password
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      value={formValues.password}
                      onChange={handleChange}
                      placeholder="Enter your password"
                      className={inputClass(Boolean(errors.password))}
                    />
                    {errors.password && (
                      <p className="mt-2 text-xs font-medium text-rose-600">
                        {errors.password}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <label className="inline-flex items-center gap-3 text-slate-600">
                      <input
                        type="checkbox"
                        name="rememberMe"
                        checked={formValues.rememberMe}
                        onChange={handleChange}
                        className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                      Remember me on this device
                    </label>

                    <button
                      type="button"
                      className="text-left font-semibold text-sky-700 transition hover:text-sky-500 sm:text-right"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-600"
                  >
                    {isSubmitting ? 'Signing in...' : 'Sign in'}
                  </button>
                </form>

                {submitMessage && (
                  <div
                    className={`mt-4 rounded-2xl px-4 py-3 text-sm font-medium ${
                      submitTone === 'error'
                        ? 'bg-rose-50 text-rose-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {submitMessage}
                  </div>
                )}

                <p className="mt-6 text-center text-sm text-slate-600">
                  New here?{' '}
                  <Link
                    to="/register"
                    className="font-semibold text-sky-700 transition hover:text-sky-500"
                  >
                    Create an account
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
        </div>
      </section>
    </PageReveal>
  );
};

export default LoginPage;