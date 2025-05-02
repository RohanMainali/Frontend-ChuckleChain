"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { RefreshCcw, Check, X, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Appeal {
  _id: string
  username: string
  userId: {
    _id: string
    username: string
    email: string
    profilePicture: string
  }
  appealText: string
  status: "pending" | "approved" | "rejected"
  adminResponse: string
  reviewedBy?: {
    _id: string
    username: string
  }
  reviewedAt?: string
  createdAt: string
}

export default function AppealsPage() {
  const [appeals, setAppeals] = useState<Appeal[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [adminResponse, setAdminResponse] = useState("")
  const [reviewStatus, setReviewStatus] = useState<"approved" | "rejected">("rejected")
  const [filterStatus, setFilterStatus] = useState<"pending" | "approved" | "rejected" | "all">("pending")
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchAppeals()
    fetchStats()
  }, [filterStatus])

  const fetchAppeals = async () => {
    try {
      setRefreshing(true)
      const statusParam = filterStatus === "all" ? "" : `status=${filterStatus}`

      // Log the request URL for debugging
      console.log(`Fetching appeals with URL: /api/appeals?${statusParam}&limit=50`)

      const response = await axios.get(`/api/appeals?${statusParam}&limit=50`)
      console.log("Appeals response:", response.data)

      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        setAppeals(response.data.data)
      } else {
        console.error("Invalid appeals data format:", response.data)
        setAppeals([])
      }

      setError("")
    } catch (err: any) {
      console.error("Error fetching appeals:", err)
      setAppeals([]) // Add this line to ensure appeals is reset to an empty array on error
      setError(err.response?.data?.message || "Failed to load appeals")
      toast({
        title: "Error",
        description: "Failed to load appeals. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchStats = async () => {
    try {
      // Get the counts for different status types
      const { data } = await axios.get("/api/appeals/count")
      if (data && data.success && data.data) {
        setStats({
          pending: data.data.pending || 0,
          approved: data.data.approved || 0,
          rejected: data.data.rejected || 0,
        })
      } else {
        console.error("Invalid stats data format:", data)
        setStats({
          pending: 0,
          approved: 0,
          rejected: 0,
        })
      }
    } catch (err) {
      console.error("Failed to fetch appeal stats:", err)
      setStats({
        pending: 0,
        approved: 0,
        rejected: 0,
      })
    }
  }

  const handleReviewSubmit = async () => {
    if (!selectedAppeal) return

    try {
      setRefreshing(true)

      await axios.put(`/api/appeals/${selectedAppeal._id}`, {
        status: reviewStatus,
        adminResponse,
      })

      toast({
        title: `Appeal ${reviewStatus}`,
        description:
          reviewStatus === "approved" ? "The user's account has been reactivated" : "The appeal has been rejected",
      })

      // Update the appeal in the local state
      setAppeals(
        appeals.map((appeal) =>
          appeal._id === selectedAppeal._id
            ? {
                ...appeal,
                status: reviewStatus,
                adminResponse,
                reviewedAt: new Date().toISOString(),
              }
            : appeal,
        ),
      )

      setReviewOpen(false)
      fetchStats() // Refresh the counts
      fetchAppeals() // Refresh the appeals list
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to review appeal",
        variant: "destructive",
      })
    } finally {
      setRefreshing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800"
          >
            Pending
          </Badge>
        )
      case "approved":
        return <Badge className="bg-emerald-500 hover:bg-emerald-600">Approved</Badge>
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suspension Appeals</h1>
          <p className="text-muted-foreground">Review and manage user suspension appeals</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchAppeals()
              fetchStats()
            }}
            disabled={refreshing}
            className="transition-all duration-200 hover:bg-muted"
          >
            <RefreshCcw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md dark:bg-red-900/20 dark:text-red-300 dark:border-red-800">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="md:col-span-1 bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle>Appeal Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Pending</span>
              <Badge
                variant="outline"
                className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800"
              >
                {stats.pending}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Approved</span>
              <Badge
                variant="outline"
                className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800"
              >
                {stats.approved}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Rejected</span>
              <Badge
                variant="outline"
                className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
              >
                {stats.rejected}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 bg-card border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle>Appeals</CardTitle>
            <CardDescription>Review and respond to user account suspension appeals</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)} className="mb-6">
              <TabsList className="grid grid-cols-4 mb-2">
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/60">
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appeals.length > 0 ? (
                    appeals.map((appeal) => (
                      <TableRow key={appeal._id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage
                                src={appeal.userId?.profilePicture || "/placeholder.svg?height=40&width=40"}
                              />
                              <AvatarFallback>{appeal.username?.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{appeal.username}</div>
                              <div className="text-sm text-muted-foreground">{appeal.userId?.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(appeal.status)}</TableCell>
                        <TableCell>
                          {appeal.createdAt
                            ? formatDistanceToNow(new Date(appeal.createdAt), { addSuffix: true })
                            : "Unknown"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedAppeal(appeal)
                                setDetailsOpen(true)
                              }}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            {appeal.status === "pending" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-emerald-600"
                                  title="Approve Appeal"
                                  onClick={() => {
                                    setSelectedAppeal(appeal)
                                    setReviewStatus("approved")
                                    setAdminResponse("")
                                    setReviewOpen(true)
                                  }}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-600"
                                  title="Reject Appeal"
                                  onClick={() => {
                                    setSelectedAppeal(appeal)
                                    setReviewStatus("rejected")
                                    setAdminResponse("")
                                    setReviewOpen(true)
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <svg className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          <p>No {filterStatus === "all" ? "" : filterStatus} appeals found</p>
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

      {/* Appeal Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Appeal Details</DialogTitle>
            <DialogDescription>Review the details of this appeal submission</DialogDescription>
          </DialogHeader>
          {selectedAppeal && (
            <div className="space-y-6 mt-2">
              <div className="flex items-center gap-3 py-2">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedAppeal.userId?.profilePicture || "/placeholder.svg?height=48&width=48"} />
                  <AvatarFallback>{selectedAppeal.username?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-lg">{selectedAppeal.username}</div>
                  <div className="text-sm text-muted-foreground">{selectedAppeal.userId?.email}</div>
                </div>
                <div className="ml-auto">{getStatusBadge(selectedAppeal.status)}</div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Appeal Reason</label>
                <div className="p-4 bg-muted rounded-md whitespace-pre-wrap text-sm">{selectedAppeal.appealText}</div>
              </div>

              {selectedAppeal.status !== "pending" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Admin Response</label>
                  <div className="p-4 bg-muted rounded-md whitespace-pre-wrap text-sm">
                    {selectedAppeal.adminResponse || "No response provided"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {selectedAppeal.reviewedBy ? `Reviewed by ${selectedAppeal.reviewedBy.username}` : ""}
                    {selectedAppeal.reviewedAt
                      ? ` ${formatDistanceToNow(new Date(selectedAppeal.reviewedAt), { addSuffix: true })}`
                      : ""}
                  </div>
                </div>
              )}

              <div className="text-xs text-muted-foreground pt-2">
                Submitted {formatDistanceToNow(new Date(selectedAppeal.createdAt), { addSuffix: true })}
              </div>

              {selectedAppeal.status === "pending" && (
                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800/40 dark:hover:bg-red-950/40"
                    onClick={() => {
                      setReviewStatus("rejected")
                      setAdminResponse("")
                      setDetailsOpen(false)
                      setReviewOpen(true)
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => {
                      setReviewStatus("approved")
                      setAdminResponse("")
                      setDetailsOpen(false)
                      setReviewOpen(true)
                    }}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Approve & Reactivate Account
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Appeal Review Dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{reviewStatus === "approved" ? "Approve Appeal" : "Reject Appeal"}</DialogTitle>
            <DialogDescription>
              {reviewStatus === "approved"
                ? "Approving will reactivate the user's account"
                : "Please provide a reason for rejecting this appeal"}
            </DialogDescription>
          </DialogHeader>
          {selectedAppeal && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3 p-3 border rounded-md bg-muted/20">
                <Avatar>
                  <AvatarImage src={selectedAppeal.userId?.profilePicture || "/placeholder.svg?height=40&width=40"} />
                  <AvatarFallback>{selectedAppeal.username?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{selectedAppeal.username}</div>
                  <div className="text-sm text-muted-foreground">
                    Appeal submitted {formatDistanceToNow(new Date(selectedAppeal.createdAt), { addSuffix: true })}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex gap-2 justify-between items-center">
                  <label htmlFor="review-status" className="text-sm font-medium">
                    Status
                  </label>
                  <Select value={reviewStatus} onValueChange={(value: any) => setReviewStatus(value)}>
                    <SelectTrigger id="review-status" className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved">Approve</SelectItem>
                      <SelectItem value="rejected">Reject</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="admin-response" className="text-sm font-medium">
                  Response to User {reviewStatus === "rejected" && <span className="text-red-500">*</span>}
                </label>
                <Textarea
                  id="admin-response"
                  placeholder={
                    reviewStatus === "approved"
                      ? "Optional message to the user about their reactivated account..."
                      : "Please explain why this appeal was rejected..."
                  }
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  className="min-h-[100px]"
                />
                {reviewStatus === "rejected" && !adminResponse.trim() && (
                  <p className="text-xs text-red-500">A reason is required when rejecting an appeal</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setReviewOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReviewSubmit}
              disabled={reviewStatus === "rejected" && !adminResponse.trim()}
              className={
                reviewStatus === "approved"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }
            >
              {reviewStatus === "approved" ? "Approve & Reactivate" : "Reject Appeal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
