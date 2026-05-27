import { ChangeEvent, FormEvent, useState } from 'react';
import { CredentialResponse, GoogleLogin } from '@react-oauth/google';
import { Link, useNavigate } from 'react-router-dom';
import { PageReveal } from '../components/motion/Reveal';
import { apiRequest, AuthResponse, setAuthSession } from '../lib/api';

type RegisterFormValues = {
  firstName: string;
  lastName: string;
  username: string;
  phone: string;
  socialLinks: string;
  password: string;
  confirmPassword: string;
};

type RegisterFormErrors = Partial<Record<keyof RegisterFormValues, string>>;

const heroImage =
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1400&q=80';

const initialValues: RegisterFormValues = {
  firstName: '',
  lastName: '',
  username: '',
  phone: '',
  socialLinks: '',
  password: '',
  confirmPassword: '',
};

const getInputClass = (hasError: boolean) =>
  `w-full rounded-2xl border bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 ${
    hasError
      ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-100'
      : 'border-slate-200 focus:border-sky-400 focus:ring-4 focus:ring-sky-100'
  }`;

const validateForm = (values: RegisterFormValues): RegisterFormErrors => {
  const errors: RegisterFormErrors = {};

  const firstName = values.firstName.trim();
  const lastName = values.lastName.trim();
  const username = values.username.trim();
  const phone = values.phone.trim();
  const socialLinks = values.socialLinks
    .split(/[\n,]+/)
    .map((link) => link.trim())
    .filter(Boolean);

  if (!firstName) {
    errors.firstName = 'First name is required.';
  }

  if (!lastName) {
    errors.lastName = 'Last name is required.';
  }

  if (!username) {
    errors.username = 'Username is required.';
  } else if (username.length < 3 || username.length > 20) {
    errors.username = 'Username must be between 3 and 20 characters.';
  } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.username = 'Use only letters, numbers, and underscores.';
  }

  if (!phone) {
    errors.phone = 'Phone number is required.';
  } else if (!/^\+?[0-9()\-\s]{7,20}$/.test(phone)) {
    errors.phone = 'Enter a valid phone number.';
  }

  for (const link of socialLinks) {
    try {
      const parsed = new URL(link);

      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      errors.socialLinks =
        'Use full valid links, for example https://instagram.com/yourname';
      break;
    }
  }

  if (!values.password) {
    errors.password = 'Password is required.';
  } else if (values.password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(values.password)) {
    errors.password =
      'Password must include uppercase, lowercase, and a number.';
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password.';
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return errors;
};

const RegisterPage = () => {
  const navigate = useNavigate();
  const googleEnabled = Boolean(process.env.REACT_APP_GOOGLE_CLIENT_ID);
  const [formValues, setFormValues] = useState<RegisterFormValues>(initialValues);
  const [errors, setErrors] = useState<RegisterFormErrors>({});
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitTone, setSubmitTone] = useState<'idle' | 'error' | 'success'>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const finishAuth = (data: AuthResponse) => {
    setAuthSession(data.token, data.user, true);
    setSubmitTone('success');
    setSubmitMessage('Registration successful. Redirecting...');

    if (data.user.role === 'superadmin') {
      navigate('/superadmin', { replace: true });
      return;
    }

    navigate('/', { replace: true });
  };

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    const fieldName = name as keyof RegisterFormValues;

    setFormValues((current) => ({
      ...current,
      [fieldName]: value,
    }));

    setErrors((current) => ({
      ...current,
      [fieldName]: undefined,
    }));

    setSubmitTone('idle');
    setSubmitMessage('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const nextErrors = validateForm(formValues);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await apiRequest<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          firstName: formValues.firstName.trim(),
          lastName: formValues.lastName.trim(),
          username: formValues.username.trim(),
          phone: formValues.phone.trim(),
          socialLinks: formValues.socialLinks,
          password: formValues.password,
          confirmPassword: formValues.confirmPassword,
        }),
      });

      finishAuth(data);
    } catch (error) {
      setSubmitTone('error');
      setSubmitMessage(
        error instanceof Error ? error.message : 'Registration failed. Please try again.'
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
      setSubmitMessage('Google sign-up did not return a valid credential.');
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await apiRequest<AuthResponse>('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });

      finishAuth(data);
    } catch (error) {
      setSubmitTone('error');
      setSubmitMessage(
        error instanceof Error
          ? error.message
          : 'Google registration failed. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleError = () => {
    setSubmitTone('error');
    setSubmitMessage('Google registration was cancelled or failed.');
  };

  const passwordsMatch =
    formValues.confirmPassword.length > 0 &&
    formValues.password === formValues.confirmPassword;

  return (
    <PageReveal>
      <section className="bg-linear-to-br from-slate-100 via-sky-50 to-slate-200 px-4 py-8 sm:px-6 md:px-10 md:py-14">
        <div className="mx-auto max-w-6xl">
        <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/70 shadow-2xl shadow-slate-900/10 backdrop-blur">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div
              className="relative min-h-80 bg-cover bg-center sm:min-h-96"
              style={{
                backgroundImage: `linear-gradient(180deg, rgba(15, 23, 42, 0.18), rgba(15, 23, 42, 0.76)), url(${heroImage})`,
              }}
            >
              <div className="flex h-full flex-col justify-between p-6 text-white sm:p-8 lg:p-10">
                <div className="inline-flex w-fit rounded-2xl border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest backdrop-blur-sm">
                  BatBlogs
                </div>

                <div className="max-w-lg">
                  <p className="mb-3 text-sm font-medium text-white/80">
                    Create your space
                  </p>
                  <h1 className="text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
                    Start sharing your ideas with people who care.
                  </h1>
                  <p className="mt-4 max-w-md text-sm leading-7 text-white/85 sm:text-base">
                    Build your profile, publish your voice, and join a community
                    of readers and writers on BatBlogs.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/92 p-6 sm:p-8 lg:p-10">
              <div className="mx-auto max-w-xl">
                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-sky-700">
                    Register
                  </p>
                  <h2 className="mt-3 text-3xl font-black text-slate-900">
                    Create your BatBlogs account
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Set up your profile and get ready to publish your ideas.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-slate-900">
                      Continue with Google
                    </p>
                    <p className="text-xs text-slate-500">
                      Create your account faster with Google
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
                          'Set REACT_APP_GOOGLE_CLIENT_ID in the frontend env to enable Google sign-up.'
                        )
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                    >
                      Google sign-up not configured yet
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
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="firstName"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        First name
                      </label>
                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        value={formValues.firstName}
                        onChange={handleChange}
                        placeholder="John"
                        className={getInputClass(Boolean(errors.firstName))}
                      />
                      {errors.firstName && (
                        <p className="mt-2 text-xs font-medium text-rose-600">
                          {errors.firstName}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="lastName"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Last name
                      </label>
                      <input
                        id="lastName"
                        name="lastName"
                        type="text"
                        value={formValues.lastName}
                        onChange={handleChange}
                        placeholder="Doe"
                        className={getInputClass(Boolean(errors.lastName))}
                      />
                      {errors.lastName && (
                        <p className="mt-2 text-xs font-medium text-rose-600">
                          {errors.lastName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
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
                        value={formValues.username}
                        onChange={handleChange}
                        placeholder="@johnwrites"
                        className={getInputClass(Boolean(errors.username))}
                      />
                      {errors.username && (
                        <p className="mt-2 text-xs font-medium text-rose-600">
                          {errors.username}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="phone"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Phone number
                      </label>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formValues.phone}
                        onChange={handleChange}
                        placeholder="+234 800 000 0000"
                        className={getInputClass(Boolean(errors.phone))}
                      />
                      {errors.phone && (
                        <p className="mt-2 text-xs font-medium text-rose-600">
                          {errors.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="socialLinks"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Social media links (optional)
                    </label>
                    <textarea
                      id="socialLinks"
                      name="socialLinks"
                      rows={3}
                      value={formValues.socialLinks}
                      onChange={handleChange}
                      placeholder="https://instagram.com/yourname, https://x.com/yourname"
                      className={getInputClass(Boolean(errors.socialLinks))}
                    />
                    {errors.socialLinks && (
                      <p className="mt-2 text-xs font-medium text-rose-600">
                        {errors.socialLinks}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
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
                        value={formValues.password}
                        onChange={handleChange}
                        placeholder="Create a password"
                        className={getInputClass(Boolean(errors.password))}
                      />
                      {errors.password && (
                        <p className="mt-2 text-xs font-medium text-rose-600">
                          {errors.password}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="confirmPassword"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Confirm password
                      </label>
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        value={formValues.confirmPassword}
                        onChange={handleChange}
                        placeholder="Repeat your password"
                        className={getInputClass(Boolean(errors.confirmPassword))}
                      />
                      {errors.confirmPassword && (
                        <p className="mt-2 text-xs font-medium text-rose-600">
                          {errors.confirmPassword}
                        </p>
                      )}
                      {!errors.confirmPassword && formValues.confirmPassword && (
                        <p
                          className={`mt-2 text-xs font-medium ${
                            passwordsMatch ? 'text-emerald-600' : 'text-slate-500'
                          }`}
                        >
                          {passwordsMatch
                            ? 'Passwords match.'
                            : 'Passwords do not match yet.'}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-600"
                  >
                    {isSubmitting ? 'Creating account...' : 'Create account'}
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
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="font-semibold text-sky-700 transition hover:text-sky-500"
                  >
                    Sign in
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

export default RegisterPage;