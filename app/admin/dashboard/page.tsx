"use client"

import { useState, useEffect, useMemo } from "react"
import axios from "axios"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts"
import { useToast } from "@/components/ui/use-toast"
import {
  Users,
  ImageIcon,
  Flag,
  CloudCog,
  TrendingUp,
  BarChart3,
  RefreshCcw,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  PieChartIcon,
  Activity,
  Calendar,
  Hash,
  Heart,
  MessageSquare,
  Share2,
  Download,
} from "lucide-react"

// Define types for our data
interface AdminStats {
  users: {
    total: number
    lastWeek: number
    growth: number
    history: { date: string; count: number }[]
  }
  posts: {
    total: number
    lastWeek: number
    growth: number
    flagged: number
    history: { date: string; count: number }[]
    byCategory?: { [key: string]: number }
  }
  engagement: {
    comments: number
    likes: number
    shares: number
    history?: { date: string; comments: number; likes: number; shares: number }[]
  }
  storage: {
    used: number
    limit: number
    percentage: number
    history?: { date: string; used: number }[]
  }
  topHashtags?: { tag: string; count: number }[]
  activeUsers?: { date: string; count: number }[]
  postsByTime?: { hour: number; count: number }[]
}

interface CloudinaryStats {
  usage: {
    storage: {
      used: number
      limit: number
    }
  }
}

// Color constants
const COLORS = {
  users: "#9333ea", // purple
  posts: "#3b82f6", // blue
  comments: "#10b981", // green
  likes: "#ec4899", // pink
  shares: "#f59e0b", // amber
  storage: "#06b6d4", // cyan
  categories: [
    "#3b82f6", // blue
    "#ef4444", // red
    "#10b981", // green
    "#f59e0b", // amber
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#6366f1", // indigo
    "#64748b", // slate
  ],
  pieChart: ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#6366f1", "#64748b"],
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [cloudinaryStats, setCloudinaryStats] = useState<CloudinaryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [timeRange, setTimeRange] = useState("7d")
  const { toast } = useToast()

  // Fetch both stats and Cloudinary stats
  const fetchAllStats = async () => {
    try {
      setRefreshing(true)

      // Fetch admin stats
      const statsResponse = await axios.get("/api/admin/stats")

      // Fetch Cloudinary stats
      const cloudinaryResponse = await axios.get("/api/admin/cloudinary/stats")

      // Process the admin stats data
      const statsData = statsResponse.data.data || {
        users: {
          total: 0,
          lastWeek: 0,
          growth: 0,
          history: generateMockHistoryData(7, 0, 20),
        },
        posts: {
          total: 0,
          lastWeek: 0,
          growth: 0,
          flagged: 0,
          history: generateMockHistoryData(7, 0, 10),
          byCategory: {
            entertainment: 0,
            sports: 0,
            gaming: 0,
            technology: 0,
            fashion: 0,
            music: 0,
            tv: 0,
            other: 0,
          },
        },
        engagement: {
          comments: 0,
          likes: 0,
          shares: 0,
          history: generateMockEngagementHistory(7),
        },
        storage: {
          used: 0,
          limit: 1000,
          percentage: 0,
          history: generateMockStorageHistory(7),
        },
      }

      // If we have real Cloudinary data, use it for storage stats
      if (cloudinaryResponse.data.success && cloudinaryResponse.data.data.usage) {
        const cloudinaryData = cloudinaryResponse.data.data

        // Update storage stats with real Cloudinary data
        statsData.storage = {
          used: cloudinaryData.usage.storage.used || 0,
          limit: cloudinaryData.usage.storage.limit || 1000000000,
          percentage: cloudinaryData.usage.storage.used
            ? (cloudinaryData.usage.storage.used / cloudinaryData.usage.storage.limit) * 100
            : 0,
          history: statsData.storage.history || generateMockStorageHistory(7),
        }

        setCloudinaryStats(cloudinaryData)
      }

      // Add mock data for additional analytics if not provided by API
      if (!statsData.topHashtags) {
        statsData.topHashtags = [
          { tag: "funny", count: 42 },
          { tag: "meme", count: 38 },
          { tag: "lol", count: 27 },
          { tag: "humor", count: 21 },
          { tag: "trending", count: 18 },
        ]
      }

      if (!statsData.activeUsers) {
        statsData.activeUsers = generateMockActiveUsers(7)
      }

      if (!statsData.postsByTime) {
        statsData.postsByTime = generateMockPostsByTime()
      }

      if (!statsData.posts.byCategory) {
        statsData.posts.byCategory = {
          entertainment: 15,
          sports: 8,
          gaming: 12,
          technology: 10,
          fashion: 5,
          music: 7,
          tv: 6,
          other: 10,
        }
      }

      setStats(statsData)
      setError("")
    } catch (error) {
      console.error("Error fetching stats:", error)
      setError("Failed to load dashboard statistics")
      toast({
        title: "Error",
        description: "Failed to load dashboard statistics",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAllStats()
  }, [])

  // Generate mock history data if API doesn't provide it
  function generateMockHistoryData(days: number, min: number, max: number) {
    return Array.from({ length: days }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (days - 1 - i))
      return {
        date: date.toISOString().split("T")[0],
        count: Math.floor(Math.random() * (max - min + 1)) + min,
      }
    })
  }

  // Generate mock engagement history
  function generateMockEngagementHistory(days: number) {
    return Array.from({ length: days }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (days - 1 - i))
      return {
        date: date.toISOString().split("T")[0],
        comments: Math.floor(Math.random() * 30),
        likes: Math.floor(Math.random() * 100),
        shares: Math.floor(Math.random() * 20),
      }
    })
  }

  // Generate mock storage history
  function generateMockStorageHistory(days: number) {
    let currentStorage = 0
    return Array.from({ length: days }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (days - 1 - i))
      currentStorage += Math.floor(Math.random() * 5000000) // Add random bytes each day
      return {
        date: date.toISOString().split("T")[0],
        used: currentStorage,
      }
    })
  }

  // Generate mock active users data
  function generateMockActiveUsers(days: number) {
    return Array.from({ length: days }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (days - 1 - i))
      return {
        date: date.toISOString().split("T")[0],
        count: Math.floor(Math.random() * 15) + 5,
      }
    })
  }

  // Generate mock posts by time of day
  function generateMockPostsByTime() {
    return Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: Math.floor(Math.random() * 10),
    }))
  }

  // Format bytes to human-readable format
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes"

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"]

    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  // Format hour for display
  const formatHour = (hour: number) => {
    return hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`
  }

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!stats) return []

    // Combine user and post history data
    const combinedData: any[] = []

    if (stats.users.history && stats.posts.history) {
      // Get the maximum length of the two arrays
      const maxLength = Math.max(stats.users.history.length, stats.posts.history.length)

      for (let i = 0; i < maxLength; i++) {
        const userEntry = stats.users.history[i] || { date: "", count: 0 }
        const postEntry = stats.posts.history[i] || { date: "", count: 0 }

        // Use the date from whichever entry exists
        const date = userEntry.date || postEntry.date

        combinedData.push({
          date: formatDate(date),
          users: userEntry.count || 0,
          posts: postEntry.count || 0,
        })
      }
    }

    return combinedData
  }, [stats])

  // Prepare engagement chart data
  const engagementChartData = useMemo(() => {
    if (!stats?.engagement?.history) return []

    return stats.engagement.history.map((entry) => ({
      date: formatDate(entry.date),
      comments: entry.comments,
      likes: entry.likes,
      shares: entry.shares,
    }))
  }, [stats])

  // Prepare storage chart data
  const storageChartData = useMemo(() => {
    if (!stats?.storage?.history) return []

    return stats.storage.history.map((entry) => ({
      date: formatDate(entry.date),
      used: entry.used / (1024 * 1024), // Convert to MB
    }))
  }, [stats])

  // Prepare category data for pie chart
  const categoryData = useMemo(() => {
    if (!stats?.posts?.byCategory) return []

    return Object.entries(stats.posts.byCategory).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }))
  }, [stats])

  // Prepare posts by time data
  const postsByTimeData = useMemo(() => {
    if (!stats?.postsByTime) return []

    return stats.postsByTime.map((entry) => ({
      hour: formatHour(entry.hour),
      count: entry.count,
    }))
  }, [stats])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">Overview of your platform's performance and content.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-800 rounded-md dark:bg-red-900/30 dark:text-red-200">
        <h2 className="text-lg font-semibold">Error Loading Dashboard</h2>
        <p className="mt-2">{error}</p>
        <Button variant="outline" className="mt-4 bg-white dark:bg-gray-800" onClick={fetchAllStats}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">Overview of your platform's performance and content.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAllStats}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            <span>{refreshing ? "Refreshing..." : "Refresh Data"}</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats?.users?.total.toLocaleString() || 0}</div>
            <div className="flex items-center mt-1">
              {stats?.users?.growth && stats.users.growth > 0 ? (
                <Badge
                  variant="outline"
                  className="text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                >
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  {stats.users.growth}% growth
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                >
                  <ArrowDownRight className="h-3 w-3 mr-1" />
                  {Math.abs(stats?.users?.growth || 0)}% decline
                </Badge>
              )}
              <span className="text-xs text-muted-foreground ml-2">+{stats?.users?.lastWeek || 0} this week</span>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <ImageIcon className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats?.posts?.total.toLocaleString() || 0}</div>
            <div className="flex items-center mt-1">
              {stats?.posts?.growth && stats.posts.growth > 0 ? (
                <Badge
                  variant="outline"
                  className="text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                >
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  {stats.posts.growth}% growth
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                >
                  <ArrowDownRight className="h-3 w-3 mr-1" />
                  {Math.abs(stats?.posts?.growth || 0)}% decline
                </Badge>
              )}
              <span className="text-xs text-muted-foreground ml-2">+{stats?.posts?.lastWeek || 0} this week</span>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20">
            <CardTitle className="text-sm font-medium">Flagged Content</CardTitle>
            <Flag className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats?.posts?.flagged || 0}</div>
            <div className="flex items-center mt-1">
              <Badge
                variant={stats?.posts?.flagged > 0 ? "outline" : "secondary"}
                className={
                  stats?.posts?.flagged > 0
                    ? "text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                    : ""
                }
              >
                {stats?.posts?.flagged > 0 ? "Needs attention" : "All clear"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-800/20">
            <CardTitle className="text-sm font-medium">Storage Usage</CardTitle>
            <CloudCog className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{formatBytes(stats?.storage?.used || 0)}</div>
            <div className="mt-2">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{stats?.storage?.percentage.toFixed(1) || 0}% used</span>
                <span>{formatBytes(stats?.storage?.limit || 0)} limit</span>
              </div>
              <Progress
                value={stats?.storage?.percentage || 0}
                className="h-2"
                indicatorClassName={
                  (stats?.storage?.percentage || 0) > 80
                    ? "bg-red-500"
                    : (stats?.storage?.percentage || 0) > 60
                      ? "bg-amber-500"
                      : "bg-cyan-500"
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Platform Growth</CardTitle>
                <CardDescription>User and content growth over time</CardDescription>
              </div>
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last {timeRange === "7d" ? "7" : timeRange === "30d" ? "30" : "90"} days
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="line">
              <TabsList className="mb-4">
                <TabsTrigger value="line" className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  Line
                </TabsTrigger>
                <TabsTrigger value="bar" className="flex items-center gap-1">
                  <BarChart3 className="h-4 w-4" />
                  Bar
                </TabsTrigger>
              </TabsList>
              <TabsContent value="line">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="users" stroke={COLORS.users} activeDot={{ r: 8 }} name="Users" />
                      <Line type="monotone" dataKey="posts" stroke={COLORS.posts} name="Posts" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
              <TabsContent value="bar">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="users" fill={COLORS.users} name="Users" />
                      <Bar dataKey="posts" fill={COLORS.posts} name="Posts" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Engagement Overview</CardTitle>
            <CardDescription>User interaction metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium flex items-center gap-1">
                  <MessageSquare className="h-4 w-4 text-green-500" />
                  Comments
                </div>
                <div className="text-sm text-muted-foreground">{stats?.engagement?.comments.toLocaleString() || 0}</div>
              </div>
              <Progress
                value={
                  stats?.engagement?.comments && stats.posts.total
                    ? Math.min(100, (stats.engagement.comments / stats.posts.total) * 100)
                    : 0
                }
                className="h-2"
                indicatorClassName="bg-green-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium flex items-center gap-1">
                  <Heart className="h-4 w-4 text-pink-500" />
                  Likes
                </div>
                <div className="text-sm text-muted-foreground">{stats?.engagement?.likes.toLocaleString() || 0}</div>
              </div>
              <Progress
                value={
                  stats?.engagement?.likes && stats.posts.total
                    ? Math.min(100, (stats.engagement.likes / stats.posts.total) * 100)
                    : 0
                }
                className="h-2"
                indicatorClassName="bg-pink-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium flex items-center gap-1">
                  <Share2 className="h-4 w-4 text-amber-500" />
                  Shares
                </div>
                <div className="text-sm text-muted-foreground">{stats?.engagement?.shares.toLocaleString() || 0}</div>
              </div>
              <Progress
                value={
                  stats?.engagement?.shares && stats.posts.total
                    ? Math.min(100, (stats.engagement.shares / stats.posts.total) * 100)
                    : 0
                }
                className="h-2"
                indicatorClassName="bg-amber-500"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" asChild>
              <a href="/admin/posts">View Content Analytics</a>
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Additional Analytics Section */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-blue-500" />
              Content Categories
            </CardTitle>
            <CardDescription>Distribution of posts by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS.pieChart[index % COLORS.pieChart.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, "Posts"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5 text-purple-500" />
              Top Hashtags
            </CardTitle>
            <CardDescription>Most popular hashtags in posts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats?.topHashtags || []}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="tag" type="category" tick={{ fontSize: 14 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="count" fill={COLORS.users} name="Posts" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              Engagement Trends
            </CardTitle>
            <CardDescription>Comments, likes, and shares over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={engagementChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="comments" stroke={COLORS.comments} name="Comments" />
                  <Line type="monotone" dataKey="likes" stroke={COLORS.likes} name="Likes" />
                  <Line type="monotone" dataKey="shares" stroke={COLORS.shares} name="Shares" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-cyan-500" />
              Post Activity by Time
            </CardTitle>
            <CardDescription>When users are most active posting content</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={postsByTimeData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill={COLORS.posts} name="Posts" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudCog className="h-5 w-5 text-cyan-500" />
            Storage Usage Trends
          </CardTitle>
          <CardDescription>Storage consumption over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={storageChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis label={{ value: "MB", angle: -90, position: "insideLeft" }} />
                <Tooltip formatter={(value) => [`${value.toFixed(2)} MB`, "Storage Used"]} />
                <Area
                  type="monotone"
                  dataKey="used"
                  stroke={COLORS.storage}
                  fill={COLORS.storage}
                  fillOpacity={0.3}
                  name="Storage Used"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            Current usage: {formatBytes(stats?.storage?.used || 0)} of {formatBytes(stats?.storage?.limit || 0)}
          </div>
          <Button variant="outline" size="sm" className="flex items-center gap-2" asChild>
            <a href="/admin/download">
              <Download className="h-4 w-4" />
              Export Data
            </a>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
