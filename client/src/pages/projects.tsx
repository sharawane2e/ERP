import { useMemo, useState } from "react";
import { useLocation } from "wouter";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  FolderKanban, 
  Trash2, 
  FileText, 
  Receipt, 
  DoorOpen,
  ClipboardList,
  BookOpen,
  Pencil,
  Calendar,
  Search
} from "lucide-react";
import { LayoutShell } from "@/components/layout-shell";
import { useUser } from "@/hooks/use-auth";
import type { Project, Client } from "@shared/schema";
import { quotationTypes } from "@shared/schema";

const projectFormSchema = z.object({
  projectName: z.string().min(1, "Project name is required"),
  clientId: z.string().min(1, "Client selection is required"),
  location: z.string().min(1, "Location is required"),
  quotationType: z.enum(quotationTypes, { errorMap: () => ({ message: "Quotation type is required" }) }),
});

type ProjectFormData = z.infer<typeof projectFormSchema>;

export default function ProjectsPage() {
  const [open, setOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: user } = useUser();

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: clients, isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      projectName: "",
      clientId: "",
      location: "",
      quotationType: undefined,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      return apiRequest("POST", "/api/projects", {
        ...data,
        clientId: Number(data.clientId),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Project created",
        description: "The project has been created successfully.",
      });
      form.reset();
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create project",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ProjectFormData }) => {
      return apiRequest("PUT", `/api/projects/${id}`, {
        ...data,
        clientId: Number(data.clientId),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Project updated",
        description: "The project has been updated successfully.",
      });
      form.reset();
      setEditProject(null);
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update project",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Project deleted",
        description: "The project has been deleted successfully.",
      });
      setProjectToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete project",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProjectFormData) => {
    if (editProject) {
      updateMutation.mutate({ id: editProject.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (project: Project) => {
    setEditProject(project);
    form.reset({
      projectName: project.projectName,
      clientId: String(project.clientId),
      location: project.location,
      quotationType: project.quotationType as typeof quotationTypes[number],
    });
    setOpen(true);
  };

  const handleCloseDialog = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setEditProject(null);
      form.reset();
    }
  };

  const getClientName = (clientId: number) => {
    const client = clients?.find(c => c.id === clientId);
    return client?.name || "Unknown Client";
  };

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    }).toUpperCase();
  };

  const getStatusColor = (type: string) => {
    switch (type) {
      case "Supply and Fabrication":
        return "text-blue-600";
      case "Structural Fabrication":
        return "text-purple-600";
      case "Job Work":
        return "text-amber-600";
      default:
        return "text-slate-600";
    }
  };

  const getStatusLabel = (type: string) => {
    switch (type) {
      case "Supply and Fabrication":
        return "SUPPLY & FAB";
      case "Structural Fabrication":
        return "STRUCTURAL";
      case "Job Work":
        return "JOB WORK";
      default:
        return type.toUpperCase();
    }
  };

  const handleConfirmDelete = () => {
    if (!projectToDelete) return;
    deleteMutation.mutate(projectToDelete.id);
  };

  const filteredProjects = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const sorted = [...(projects ?? [])].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (aTime !== bTime) return bTime - aTime;
      return b.id - a.id;
    });

    if (!term) return sorted;

    return sorted.filter((project) =>
      [
        project.projectName,
        getClientName(project.clientId),
        project.location,
        project.quotationType,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [projects, searchTerm, clients]);

  return (
    <LayoutShell user={user}>
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg shadow-primary/25">
              <FolderKanban className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
              <p className="text-sm text-slate-500">Manage your projects and quotations</p>
            </div>
          </div>

          <Dialog open={open} onOpenChange={handleCloseDialog}>
            <DialogTrigger asChild>
              <Button 
                data-testid="button-add-project"
                className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 transition-all duration-300"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editProject ? "Edit Project" : "Create New Project"}</DialogTitle>
                <DialogDescription>
                  {editProject ? "Update project details below." : "Add a new project with client and quotation details."}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="projectName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Name</FormLabel>
                        <FormControl>
                          <Input data-testid="input-project-name" placeholder="Enter project name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Name</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-client">
                              <SelectValue placeholder="Select a client" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {clientsLoading ? (
                              <SelectItem value="loading" disabled>Loading clients...</SelectItem>
                            ) : clients && clients.length > 0 ? (
                              clients.map((client) => (
                                <SelectItem 
                                  key={client.id} 
                                  value={String(client.id)}
                                  data-testid={`select-client-option-${client.id}`}
                                >
                                  {client.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="none" disabled>No clients available. Please add a client first.</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
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
                          <Input data-testid="input-location" placeholder="Enter location" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="quotationType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quotation Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-quotation-type">
                              <SelectValue placeholder="Select quotation type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {quotationTypes.map((type) => (
                              <SelectItem 
                                key={type} 
                                value={type}
                                data-testid={`select-quotation-option-${type.replace(/\s+/g, '-').toLowerCase()}`}
                              >
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-primary to-primary/90"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-submit-project"
                  >
                    {createMutation.isPending || updateMutation.isPending 
                      ? (editProject ? "Updating..." : "Creating...") 
                      : (editProject ? "Update Project" : "Create Project")}
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
            placeholder="Search by project, client, location, type..."
            className="pl-9"
            data-testid="input-search-projects"
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
                  Project Identifier
                </span>
              </div>
              <div className="col-span-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Client Partner
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Geographic Site
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Creation Date
                </span>
              </div>
              <div className="col-span-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Status
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
                  <div className="col-span-2"><div className="h-4 bg-slate-200 rounded w-20"></div></div>
                  <div className="col-span-3"><div className="h-4 bg-slate-200 rounded w-40"></div></div>
                  <div className="col-span-2"><div className="h-4 bg-slate-200 rounded w-24"></div></div>
                  <div className="col-span-2"><div className="h-4 bg-slate-200 rounded w-28"></div></div>
                  <div className="col-span-1"><div className="h-4 bg-slate-200 rounded w-16"></div></div>
                  <div className="col-span-2"><div className="h-4 bg-slate-200 rounded w-24 ml-auto"></div></div>
                </div>
              ))}
            </div>
          ) : filteredProjects.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {filteredProjects.map((project) => (
                <div 
                  key={project.id}
                  data-testid={`row-project-${project.id}`}
                  className="hidden md:grid grid-cols-12 gap-4 px-6 py-5 items-center hover:bg-slate-50/50 transition-colors group"
                >
                  {/* Project Identifier */}
                  <div className="col-span-2 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                      P
                    </div>
                    <span 
                      className="font-semibold text-slate-800"
                      data-testid={`text-project-name-${project.id}`}
                    >
                      {project.projectName.length > 15 
                        ? project.projectName.substring(0, 15) + '...' 
                        : project.projectName}
                    </span>
                  </div>

                  {/* Client Partner */}
                  <div className="col-span-3">
                    <span 
                      className="font-semibold text-slate-700 uppercase text-sm"
                      data-testid={`text-client-name-${project.id}`}
                    >
                      {getClientName(project.clientId)}
                    </span>
                  </div>

                  {/* Geographic Site */}
                  <div className="col-span-2">
                    <span 
                      className="text-slate-600 text-sm"
                      data-testid={`text-location-${project.id}`}
                    >
                      {project.location}
                    </span>
                  </div>

                  {/* Creation Date */}
                  <div className="col-span-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-red-400" />
                    <span 
                      className="text-slate-600 text-sm"
                      data-testid={`text-created-date-${project.id}`}
                    >
                      {project.createdAt ? formatDate(project.createdAt) : 'N/A'}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="col-span-1">
                    <span 
                      className={`font-bold text-xs uppercase tracking-wide ${getStatusColor(project.quotationType)}`}
                      data-testid={`text-status-${project.id}`}
                    >
                      {getStatusLabel(project.quotationType)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => setLocation(`/projects/${project.id}/quotation`)}
                      data-testid={`button-quotation-${project.id}`}
                      title="Create Quotation"
                    >
                      <FileText className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md text-slate-400 hover:text-green-600 hover:bg-green-50"
                      onClick={() => setLocation(`/projects/${project.id}/invoice`)}
                      data-testid={`button-invoice-${project.id}`}
                      title="Create Invoice"
                    >
                      <Receipt className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                      onClick={() => setLocation(`/projects/${project.id}/gate-pass`)}
                      data-testid={`button-gate-pass-${project.id}`}
                      title="Create Gate Pass"
                    >
                      <DoorOpen className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                      onClick={() => setLocation(`/projects/${project.id}/delivery-challan`)}
                      data-testid={`button-delivery-challan-${project.id}`}
                      title="Create Delivery Challan"
                    >
                      <ClipboardList className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md text-slate-400 hover:text-violet-600 hover:bg-violet-50"
                      onClick={() => setLocation(`/projects/${project.id}/ledger`)}
                      data-testid={`button-ledger-${project.id}`}
                      title="Open Ledger"
                    >
                      <BookOpen className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                      onClick={() => handleEdit(project)}
                      data-testid={`button-edit-project-${project.id}`}
                      title="Edit Project"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => setProjectToDelete(project)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-project-${project.id}`}
                      title="Delete Project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {filteredProjects.map((project) => (
                <div
                  key={`mobile-${project.id}`}
                  className="md:hidden px-4 py-4 space-y-3 hover:bg-slate-50/50"
                  data-testid={`card-project-${project.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{project.projectName}</p>
                      <p className="text-xs text-slate-500 mt-1">{getClientName(project.clientId)}</p>
                      <p className="text-xs text-slate-500">{project.location}</p>
                    </div>
                    <span className={`font-bold text-[10px] uppercase tracking-wide ${getStatusColor(project.quotationType)}`}>
                      {getStatusLabel(project.quotationType)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => setLocation(`/projects/${project.id}/quotation`)}
                      data-testid={`button-quotation-mobile-${project.id}`}
                    >
                      <FileText className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md text-slate-400 hover:text-green-600 hover:bg-green-50"
                      onClick={() => setLocation(`/projects/${project.id}/invoice`)}
                      data-testid={`button-invoice-mobile-${project.id}`}
                    >
                      <Receipt className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                      onClick={() => setLocation(`/projects/${project.id}/gate-pass`)}
                      data-testid={`button-gate-pass-mobile-${project.id}`}
                    >
                      <DoorOpen className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                      onClick={() => setLocation(`/projects/${project.id}/delivery-challan`)}
                      data-testid={`button-delivery-challan-mobile-${project.id}`}
                    >
                      <ClipboardList className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md text-slate-400 hover:text-violet-600 hover:bg-violet-50"
                      onClick={() => setLocation(`/projects/${project.id}/ledger`)}
                      data-testid={`button-ledger-mobile-${project.id}`}
                      title="Open Ledger"
                    >
                      <BookOpen className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                      onClick={() => handleEdit(project)}
                      data-testid={`button-edit-project-mobile-${project.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => setProjectToDelete(project)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-project-mobile-${project.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary/10 to-teal-500/10 flex items-center justify-center mb-4">
                <FolderKanban className="w-8 h-8 text-primary/60" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No projects yet</h3>
              <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                Get started by creating your first project. Add clients first if you haven't already.
              </p>
              <Button 
                onClick={() => setOpen(true)}
                className="bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/25"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Project
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!projectToDelete} onOpenChange={(isOpen) => !isOpen && setProjectToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Project?</DialogTitle>
            <DialogDescription>
              {projectToDelete
                ? `Are you sure you want to delete "${projectToDelete.projectName}"? This action cannot be undone.`
                : "Are you sure you want to delete this project? This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setProjectToDelete(null)}
              disabled={deleteMutation.isPending}
              data-testid="button-cancel-delete-project"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-project"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </LayoutShell>
  );
}
