"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card"
import { useAuth } from "@/components/auth-provider"
import { LaughIcon, AlertCircle, Info } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import axios from "axios"

export function LoginForm() {
  const router = useRouter()
  const { login, signup } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [accountSuspended, setAccountSuspended] = useState(false)
  const [suspendedUsername, setSuspendedUsername] = useState("")
  const [showAppealDialog, setShowAppealDialog] = useState(false)
  const [appealText, setAppealText] = useState("")
  const [appealSubmitting, setAppealSubmitting] = useState(false)
  const [hasExistingAppeal, setHasExistingAppeal] = useState(false)

  // Login form state
  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  })

  // Update the signup form state
  const [signupData, setSignupData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  })

  // Form errors
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Add this function to validate and format the username
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value

    // Convert to lowercase
    const lowercaseValue = value.toLowerCase()

    // Remove any characters that aren't lowercase letters, numbers, or underscores
    const validValue = lowercaseValue.replace(/[^a-z0-9_]/g, "")

    // Update the form state with the valid value
    setSignupData({ ...signupData, username: validValue })

    // Show error if the original input had invalid characters
    if (value !== validValue) {
      setErrors({
        ...errors,
        username: "Username can only contain lowercase letters, numbers, and underscores (_)",
      })
    } else {
      // Clear the error if input is valid
      const { username, ...remainingErrors } = errors
      setErrors(remainingErrors)
    }
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Reset suspended state in case of repeated login attempts
      setAccountSuspended(false)
      setHasExistingAppeal(false)

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: loginData.username,
          password: loginData.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Check specifically for suspension message
        if (response.status === 403 && data.message && data.message.includes("suspended")) {
          setAccountSuspended(true)
          setSuspendedUsername(loginData.username)

          // Check if user already has a pending appeal
          try {
            const appealCheckResponse = await axios.get(`/api/appeals/check/${loginData.username}`)
            if (appealCheckResponse.data.hasAppeal) {
              setHasExistingAppeal(true)
            }
          } catch (error) {
            console.error("Error checking for existing appeals:", error)
          }

          // Clear password for security
          setLoginData({ ...loginData, password: "" })
          setIsLoading(false)
          return
        }

        throw new Error(data.message || "Login failed")
      }

      // If we get here, login was successful
      if (data.success) {
        // Use the login function from auth context to set the user state
        await login(loginData.username, loginData.password)
        router.push("/feed")
      }
    } catch (error: any) {
      console.error("Login error:", error)
      setErrors({ login: error.message || "An error occurred during login" })
    } finally {
      setIsLoading(false)
    }
  }

  // Update the handleSignupSubmit function to include additional validation
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Validate username format
    if (!/^[a-z0-9_]+$/.test(signupData.username)) {
      setErrors({ username: "Username can only contain lowercase letters, numbers, and underscores (_)" })
      setIsLoading(false)
      return
    }

    // Validate passwords match
    if (signupData.password !== signupData.confirmPassword) {
      setErrors({ confirmPassword: "Passwords do not match" })
      setIsLoading(false)
      return
    }

    try {
      const success = await signup(signupData.username, signupData.email, signupData.password)
      if (success) {
        router.push("/feed")
      } else {
        setErrors({ signup: "Error creating account" })
      }
    } catch (error) {
      setErrors({ signup: "An error occurred during signup" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAppealSubmit = async () => {
    if (!appealText.trim()) {
      toast({
        title: "Appeal text required",
        description: "Please explain why your account should be unbanned.",
        variant: "destructive",
      })
      return
    }

    setAppealSubmitting(true)
    try {
      const response = await axios.post("/api/appeals/submit", {
        username: suspendedUsername,
        appealText,
      })

      if (response.data.success) {
        toast({
          title: "Appeal submitted",
          description: "Your appeal has been submitted for review. We'll get back to you soon.",
        })
        setShowAppealDialog(false)
        setHasExistingAppeal(true)
        // Reset appeal text for next time
        setAppealText("")
      }
    } catch (error: any) {
      if (error.response?.status === 400 && error.response?.data?.message?.includes("already have a pending appeal")) {
        setHasExistingAppeal(true)
        setShowAppealDialog(false)
        toast({
          title: "Appeal already exists",
          description: "You already have a pending appeal. Please wait for it to be reviewed.",
        })
      } else {
        toast({
          title: "Error submitting appeal",
          description: error.response?.data?.message || "Failed to submit your appeal. Please try again later.",
          variant: "destructive",
        })
      }
    } finally {
      setAppealSubmitting(false)
    }
  }

  return (
    <>
      <Card className="w-full max-w-md shadow-lg animate-fade-in">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center">
            <div className="flex items-center gap-2 text-2xl font-bold">
              <LaughIcon className="h-8 w-8 text-primary" />
              ChuckleChain
            </div>
          </div>
          <CardDescription>Share memes, spread laughter</CardDescription>
        </CardHeader>
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            {accountSuspended ? (
              <CardContent className="space-y-4 pt-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-md dark:bg-red-900/20 dark:border-red-800/50">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <div className="space-y-2">
                      <h3 className="font-medium text-red-800 dark:text-red-300">Account Suspended</h3>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        Your account has been suspended by the platform administrators.
                      </p>

                      {hasExistingAppeal ? (
                        <Alert className="mt-3 bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800/50 dark:text-amber-300">
                          <Info className="h-4 w-4" />
                          <AlertTitle>Appeal Already Submitted</AlertTitle>
                          <AlertDescription>
                            You already have a pending appeal. Our team will review it as soon as possible.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700"
                          onClick={() => setShowAppealDialog(true)}
                        >
                          Appeal This Decision
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => {
                    setAccountSuspended(false)
                    setLoginData({ username: "", password: "" })
                  }}
                >
                  Back to Login
                </Button>
              </CardContent>
            ) : (
              <form onSubmit={handleLoginSubmit}>
                <CardContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      placeholder="Enter your username"
                      value={loginData.username}
                      onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                      required
                      className="transition-all duration-300 focus:scale-102"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <Link href="#" className="text-xs text-primary hover:underline">
                        Forgot password?
                      </Link>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required
                      className="transition-all duration-300 focus:scale-102"
                    />
                  </div>
                  {errors.login && <p className="text-sm text-destructive">{errors.login}</p>}
                </CardContent>
                <CardFooter>
                  <Button
                    type="submit"
                    className="w-full transition-all duration-300 hover:scale-105"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent mr-2"></div>
                    ) : null}
                    {isLoading ? "Logging in..." : "Login"}
                  </Button>
                </CardFooter>
              </form>
            )}
          </TabsContent>
          <TabsContent value="signup">
            <form onSubmit={handleSignupSubmit}>
              <CardContent className="space-y-4 pt-4">
                {/* Update the username input in the signup form */}
                <div className="space-y-2">
                  <Label htmlFor="signup-username">Username</Label>
                  <Input
                    id="signup-username"
                    placeholder="Choose a username"
                    value={signupData.username}
                    onChange={handleUsernameChange}
                    required
                    className={`transition-all duration-300 focus:scale-102 ${errors.username ? "border-destructive" : ""}`}
                  />
                  {errors.username && <p className="text-sm text-destructive">{errors.username}</p>}
                  <p className="text-xs text-muted-foreground">Lowercase letters, numbers, and underscores only</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={signupData.email}
                    onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                    required
                    className="transition-all duration-300 focus:scale-102"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Create a password"
                    value={signupData.password}
                    onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                    required
                    className="transition-all duration-300 focus:scale-102"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm your password"
                    value={signupData.confirmPassword}
                    onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                    required
                    className="transition-all duration-300 focus:scale-102"
                  />
                  {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                </div>
                {errors.signup && <p className="text-sm text-destructive">{errors.signup}</p>}
              </CardContent>
              <CardFooter>
                <Button
                  type="submit"
                  className="w-full transition-all duration-300 hover:scale-105"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent mr-2"></div>
                  ) : null}
                  {isLoading ? "Creating Account..." : "Create Account"}
                </Button>
              </CardFooter>
            </form>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Suspension Appeal Dialog */}
      <Dialog open={showAppealDialog} onOpenChange={setShowAppealDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Appeal Account Suspension</DialogTitle>
            <DialogDescription>
              Please explain why you believe your account suspension should be reconsidered. Be specific and provide
              relevant details that may help in our review.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="username-display" className="text-sm">
                Username
              </Label>
              <Input id="username-display" value={suspendedUsername} disabled />
            </div>

            <div className="space-y-2 mt-4">
              <Label htmlFor="appeal-reason" className="text-sm">
                Reason for Appeal <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="appeal-reason"
                placeholder="Please explain why you believe your account should be restored..."
                value={appealText}
                onChange={(e) => setAppealText(e.target.value)}
                className="min-h-[150px] resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Your appeal will be reviewed by our moderators. This process typically takes 1-3 business days.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAppealDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAppealSubmit}
              disabled={appealSubmitting || !appealText.trim()}
              className="bg-primary"
            >
              {appealSubmitting ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>
                  Submitting...
                </>
              ) : (
                "Submit Appeal"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
