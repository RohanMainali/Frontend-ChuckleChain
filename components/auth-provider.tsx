"use client"

import type React from "react"

import { createContext, useContext, useState, useEffect } from "react"
import type { User } from "@/lib/types"
import axios from "axios"
import { useToast } from "@/components/ui/use-toast"
// Use the deployed API URL
axios.defaults.baseURL = "https://chucklechain-api.onrender.com"
// Ensure credentials are sent with all requests
axios.defaults.withCredentials = true

type AuthContextType = {
  user: User | null
  login: (username: string, password: string) => Promise<boolean>
  signup: (username: string, email: string, password: string) => Promise<boolean>
  adminSignup: (username: string, email: string, password: string, adminToken: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
  updateUser: (updates: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  // Set up axios interceptor to include token in all requests
  useEffect(() => {
    const token = localStorage.getItem("adminToken")
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`
    }

    // Add response interceptor to handle 401/403 errors
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          // If we get a 401/403 and we're in the admin section, try to refresh the token
          if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
            console.log("Auth error in admin section, checking authentication...")
            // We could implement a token refresh here if needed
          }
        }
        return Promise.reject(error)
      },
    )

    return () => {
      // Clean up interceptor when component unmounts
      axios.interceptors.response.eject(interceptor)
    }
  }, [])

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = async () => {
      // Only run on client side
      if (typeof window === "undefined") {
        setIsLoading(false)
        return
      }

      try {
        // First check if we have a token in localStorage
        const token = localStorage.getItem("adminToken")
        if (token) {
          axios.defaults.headers.common["Authorization"] = `Bearer ${token}`
        }

        const { data } = await axios.get("/api/auth/me")
        if (data.success) {
          setUser({
            id: data.data._id,
            username: data.data.username,
            profilePicture: data.data.profilePicture,
            email: data.data.email,
            bio: data.data.bio,
            role: data.data.role,
          })
        }
      } catch (error) {
        console.error("Authentication error:", error)
        setUser(null)
        // Clear token if authentication fails
        localStorage.removeItem("adminToken")
        delete axios.defaults.headers.common["Authorization"]
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (username: string, password: string) => {
    setIsLoading(true)
    try {
      const { data } = await axios.post("/api/auth/login", {
        username,
        password,
      })

      if (data.success) {
        // Store token in localStorage
        if (data.token) {
          localStorage.setItem("adminToken", data.token)
          axios.defaults.headers.common["Authorization"] = `Bearer ${data.token}`
        }

        setUser({
          id: data.data._id,
          username: data.data.username,
          profilePicture: data.data.profilePicture,
          email: data.data.email,
          bio: data.data.bio,
          role: data.data.role,
        })
        return true
      }
      return false
    } catch (error) {
      console.error("Login error:", error)

      // Check if the error is due to account suspension
      if (error.response && error.response.data && error.response.data.status === "suspended") {
        toast({
          title: "Account Suspended",
          description: "Your account has been suspended. Please contact support for assistance.",
          variant: "destructive",
        })
      }

      return false
    } finally {
      setIsLoading(false)
    }
  }

  const signup = async (username: string, email: string, password: string) => {
    setIsLoading(true)
    try {
      const { data } = await axios.post("/api/auth/signup", {
        username,
        email,
        password,
      })

      if (data.success) {
        // Store token in localStorage
        if (data.token) {
          localStorage.setItem("adminToken", data.token)
          axios.defaults.headers.common["Authorization"] = `Bearer ${data.token}`
        }

        setUser({
          id: data.data._id,
          username: data.data.username,
          profilePicture: data.data.profilePicture,
          email: data.data.email,
          bio: data.data.bio,
          role: data.data.role,
        })
        return true
      }
      return false
    } catch (error) {
      console.error("Signup error:", error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const adminSignup = async (username: string, email: string, password: string, adminToken: string) => {
    setIsLoading(true)
    try {
      const { data } = await axios.post("/api/auth/admin-signup", {
        username,
        email,
        password,
        adminToken,
      })

      if (data.success) {
        // Store token in localStorage
        if (data.token) {
          localStorage.setItem("adminToken", data.token)
          axios.defaults.headers.common["Authorization"] = `Bearer ${data.token}`
        }

        setUser({
          id: data.data._id,
          username: data.data.username,
          profilePicture: data.data.profilePicture,
          email: data.data.email,
          bio: data.data.bio,
          role: data.data.role,
        })
        return true
      }
      return false
    } catch (error) {
      console.error("Admin signup error:", error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      await axios.get("/api/auth/logout")
      setUser(null)
      // Clear token from localStorage
      localStorage.removeItem("adminToken")
      delete axios.defaults.headers.common["Authorization"]
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  const updateUser = async (updates: Partial<User>) => {
    if (user) {
      try {
        const { data } = await axios.put("/api/users/me", updates)
        if (data.success) {
          setUser({
            ...user,
            ...updates,
          })
        }
      } catch (error) {
        console.error("Update user error:", error)
      }
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, signup, adminSignup, logout, isLoading, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
