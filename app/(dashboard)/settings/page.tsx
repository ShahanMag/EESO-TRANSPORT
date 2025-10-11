"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, UserCog, Shield, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface Admin {
  _id: string;
  username: string;
  role: "admin" | "super_admin";
  createdAt: string;
}

export default function SettingsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [deletingAdmin, setDeletingAdmin] = useState<Admin | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "admin" as "admin" | "super_admin",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchAdmins();
  }, []);

  async function fetchAdmins() {
    try {
      setLoading(true);
      const res = await fetch("/api/admins");
      const data = await res.json();
      if (data.success) {
        setAdmins(data.data);
      }
    } catch (error) {
      console.error("Error fetching admins:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleInitialize() {
    try {
      const res = await fetch("/api/admins/init", {
        method: "POST",
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Default admin accounts created successfully");
        fetchAdmins();
      } else {
        toast.error(data.error || "Failed to initialize admin accounts");
      }
    } catch (error) {
      console.error("Error initializing admins:", error);
      toast.error("An error occurred while initializing admin accounts");
    }
  }

  function validateForm() {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    }

    // Password is required for new admins, optional for editing
    if (!editingAdmin) {
      if (!formData.password || formData.password.length < 8) {
        newErrors.password = "Password must be at least 8 characters";
      }
    } else {
      // When editing, only validate if password is provided
      if (formData.password && formData.password.length < 8) {
        newErrors.password = "Password must be at least 8 characters";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const url = editingAdmin
        ? `/api/admins/${editingAdmin._id}`
        : "/api/admins";
      const method = editingAdmin ? "PUT" : "POST";

      // Only include password if it's provided
      const payload: any = {
        username: formData.username,
        role: formData.role,
      };
      if (formData.password) {
        payload.password = formData.password;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(
          editingAdmin
            ? "Admin updated successfully"
            : "Admin created successfully"
        );
        fetchAdmins();
        handleCloseDialog();
      } else {
        toast.error(data.error || `Failed to ${editingAdmin ? "update" : "create"} admin`);
        setErrors({ submit: data.error });
      }
    } catch (error) {
      console.error(`Error ${editingAdmin ? "updating" : "creating"} admin:`, error);
      toast.error(`An error occurred while ${editingAdmin ? "updating" : "creating"} admin`);
      setErrors({ submit: "An error occurred" });
    }
  }

  function handleOpenDialog(admin?: Admin) {
    if (admin) {
      setEditingAdmin(admin);
      setFormData({
        username: admin.username,
        password: "",
        role: admin.role,
      });
    } else {
      setEditingAdmin(null);
      setFormData({ username: "", password: "", role: "admin" });
    }
    setErrors({});
    setIsDialogOpen(true);
  }

  function handleCloseDialog() {
    setIsDialogOpen(false);
    setEditingAdmin(null);
    setFormData({ username: "", password: "", role: "admin" });
    setErrors({});
  }

  function handleDeleteClick(admin: Admin) {
    setDeletingAdmin(admin);
    setIsDeleteDialogOpen(true);
  }

  async function handleDeleteConfirm() {
    if (!deletingAdmin) return;

    try {
      const res = await fetch(`/api/admins/${deletingAdmin._id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Admin deleted successfully");
        fetchAdmins();
      } else {
        toast.error(data.error || "Failed to delete admin");
      }
    } catch (error) {
      console.error("Error deleting admin:", error);
      toast.error("An error occurred while deleting admin");
    } finally {
      setIsDeleteDialogOpen(false);
      setDeletingAdmin(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      {/* Admin Management */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Admin Management</CardTitle>
            <Button onClick={handleOpenDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Admin
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {admins.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No admin accounts found</p>
              <Button onClick={handleInitialize} variant="outline">
                <Shield className="mr-2 h-4 w-4" />
                Initialize Default Accounts
              </Button>
              <p className="text-xs text-gray-400 mt-2">
                This will create admin and superadmin accounts with password: 12345678
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {admins.map((admin) => (
                <div
                  key={admin._id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <UserCog className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="font-semibold">{admin.username}</p>
                      <p className="text-sm text-gray-500">
                        {admin.role === "super_admin" ? "Super Admin" : "Admin"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-500">
                      {new Date(admin.createdAt).toLocaleDateString()}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(admin)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(admin)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Admin Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAdmin ? "Edit Admin Account" : "Create Admin Account"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="username">
                  Username <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  placeholder="Enter username"
                />
                {errors.username && (
                  <p className="text-sm text-red-500 mt-1">{errors.username}</p>
                )}
              </div>
              <div>
                <Label htmlFor="password">
                  Password{" "}
                  {editingAdmin ? (
                    <span className="text-gray-500 text-sm">(Leave blank to keep current)</span>
                  ) : (
                    <span className="text-red-500">*</span>
                  )}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder={
                    editingAdmin
                      ? "Leave blank to keep current password"
                      : "At least 8 characters"
                  }
                />
                {errors.password && (
                  <p className="text-sm text-red-500 mt-1">{errors.password}</p>
                )}
              </div>
              <div>
                <Label htmlFor="role">
                  Role <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: "admin" | "super_admin") =>
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {errors.submit && (
                <p className="text-sm text-red-500">{errors.submit}</p>
              )}
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit">
                {editingAdmin ? "Update Admin" : "Create Admin"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Admin"
        description={`Are you sure you want to delete admin "${deletingAdmin?.username}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
