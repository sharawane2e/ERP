import { useEffect, useMemo, useState } from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, Trash2, Pencil, Phone, Mail, MapPin, Building2, Search, Landmark } from "lucide-react";
import { LayoutShell } from "@/components/layout-shell";
import { useUser } from "@/hooks/use-auth";
import type { Client, Project } from "@shared/schema";
import { useLocation } from "wouter";

const clientFormSchema = z.object({
  name: z.string().min(1, "Client name is required"),
  // location: z.string().min(1, "Location is required"),
  location: z.string(),
  // gstNo: z.string().min(1, "GST No. is required"),
  gstNo: z.string(),
  // contactPerson: z.string().min(1, "Contact person is required"),
  contactPerson: z.string(),
  mobileNumber: z.string().min(10, "Valid mobile number is required"),
  // emailAddress: z.string().email("Valid email is required"),
  emailAddress: z.string(),
});

type ClientFormData = z.infer<typeof clientFormSchema>;

const withLegacyClientDefaults = (data: ClientFormData): ClientFormData => ({
  ...data,
  gstNo: data.gstNo?.trim() || "NA",
  contactPerson: data.contactPerson?.trim() || "NA",
  mobileNumber: data.mobileNumber?.trim() || "0000000000",
  emailAddress: data.emailAddress?.trim() || "na@example.com",
});

export default function ClientsPage() {
  const ROWS_PER_PAGE = 10;
  const [open, setOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: user } = useUser();

  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });
  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      location: "",
      gstNo: "",
      contactPerson: "",
      mobileNumber: "",
      emailAddress: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ClientFormData) => {
      const res = await apiRequest(
        "POST",
        "/api/clients",
        withLegacyClientDefaults(data),
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      form.reset();
      setOpen(false);
      toast({
        title: "Success",
        description: "Client created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ClientFormData }) => {
      const res = await apiRequest("PUT", `/api/clients/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      form.reset();
      setEditClient(null);
      setOpen(false);
      toast({
        title: "Success",
        description: "Client updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Success",
        description: "Client deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ClientFormData) => {
    if (editClient) {
      updateMutation.mutate({ id: editClient.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (client: Client) => {
    setEditClient(client);
    form.reset({
      name: client.name,
      location: client.location,
      gstNo: client.gstNo,
      contactPerson: client.contactPerson,
      mobileNumber: client.mobileNumber,
      emailAddress: client.emailAddress,
    });
    setOpen(true);
  };

  const handleCloseDialog = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setEditClient(null);
      form.reset();
    }
  };

  const handleDeleteClient = (clientId: number) => {
    const hasInitiatedProject = (projects ?? []).some((project) => project.clientId === clientId);
    if (hasInitiatedProject) {
      setInfoDialogOpen(true);
      return;
    }
    deleteMutation.mutate(clientId);
  };

  const filteredClients = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const sorted = [...(clients ?? [])].sort((a, b) => b.id - a.id);
    if (!term) return sorted;

    return sorted.filter((client) =>
      [
        client.name,
        client.location,
        client.gstNo,
        client.contactPerson,
        client.mobileNumber,
        client.emailAddress,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [clients, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / ROWS_PER_PAGE));

  const paginatedClients = useMemo(() => {
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredClients.slice(startIndex, startIndex + ROWS_PER_PAGE);
  }, [filteredClients, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <LayoutShell user={user}>
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg shadow-primary/25">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
              <p className="text-sm text-slate-500">
                Manage your client partners
              </p>
            </div>
          </div>

          <Dialog open={open} onOpenChange={handleCloseDialog}>
            <DialogTrigger asChild>
              <Button
                data-testid="button-add-client"
                className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 transition-all duration-300"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editClient ? "Edit Client" : "Create New Client"}
                </DialogTitle>
                <DialogDescription>
                  {editClient
                    ? "Update client details below."
                    : "Add a new client partner to your system."}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Name</FormLabel>
                        <FormControl>
                          <Input
                            data-testid="input-client-name"
                            placeholder="Enter client name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input
                            data-testid="input-location"
                            placeholder="Enter location"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gstNo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GST No.</FormLabel>
                        <FormControl>
                          <Input
                            data-testid="input-gst-no"
                            placeholder="Enter GST number"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactPerson"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Person</FormLabel>
                        <FormControl>
                          <Input
                            data-testid="input-contact-person"
                            placeholder="Enter contact person name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mobileNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile Number</FormLabel>
                        <FormControl>
                          <Input
                            data-testid="input-mobile-number"
                            placeholder="Enter mobile number"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="emailAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input
                            data-testid="input-email-address"
                            type="email"
                            placeholder="Enter email address"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-primary to-primary/90"
                    disabled={
                      createMutation.isPending || updateMutation.isPending
                    }
                    data-testid="button-submit-client"
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? editClient
                        ? "Updating..."
                        : "Creating..."
                      : editClient
                        ? "Update Client"
                        : "Create Client"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-md">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, GST, location, contact..."
            className="pl-9"
            data-testid="input-search-clients"
          />
        </div>
      </div>

      <Card className="border-0 shadow-lg overflow-hidden">
        <CardContent className="p-0">
          {/* Table Header */}
          <div className="bg-slate-50 border-b border-slate-200">
            <div className="grid grid-cols-12 gap-4 px-6 py-4">
              <div className="col-span-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Client Name
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Location
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  GST No.
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Contact Person
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Contact Info
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
                <div
                  key={i}
                  className="grid grid-cols-12 gap-4 px-6 py-5 animate-pulse"
                >
                  <div className="col-span-2">
                    <div className="h-4 bg-slate-200 rounded w-28"></div>
                  </div>
                  <div className="col-span-2">
                    <div className="h-4 bg-slate-200 rounded w-20"></div>
                  </div>
                  <div className="col-span-2">
                    <div className="h-4 bg-slate-200 rounded w-32"></div>
                  </div>
                  <div className="col-span-2">
                    <div className="h-4 bg-slate-200 rounded w-24"></div>
                  </div>
                  <div className="col-span-2">
                    <div className="h-4 bg-slate-200 rounded w-28"></div>
                  </div>
                  <div className="col-span-2">
                    <div className="h-4 bg-slate-200 rounded w-16 ml-auto"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredClients.length > 0 ? (
            <>
              <div className="divide-y divide-slate-100">
              {paginatedClients.map((client) => (
                <div
                  key={client.id}
                  data-testid={`row-client-${client.id}`}
                  className="hidden md:grid grid-cols-12 gap-4 px-6 py-5 items-center hover:bg-slate-50/50 transition-colors group"
                >
                  {/* Client Name */}
                  <div className="col-span-2 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <span
                      className="font-semibold text-slate-800 uppercase text-sm"
                      data-testid={`text-client-name-${client.id}`}
                    >
                      {client.name.length > 15
                        ? client.name.substring(0, 15) + "..."
                        : client.name}
                    </span>
                  </div>

                  {/* Location */}
                  <div className="col-span-2 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span
                      className="text-slate-600 text-sm"
                      data-testid={`text-location-${client.id}`}
                    >
                      {client.location}
                    </span>
                  </div>

                  {/* GST No */}
                  <div className="col-span-2">
                    <span
                      className="text-slate-700 text-sm font-mono"
                      data-testid={`text-gst-${client.id}`}
                    >
                      {client.gstNo}
                    </span>
                  </div>

                  {/* Contact Person */}
                  <div className="col-span-2">
                    <span
                      className="text-slate-600 text-sm"
                      data-testid={`text-contact-${client.id}`}
                    >
                      {client.contactPerson}
                    </span>
                  </div>

                  {/* Contact Info */}
                  <div className="col-span-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3 text-green-500" />
                      <span
                        className="text-slate-600 text-xs"
                        data-testid={`text-mobile-${client.id}`}
                      >
                        {client.mobileNumber}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-3 h-3 text-blue-500" />
                      <span
                        className="text-slate-600 text-xs truncate max-w-[140px]"
                        data-testid={`text-email-${client.id}`}
                        title={client.emailAddress}
                      >
                        {client.emailAddress}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                      onClick={() => setLocation(`/clients/${client.id}/ledger`)}
                      data-testid={`button-ledger-client-${client.id}`}
                      title="Client Ledger"
                    >
                      <Landmark className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                      onClick={() => handleEdit(client)}
                      data-testid={`button-edit-client-${client.id}`}
                      title="Edit Client"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleDeleteClient(client.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-client-${client.id}`}
                      title="Delete Client"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {paginatedClients.map((client) => (
                <div
                  key={`mobile-${client.id}`}
                  className="md:hidden px-4 py-4 space-y-2 hover:bg-slate-50/50"
                  data-testid={`card-client-${client.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900 uppercase text-sm">
                        {client.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {client.location}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                        onClick={() => setLocation(`/clients/${client.id}/ledger`)}
                        data-testid={`button-ledger-client-mobile-${client.id}`}
                        title="Client Ledger"
                      >
                        <Landmark className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                        onClick={() => handleEdit(client)}
                        data-testid={`button-edit-client-mobile-${client.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteClient(client.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-client-mobile-${client.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600">
                    <span className="font-semibold">GST:</span> {client.gstNo}
                  </p>
                  <p className="text-xs text-slate-600">
                    <span className="font-semibold">Contact:</span>{" "}
                    {client.contactPerson}
                  </p>
                  <p className="text-xs text-slate-600">
                    <span className="font-semibold">Mobile:</span>{" "}
                    {client.mobileNumber}
                  </p>
                  <p className="text-xs text-slate-600 break-all">
                    <span className="font-semibold">Email:</span>{" "}
                    {client.emailAddress}
                  </p>
                </div>
              ))}
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/60 px-4 py-3">
                <p className="text-sm text-slate-600">
                  Page {currentPage} of {totalPages} | {filteredClients.length} records
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    data-testid="button-clients-prev-page"
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    data-testid="button-clients-next-page"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="py-16 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary/10 to-blue-500/10 flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-primary/60" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">
                No clients yet
              </h3>
              <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                Get started by adding your first client partner.
              </p>
              <Button
                onClick={() => setOpen(true)}
                className="bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/25"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Client
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={infoDialogOpen} onOpenChange={setInfoDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Client Delete Info</DialogTitle>
            <DialogDescription>
              Client is not deleted due to multiple project is initiated
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => setInfoDialogOpen(false)} data-testid="button-close-client-delete-info">
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </LayoutShell>
  );
}
