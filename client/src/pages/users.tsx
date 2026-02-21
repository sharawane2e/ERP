import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Users as UsersIcon, 
  Trash2, 
  Pencil,
  Mail,
  Phone,
  Shield,
  User as UserIcon
} from "lucide-react";
import { LayoutShell } from "@/components/layout-shell";
import { useUser } from "@/hooks/use-auth";
import type { User, Client } from "@shared/schema";
import { userRoles } from "@shared/schema";

const userFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  username: z.string().email("Please enter a valid email address"),
  mobile: z.string().min(10, "Valid mobile number is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(userRoles, { errorMap: () => ({ message: "Role is required" }) }),
  assignedClientIds: z.array(z.number()).optional(),
});

const userUpdateSchema = userFormSchema.partial().extend({
  name: z.string().min(1, "Name is required"),
  username: z.string().email("Please enter a valid email address"),
  mobile: z.string().min(10, "Valid mobile number is required"),
  role: z.enum(userRoles, { errorMap: () => ({ message: "Role is required" }) }),
  password: z.string().optional(),
});

type UserFormData = z.infer<typeof userFormSchema>;

export default function UsersPage() {
  const [open, setOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [selectedClients, setSelectedClients] = useState<number[]>([]);
  const { toast } = useToast();
  const { data: currentUser } = useUser();

  const isAdmin = currentUser?.role === "Administrator";

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/revira/api/users"],
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/revira/api/clients"],
  });

  const form = useForm<UserFormData>({
    resolver: zodResolver(editUser ? userUpdateSchema : userFormSchema),
    defaultValues: {
      name: "",
      username: "",
      mobile: "",
      password: "",
      role: "Standard",
      assignedClientIds: [],
    },
  });

  const watchRole = form.watch("role");

  const createMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      return apiRequest("POST", "/revira/api/users", {
        ...data,
        email: data.username,
        assignedClientIds: selectedClients,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/revira/api/users"] });
      toast({
        title: "User created",
        description: "The user has been created successfully.",
      });
      form.reset();
      setSelectedClients([]);
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<UserFormData> }) => {
      const payload: any = {
        name: data.name,
        username: data.username,
        email: data.username,
        mobile: data.mobile,
        role: data.role,
        assignedClientIds: selectedClients,
      };
      if (data.password && data.password.length >= 6) {
        payload.password = data.password;
      }
      return apiRequest("PUT", `/revira/api/users/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/revira/api/users"] });
      toast({
        title: "User updated",
        description: "The user has been updated successfully.",
      });
      form.reset();
      setSelectedClients([]);
      setEditUser(null);
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/revira/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/revira/api/users"] });
      toast({
        title: "User deleted",
        description: "The user has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const handleEdit = async (user: User) => {
    setEditUser(user);
    form.reset({
      name: user.name,
      username: user.username,
      mobile: user.mobile || "",
      password: "",
      role: user.role as typeof userRoles[number],
    });
    
    // Fetch client assignments for this user
    try {
      const response = await fetch(`/revira/api/users/${user.id}/clients`);
      const clientIds = await response.json();
      setSelectedClients(clientIds);
    } catch {
      setSelectedClients([]);
    }
    
    setOpen(true);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
      setEditUser(null);
      setSelectedClients([]);
    }
    setOpen(isOpen);
  };

  const onSubmit = (data: UserFormData) => {
    if (editUser) {
      updateMutation.mutate({ id: editUser.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const toggleClient = (clientId: number) => {
    setSelectedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const getRoleBadgeColor = (role: string) => {
    return role === "Administrator" 
      ? "bg-purple-100 text-purple-700"
      : "bg-blue-100 text-blue-700";
  };

  return (
    <LayoutShell user={currentUser}>
      {/* Header Section */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1" data-testid="text-page-title">
            User Management
          </h1>
          <p className="text-slate-500" data-testid="text-page-description">
            Manage system users and their access permissions
          </p>
        </div>

        {isAdmin && (
          <Dialog open={open} onOpenChange={handleOpenChange}>
            <Button 
              onClick={() => {
                setEditUser(null);
                form.reset();
                setSelectedClients([]);
                setOpen(true);
              }}
              className="bg-gradient-to-r from-[#d92134] to-[#b51c2c] hover:from-[#b51c2c] hover:to-[#a01827] shadow-lg shadow-red-200/50"
              data-testid="button-add-user"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editUser ? "Edit User" : "Add New User"}</DialogTitle>
                <DialogDescription>
                  {editUser 
                    ? "Update the user details below."
                    : "Fill in the details to create a new user account."}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>User Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter full name" 
                            {...field} 
                            data-testid="input-user-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email ID</FormLabel>
                        <FormControl>
                          <Input 
                            type="email"
                            placeholder="Enter email address" 
                            {...field} 
                            data-testid="input-user-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile No.</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter mobile number" 
                            {...field} 
                            data-testid="input-user-mobile"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{editUser ? "New Password (leave blank to keep current)" : "Password"}</FormLabel>
                        <FormControl>
                          <Input 
                            type="password"
                            placeholder={editUser ? "Enter new password (optional)" : "Enter password"} 
                            {...field} 
                            data-testid="input-user-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-user-role">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {userRoles.map((role) => (
                              <SelectItem key={role} value={role} data-testid={`option-role-${role.toLowerCase()}`}>
                                {role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {watchRole === "Standard" && clients && clients.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Assign Clients</label>
                      <p className="text-xs text-slate-500 mb-2">
                        Standard users can only access projects of assigned clients
                      </p>
                      <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                        {clients.map((client) => (
                          <div key={client.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`client-${client.id}`}
                              checked={selectedClients.includes(client.id)}
                              onCheckedChange={() => toggleClient(client.id)}
                              data-testid={`checkbox-client-${client.id}`}
                            />
                            <label
                              htmlFor={`client-${client.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {client.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleOpenChange(false)}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className="bg-gradient-to-r from-[#d92134] to-[#b51c2c]"
                      data-testid="button-submit-user"
                    >
                      {createMutation.isPending || updateMutation.isPending 
                        ? "Saving..." 
                        : editUser ? "Update User" : "Create User"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Users Table */}
      <Card className="shadow-lg border-slate-200/50 overflow-hidden">
        <CardContent className="p-0">
          {/* Table Header */}
          <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
            <div className="grid grid-cols-12 gap-4 px-6 py-4">
              <div className="col-span-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  User
                </span>
              </div>
              <div className="col-span-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Email
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Mobile
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Role
                </span>
              </div>
              <div className="col-span-2 text-right">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Actions
                </span>
              </div>
            </div>
          </div>

          {/* Table Body */}
          {isLoading ? (
            <div className="divide-y divide-slate-100">
              {[1, 2, 3].map((i) => (
                <div key={i} className="grid grid-cols-12 gap-4 px-6 py-5 animate-pulse">
                  <div className="col-span-3"><div className="h-4 bg-slate-200 rounded w-32"></div></div>
                  <div className="col-span-3"><div className="h-4 bg-slate-200 rounded w-40"></div></div>
                  <div className="col-span-2"><div className="h-4 bg-slate-200 rounded w-24"></div></div>
                  <div className="col-span-2"><div className="h-4 bg-slate-200 rounded w-20"></div></div>
                  <div className="col-span-2"><div className="h-4 bg-slate-200 rounded w-16 ml-auto"></div></div>
                </div>
              ))}
            </div>
          ) : users && users.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {users.map((user) => (
                <div 
                  key={user.id}
                  data-testid={`row-user-${user.id}`}
                  className="grid grid-cols-12 gap-4 px-6 py-5 items-center hover:bg-slate-50/50 transition-colors group"
                >
                  {/* User Name */}
                  <div className="col-span-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                      {user.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <span 
                      className="font-semibold text-slate-800"
                      data-testid={`text-user-name-${user.id}`}
                    >
                      {user.name}
                    </span>
                  </div>

                  {/* Email */}
                  <div className="col-span-3 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span 
                      className="text-slate-600 text-sm"
                      data-testid={`text-user-email-${user.id}`}
                    >
                      {user.username}
                    </span>
                  </div>

                  {/* Mobile */}
                  <div className="col-span-2 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span 
                      className="text-slate-600 text-sm"
                      data-testid={`text-user-mobile-${user.id}`}
                    >
                      {user.mobile || "-"}
                    </span>
                  </div>

                  {/* Role */}
                  <div className="col-span-2">
                    <span 
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(user.role || "Standard")}`}
                      data-testid={`text-user-role-${user.id}`}
                    >
                      <Shield className="w-3 h-3" />
                      {user.role || "Standard"}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex items-center justify-end gap-1">
                    {isAdmin && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                          onClick={() => handleEdit(user)}
                          data-testid={`button-edit-user-${user.id}`}
                          title="Edit User"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {user.id !== currentUser?.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete ${user.name}?`)) {
                                deleteMutation.mutate(user.id);
                              }
                            }}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-user-${user.id}`}
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary/10 to-slate-500/10 flex items-center justify-center mb-4">
                <UsersIcon className="w-8 h-8 text-primary/60" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No users yet</h3>
              <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                Get started by adding your first user account.
              </p>
              {isAdmin && (
                <Button 
                  onClick={() => setOpen(true)}
                  className="bg-gradient-to-r from-[#d92134] to-[#b51c2c] shadow-lg shadow-red-200/50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add First User
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </LayoutShell>
  );
}
