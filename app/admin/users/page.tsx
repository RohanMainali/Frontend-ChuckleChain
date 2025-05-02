"use client"

import { useState, useEffect, useMemo } from "react"
import axios from "axios"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  RefreshCcw,
  Filter,
  UserPlus,
  MessageSquare,
  Ban,
  CheckCircle,
  AlertCircle,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"

interface AdminUser {
  id: string
  username: string
  email: string
  profilePicture: string
  role: string
  createdAt: string
  lastActive: string
  postCount: number
  followerCount: number
  status: "active" | "suspended"
  suspensionReason?: string
  suspendedAt?: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false)
  const [suspensionReason, setSuspensionReason] = useState("")
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false)
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortField, setSortField] = useState<string>("username")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)
  const [filterOptions, setFilterOptions] = useState({
    minPosts: "",
    maxPosts: "",
    minFollowers: "",
    maxFollowers: "",
    joinedAfter: "",
    joinedBefore: "",
  })
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    role: "user",
    adminToken: "",
  })
  const [viewSuspensionDetailsOpen, setViewSuspensionDetailsOpen] = useState(false)
  const [pendingAppealsCount, setPendingAppealsCount] = useState(0)
  const { toast } = useToast()
  const router = useRouter()

  const fetchUsers = async () => {
    try {
      setRefreshing(true)
      const { data } = await axios.get("/api/admin/users")

      // Add a status field if it doesn't exist
      const processedUsers = (data.data || []).map((user: AdminUser) => ({
        ...user,
        status: user.status || "active",
      }))

      setUsers(processedUsers)
      setFilteredUsers(processedUsers)
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load users")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchPendingAppealsCount = async () => {
    try {
      const { data } = await axios.get("/api/appeals/count")
      if (data && data.success) {
        setPendingAppealsCount(data.data.pending)
      }
    } catch (err) {
      console.error("Failed to fetch pending appeals count:", err)
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchPendingAppealsCount()
  }, [])

  // Apply filters and sorting
  useEffect(() => {
    let result = [...users]

    // Apply search filter
    if (searchQuery) {
      const lowercaseQuery = searchQuery.toLowerCase()
      result = result.filter(
        (user) =>
          user.username.toLowerCase().includes(lowercaseQuery) || user.email.toLowerCase().includes(lowercaseQuery),
      )
    }

    // Apply role filter
    if (roleFilter !== "all") {
      result = result.filter((user) => user.role === roleFilter)
    }

    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter((user) => user.status === statusFilter)
    }

    // Apply advanced filters
    if (filterOptions.minPosts && !isNaN(Number(filterOptions.minPosts))) {
      result = result.filter((user) => user.postCount >= Number(filterOptions.minPosts))
    }

    if (filterOptions.maxPosts && !isNaN(Number(filterOptions.maxPosts))) {
      result = result.filter((user) => user.postCount <= Number(filterOptions.maxPosts))
    }

    if (filterOptions.minFollowers && !isNaN(Number(filterOptions.minFollowers))) {
      result = result.filter((user) => user.followerCount >= Number(filterOptions.minFollowers))
    }

    if (filterOptions.maxFollowers && !isNaN(Number(filterOptions.maxFollowers))) {
      result = result.filter((user) => user.followerCount <= Number(filterOptions.maxFollowers))
    }

    if (filterOptions.joinedAfter) {
      const afterDate = new Date(filterOptions.joinedAfter)
      result = result.filter((user) => new Date(user.createdAt) >= afterDate)
    }

    if (filterOptions.joinedBefore) {
      const beforeDate = new Date(filterOptions.joinedBefore)
      result = result.filter((user) => new Date(user.createdAt) <= beforeDate)
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case "username":
          comparison = a.username.localeCompare(b.username)
          break
        case "email":
          comparison = a.email.localeCompare(b.email)
          break
        case "role":
          comparison = a.role.localeCompare(b.role)
          break
        case "createdAt":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case "postCount":
          comparison = a.postCount - b.postCount
          break
        case "followerCount":
          comparison = a.followerCount - b.followerCount
          break
        default:
          comparison = 0
      }

      return sortDirection === "asc" ? comparison : -comparison
    })

    setFilteredUsers(result)
  }, [searchQuery, users, roleFilter, statusFilter, sortField, sortDirection, filterOptions])

  const handleStatusChange = async (userId: string, newStatus: "active" | "suspended") => {
    try {
      setRefreshing(true)

      // If suspending, we need a reason
      if (newStatus === "suspended" && !suspensionReason.trim()) {
        toast({
          title: "Suspension reason required",
          description: "Please provide a reason for suspending this user.",
          variant: "destructive",
        })
        setRefreshing(false)
        return
      }

      // Create the payload based on the action
      const payload = newStatus === "suspended" ? { status: newStatus, suspensionReason } : { status: newStatus }

      await axios.put(`/api/admin/users/${userId}/status`, payload)

      // Update local state
      setUsers(
        users.map((user) => {
          if (user.id === userId) {
            return {
              ...user,
              status: newStatus,
              suspensionReason: newStatus === "suspended" ? suspensionReason : "",
              suspendedAt: newStatus === "suspended" ? new Date().toISOString() : null,
            }
          }
          return user
        }),
      )

      toast({
        title: `User ${newStatus === "active" ? "activated" : "suspended"}`,
        description: `User has been ${newStatus === "active" ? "activated" : "suspended"} successfully.`,
      })

      // Reset suspension reason
      setSuspensionReason("")
    } catch (err: any) {
      console.error("Error updating user status:", err)
      toast({
        title: "Error",
        description: err.response?.data?.message || `Failed to ${newStatus} user`,
        variant: "destructive",
      })
    } finally {
      setRefreshing(false)
      setSuspendDialogOpen(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    try {
      await axios.delete(`/api/admin/users/${userId}`)

      // Update local state
      setUsers(users.filter((user) => user.id !== userId))
      setDeleteDialogOpen(false)
      setSelectedUser(null)

      toast({
        title: "User deleted",
        description: "The user has been permanently deleted",
      })
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to delete user",
        variant: "destructive",
      })
    }
  }

  const handleAddUser = async () => {
    try {
      if (!newUser.username || !newUser.email || !newUser.password) {
        toast({
          title: "Missing information",
          description: "Please fill in all required fields",
          variant: "destructive",
        })
        return
      }

      if (newUser.role === "admin" && !newUser.adminToken) {
        toast({
          title: "Admin token required",
          description: "Please provide an admin registration token",
          variant: "destructive",
        })
        return
      }

      // Save the current admin token before making the request
      const currentAdminToken = localStorage.getItem("adminToken")

      const endpoint = newUser.role === "admin" ? "/api/auth/admin-signup" : "/api/auth/signup"
      const payload =
        newUser.role === "admin"
          ? {
              username: newUser.username,
              email: newUser.email,
              password: newUser.password,
              adminToken: newUser.adminToken,
              preventLogin: true, // Add this flag to prevent automatic login
            }
          : {
              username: newUser.username,
              email: newUser.email,
              password: newUser.password,
              preventLogin: true, // Add this flag to prevent automatic login
            }

      const response = await axios.post(endpoint, payload)

      // Restore the admin token after the request
      if (currentAdminToken) {
        localStorage.setItem("adminToken", currentAdminToken)
        axios.defaults.headers.common["Authorization"] = `Bearer ${currentAdminToken}`
      }

      // Check if the response contains the expected data
      if (response.data && response.data.success) {
        toast({
          title: "User created",
          description: `User ${newUser.username} has been created successfully`,
        })

        // Reset form and close dialog
        setNewUser({
          username: "",
          email: "",
          password: "",
          role: "user",
          adminToken: "",
        })
        setAddUserDialogOpen(false)

        // Refresh user list
        fetchUsers()
      } else {
        // Handle unexpected response format
        toast({
          title: "Warning",
          description: "User may have been created but the response was unexpected",
        })
        setAddUserDialogOpen(false)
      }
    } catch (err: any) {
      toast({
        title: "Error creating user",
        description: err.response?.data?.message || "Failed to create user",
        variant: "destructive",
      })
    }
  }

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const getSortIcon = (field: string) => {
    if (sortField !== field) return null
    return sortDirection === "asc" ? (
      <svg className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    )
  }

  const resetFilters = () => {
    setFilterOptions({
      minPosts: "",
      maxPosts: "",
      minFollowers: "",
      maxFollowers: "",
      joinedAfter: "",
      joinedBefore: "",
    })
    setRoleFilter("all")
    setStatusFilter("all")
    setSearchQuery("")
  }

  const userStats = useMemo(() => {
    return {
      total: users.length,
      admins: users.filter((user) => user.role === "admin").length,
      active: users.filter((user) => user.status === "active").length,
      suspended: users.filter((user) => user.status === "suspended").length,
    }
  }, [users])

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-500 hover:bg-emerald-600">Active</Badge>
      case "suspended":
        return <Badge variant="destructive">Suspended</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">View and manage user accounts</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center mb-4">
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="rounded-md border">
              <div className="p-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4 py-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-800 rounded-md dark:bg-red-900/30 dark:text-red-200">
        <h2 className="text-lg font-semibold">Error Loading Users</h2>
        <p className="mt-2">{error}</p>
        <Button variant="outline" className="mt-4 bg-white dark:bg-gray-800" onClick={fetchUsers}>
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
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">View and manage user accounts</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUsers}
            disabled={refreshing}
            className="transition-all duration-200 hover:bg-muted"
          >
            <RefreshCcw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setAddUserDialogOpen(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card className="md:col-span-1 bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle>User Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Total Users</span>
              <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
                {userStats.total}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Administrators</span>
              <Badge
                variant="outline"
                className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800"
              >
                {userStats.admins}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Active Users</span>
              <Badge
                variant="outline"
                className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800"
              >
                {userStats.active}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Suspended</span>
              <Badge
                variant="outline"
                className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
              >
                {userStats.suspended}
              </Badge>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" size="sm" className="w-full" onClick={() => router.push("/admin/appeals")}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Appeals
              {pendingAppealsCount > 0 && <Badge className="ml-2 bg-red-500 text-white">{pendingAppealsCount}</Badge>}
            </Button>
          </CardFooter>
        </Card>

        <Card className="md:col-span-4 bg-card border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle>Users</CardTitle>
            <CardDescription>Total of {users.length} users registered on the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-4">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search users..."
                  className="pl-8 bg-background"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[130px] bg-background">
                    <div className="flex items-center gap-2">
                      <span>Role: {roleFilter}</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px] bg-background">
                    <div className="flex items-center gap-2">
                      <span>Status: {statusFilter}</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>

                <Popover open={filterMenuOpen} onOpenChange={setFilterMenuOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="bg-background">
                      <Filter className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="end">
                    <div className="space-y-4">
                      <h4 className="font-medium">Advanced Filters</h4>

                      <div className="space-y-2">
                        <h5 className="text-sm font-medium">Posts</h5>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-xs">Min Posts</label>
                            <Input
                              type="number"
                              placeholder="Min"
                              value={filterOptions.minPosts}
                              onChange={(e) => setFilterOptions({ ...filterOptions, minPosts: e.target.value })}
                              className="h-8"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs">Max Posts</label>
                            <Input
                              type="number"
                              placeholder="Max"
                              value={filterOptions.maxPosts}
                              onChange={(e) => setFilterOptions({ ...filterOptions, maxPosts: e.target.value })}
                              className="h-8"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h5 className="text-sm font-medium">Followers</h5>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-xs">Min Followers</label>
                            <Input
                              type="number"
                              placeholder="Min"
                              value={filterOptions.minFollowers}
                              onChange={(e) => setFilterOptions({ ...filterOptions, minFollowers: e.target.value })}
                              className="h-8"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs">Max Followers</label>
                            <Input
                              type="number"
                              placeholder="Max"
                              value={filterOptions.maxFollowers}
                              onChange={(e) => setFilterOptions({ ...filterOptions, maxFollowers: e.target.value })}
                              className="h-8"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h5 className="text-sm font-medium">Join Date</h5>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-xs">After</label>
                            <Input
                              type="date"
                              value={filterOptions.joinedAfter}
                              onChange={(e) => setFilterOptions({ ...filterOptions, joinedAfter: e.target.value })}
                              className="h-8"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs">Before</label>
                            <Input
                              type="date"
                              value={filterOptions.joinedBefore}
                              onChange={(e) => setFilterOptions({ ...filterOptions, joinedBefore: e.target.value })}
                              className="h-8"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between pt-2">
                        <Button variant="outline" size="sm" onClick={resetFilters}>
                          Reset
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setFilterMenuOpen(false)}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          Apply Filters
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/60">
                    <TableHead className="cursor-pointer" onClick={() => toggleSort("username")}>
                      <div className="flex items-center">User {getSortIcon("username")}</div>
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => toggleSort("role")}>
                      <div className="flex items-center">Role {getSortIcon("role")}</div>
                    </TableHead>
                    <TableHead className="hidden md:table-cell cursor-pointer" onClick={() => toggleSort("createdAt")}>
                      <div className="flex items-center">Joined {getSortIcon("createdAt")}</div>
                    </TableHead>
                    <TableHead className="hidden md:table-cell cursor-pointer" onClick={() => toggleSort("postCount")}>
                      <div className="flex items-center">Posts {getSortIcon("postCount")}</div>
                    </TableHead>
                    <TableHead
                      className="hidden md:table-cell cursor-pointer"
                      onClick={() => toggleSort("followerCount")}
                    >
                      <div className="flex items-center">Followers {getSortIcon("followerCount")}</div>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <img
                            src={user.profilePicture || "/placeholder.svg?height=40&width=40"}
                            alt={user.username}
                            className="h-10 w-10 rounded-full object-cover border border-border"
                          />
                          <div>
                            <div className="font-medium">{user.username}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {user.role === "admin" ? (
                            <Badge className="bg-purple-500 hover:bg-purple-600">Admin</Badge>
                          ) : (
                            <Badge variant="outline">User</Badge>
                          )}
                          <div className="flex items-center">
                            {renderStatusBadge(user.status || "active")}
                            {user.status === "suspended" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 ml-1"
                                onClick={() => {
                                  setSelectedUser(user)
                                  setViewSuspensionDetailsOpen(true)
                                }}
                              >
                                <AlertCircle className="h-4 w-4 text-amber-500" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{user.postCount}</TableCell>
                      <TableCell className="hidden md:table-cell">{user.followerCount}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => window.open(`/profile/${user.username}`, "_blank")}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user)
                                setEditDialogOpen(true)
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Status Management</DropdownMenuLabel>
                            {user.status === "suspended" ? (
                              <DropdownMenuItem onClick={() => handleStatusChange(user.id, "active")}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Activate User
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(user)
                                  setSuspensionReason("")
                                  setSuspendDialogOpen(true)
                                }}
                                className="text-amber-600 focus:text-amber-600"
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                Suspend User
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600"
                              onClick={() => {
                                setSelectedUser(user)
                                setDeleteDialogOpen(true)
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}

                  {filteredUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <svg className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                            />
                          </svg>
                          <p>No users found</p>
                          {Object.values(filterOptions).some((val) => val !== "") ||
                          roleFilter !== "all" ||
                          statusFilter !== "all" ||
                          searchQuery ? (
                            <Button variant="link" onClick={resetFilters} className="mt-2">
                              Clear filters
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone and will permanently remove the
              user account and all associated data.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="flex items-center gap-3 py-2 border rounded-md p-3 bg-muted/20">
              <img
                src={selectedUser.profilePicture || "/placeholder.svg?height=40&width=40"}
                alt={selectedUser.username}
                className="h-10 w-10 rounded-full object-cover border border-border"
              />
              <div>
                <div className="font-medium">{selectedUser.username}</div>
                <div className="text-sm text-muted-foreground">{selectedUser.email}</div>
              </div>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => selectedUser && handleDeleteUser(selectedUser.id)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend User Confirmation Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-amber-600 flex items-center gap-2">
              <Ban className="h-5 w-5" />
              Suspend User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to suspend this user? They will not be able to log in or use the platform until
              reactivated.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 py-2 border rounded-md p-3 bg-muted/20">
                <img
                  src={selectedUser.profilePicture || "/placeholder.svg?height=40&width=40"}
                  alt={selectedUser.username}
                  className="h-10 w-10 rounded-full object-cover border border-border"
                />
                <div>
                  <div className="font-medium">{selectedUser.username}</div>
                  <div className="text-sm text-muted-foreground">{selectedUser.email}</div>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="suspension-reason" className="text-sm font-medium">
                  Suspension Reason <span className="text-red-500">*</span>
                </label>
                <Textarea
                  id="suspension-reason"
                  placeholder="Please provide a reason for suspending this user"
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  className="min-h-[80px]"
                />
                {suspensionReason.trim() === "" && (
                  <p className="text-xs text-red-500">A suspension reason is required</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setSuspendDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="default"
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => selectedUser && handleStatusChange(selectedUser.id, "suspended")}
              disabled={suspensionReason.trim() === ""}
            >
              Suspend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Suspension Details Dialog */}
      <Dialog open={viewSuspensionDetailsOpen} onOpenChange={setViewSuspensionDetailsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Suspension Details
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 py-2 border rounded-md p-3 bg-muted/20">
                <img
                  src={selectedUser.profilePicture || "/placeholder.svg?height=40&width=40"}
                  alt={selectedUser.username}
                  className="h-10 w-10 rounded-full object-cover border border-border"
                />
                <div>
                  <div className="font-medium">{selectedUser.username}</div>
                  <div className="text-sm text-muted-foreground">{selectedUser.email}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Suspended On:</span>
                  <span className="text-sm">
                    {selectedUser.suspendedAt ? new Date(selectedUser.suspendedAt).toLocaleString() : "Unknown"}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-sm font-medium">Reason for Suspension:</span>
                  <div className="p-3 bg-muted rounded-md text-sm">
                    {selectedUser.suspensionReason || "No reason provided"}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setViewSuspensionDetailsOpen(false)}>
              Close
            </Button>
            {selectedUser && selectedUser.status === "suspended" && (
              <Button
                variant="default"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => {
                  handleStatusChange(selectedUser.id, "active")
                  setViewSuspensionDetailsOpen(false)
                }}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Reactivate User
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Make changes to the user account details.</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="grid gap-4 py-4">
              <div className="flex items-center justify-center mb-4">
                <div className="relative">
                  <img
                    src={selectedUser.profilePicture || "/placeholder.svg?height=80&width=80"}
                    alt={selectedUser.username}
                    className="h-20 w-20 rounded-full object-cover border border-border"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="username" className="text-right text-sm font-medium">
                  Username
                </label>
                <Input id="username" defaultValue={selectedUser.username} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="email" className="text-right text-sm font-medium">
                  Email
                </label>
                <Input id="email" defaultValue={selectedUser.email} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="status" className="text-right text-sm font-medium">
                  Status
                </label>
                <Select defaultValue={selectedUser.status || "active"} id="status">
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedUser) {
                  // Get the form values
                  const username = (document.getElementById("username") as HTMLInputElement)?.value
                  const email = (document.getElementById("email") as HTMLInputElement)?.value
                  const status =
                    (document.querySelector("[data-value]") as HTMLElement)?.getAttribute("data-value") ||
                    selectedUser.status ||
                    "active"

                  // Call the handleEditUser function with the updated data
                  handleEditUser(selectedUser.id, {
                    username,
                    email,
                    status,
                  })
                }
              }}
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>Create a new user account.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="new-username" className="text-right text-sm font-medium">
                Username*
              </label>
              <Input
                id="new-username"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="new-email" className="text-right text-sm font-medium">
                Email*
              </label>
              <Input
                id="new-email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="new-password" className="text-right text-sm font-medium">
                Password*
              </label>
              <Input
                id="new-password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="new-role" className="text-right text-sm font-medium">
                Role
              </label>
              <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                <SelectTrigger className="col-span-3" id="new-role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newUser.role === "admin" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="admin-token" className="text-right text-sm font-medium">
                  Admin Token*
                </label>
                <Input
                  id="admin-token"
                  type="password"
                  value={newUser.adminToken}
                  onChange={(e) => setNewUser({ ...newUser, adminToken: e.target.value })}
                  className="col-span-3"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddUser}>Create User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )

  // Update the edit user function to actually save changes
  async function handleEditUser(userId: string, userData: any) {
    try {
      setRefreshing(true)
      await axios.put(`/api/admin/users/${userId}`, userData)

      // Update local state
      setUsers(users.map((user) => (user.id === userId ? { ...user, ...userData } : user)))

      setEditDialogOpen(false)
      toast({
        title: "User updated",
        description: "The user details have been updated successfully.",
      })
    } catch (err: any) {
      console.error("Error updating user:", err)
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to update user",
        variant: "destructive",
      })
    } finally {
      setRefreshing(false)
    }
  }
}
