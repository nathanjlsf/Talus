import { useEffect, useState } from "react"
import type { SubmitEvent } from "react"
import { useNavigate } from "react-router"
import { Eye, EyeOff, Mountain } from "lucide-react"
import { getCurrentUser, supabase } from "../services/supabase"
import { createTalusUser } from "../services/api"

function Auth() {
  const navigate = useNavigate()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [resetSent, setResetSent] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsResettingPassword(true)
        setMessage("")
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function handlePasswordReset() {
    if (!email) {
      setMessage("Enter your email address first.")
      return
    }

    setLoading(true)
    setMessage("")

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      })

      if (error) {
        throw error
      }

      setResetSent(true)
      setMessage("Check your email for a password reset link.")
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      )
    } finally {
      setLoading(false)
    }
  }

  async function handlePasswordUpdate() {
    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.")
      return
    }

    if (!/\d/.test(password)) {
      setMessage("Password must contain at least one number.")
      return
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.")
      return
    }

    setLoading(true)
    setMessage("")

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      })

      if (error) {
        throw error
      }

      await supabase.auth.signOut()

      setIsResettingPassword(false)
      setMessage("")
      setPassword("")
      setConfirmPassword("")
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "message" in error &&
        typeof error.message === "string"
      ) {
        const errorMessage = error.message.toLowerCase()

        if (
          errorMessage.includes("same password") ||
          errorMessage.includes("different password")
        ) {
          setMessage(
            "Your new password must be different from your current password."
          )
        } else {
          setMessage(error.message)
        }
      } else {
        setMessage("Something went wrong. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault()

    setLoading(true)
    setMessage("")

    if (mode === "signup" && password !== confirmPassword) {
      setMessage("Passwords do not match.")
      setLoading(false)
      return
    }

    if (mode === "signup" && password.length < 8) {
      setMessage("Password must be at least 8 characters.")
      setLoading(false)
      return
    }

    if (mode === "signup" && !/\d/.test(password)) {
      setMessage("Password must contain at least one number.")
      setLoading(false)
      return
    }

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          throw error
        }

        const user = await getCurrentUser()

        if (!user) {
          throw new Error("Could not find authenticated user")
        }

        await createTalusUser({
          name: email.split("@")[0],
          supabase_user_id: user.id,
        })

        navigate("/", { replace: true })
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })

        if (error) throw error

        setMessage(
          "Account created. Check your email to confirm your account, then log in."
        )
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md items-center bg-[#f3efe4] px-5 pt-[calc(2rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))] text-[#26352a] md:px-6">
      <div className="w-full">
        <div className="mb-8 flex items-center gap-2.5">
          <Mountain size={24} strokeWidth={1.8} />

          <span className="text-xl font-semibold tracking-tight">
            Talus
          </span>
        </div>

        <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#687565]">
          Welcome to Talus
        </p>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#263a2b] md:text-4xl">
          {isResettingPassword
            ? "Choose a new password."
            : mode === "login"
              ? "Welcome back."
              : "Create your account."}
        </h1>

        <p className="mt-4 leading-7 text-[#687565]">
          {isResettingPassword
            ? "Enter a new password for your Talus account."
            : mode === "login"
              ? "Sign in to pick up where you left off."
              : "Create an account so Talus can learn your hiking preferences."}
        </p>

        {isResettingPassword ? (
          <div>
            <form
              onSubmit={(event) => {
                event.preventDefault()
                handlePasswordUpdate()
              }}
              className="mt-8 space-y-5"
            >
            <div>
              <label
                htmlFor="password"
                className="text-sm font-medium text-[#263a2b]"
              >
                New Password
              </label>

              <div className="relative mt-2">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-[#c9c4b7] bg-[#f8f5ed] px-4 py-3 pr-12 outline-none focus:border-[#314936]"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#687565] hover:text-[#314936]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="text-sm font-medium text-[#263a2b]"
              >
                Confirm New Password
              </label>

              <div className="relative mt-2">
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-xl border border-[#c9c4b7] bg-[#f8f5ed] px-4 py-3 pr-12 outline-none focus:border-[#314936]"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#687565] hover:text-[#314936]"
                  aria-label={
                    showConfirmPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>

              <p className="mt-2 text-xs text-[#687565]">
                Password must be at least 8 characters and contain at least one number.
              </p>

              {confirmPassword &&
                password !== confirmPassword && (
                  <p className="mt-2 text-xs text-red-700">
                    Passwords do not match.
                  </p>
                )}
            </div>

            {message && (
              <div className="rounded-xl border border-[#d8d2c4] bg-[#ebe6da] p-4 text-sm text-[#526052]">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#314936] px-5 py-3 font-medium text-white transition hover:bg-[#263a2b] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Updating..." : "Update password"}
            </button>
          </form>

            <button
              type="button"
              onClick={() => {
                setIsResettingPassword(false)
                setMessage("")
                setPassword("")
                setConfirmPassword("")
              }}
              className="mt-6 text-sm font-medium text-[#687565] hover:text-[#314936]"
            >
              Back to login
            </button>
          </div>
        ) : (

          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-5"
          >
          <div>
            <label
              htmlFor="email"
              className="text-sm font-medium text-[#263a2b]"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#c9c4b7] bg-[#f8f5ed] px-4 py-3 outline-none focus:border-[#314936]"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="text-sm font-medium text-[#263a2b]"
            >
              Password
            </label>

            <div className="relative mt-2">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-[#c9c4b7] bg-[#f8f5ed] px-4 py-3 pr-12 outline-none focus:border-[#314936]"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#687565] hover:text-[#314936]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>

            {mode === "login" && (
              <div className="mt-2 text-right">
                {resetSent ? (
                  <p className="text-xs text-[#687565]">
                    Reset email sent. Check your inbox.
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={loading}
                    className="text-xs font-medium text-[#687565] hover:text-[#314936] disabled:opacity-50"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
            )}

            {mode === "signup" && (
              <p className="mt-2 text-xs text-[#687565]">
                Password must be at least 8 characters and contain at least one number.
              </p>
            )}
          </div>

          {mode === "signup" && (
            <div>
              <label
                htmlFor="confirm-password"
                className="text-sm font-medium text-[#263a2b]"
              >
                Confirm Password
              </label>

              <div className="relative mt-2">
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  className="w-full rounded-xl border border-[#c9c4b7] bg-[#f8f5ed] px-4 py-3 pr-12 outline-none focus:border-[#314936]"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#687565] hover:text-[#314936]"
                  aria-label={
                    showConfirmPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>
          )}

          {message && (
            <div className="rounded-xl border border-[#d8d2c4] bg-[#ebe6da] p-4 text-sm text-[#526052]">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#314936] px-5 py-3 font-medium text-white transition hover:bg-[#263a2b] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Please wait..."
              : mode === "login"
                ? "Log in"
                : "Create account"}
          </button>
        </form>
      )}

      {!isResettingPassword && (
        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login")
            setMessage("")
            setConfirmPassword("")
          }}
          className="mt-6 text-sm font-medium text-[#687565] hover:text-[#314936]"
        >
          {mode === "login"
            ? "Don't have an account? Create one"
            : "Already have an account? Log in"}
        </button>)}
      </div>
    </div>
  )
}

export default Auth
