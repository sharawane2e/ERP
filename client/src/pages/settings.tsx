import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { 
  Save, 
  Building2, 
  Globe, 
  Mail, 
  MapPin,
  FileText
} from "lucide-react";
import { LayoutShell } from "@/components/layout-shell";
import { useUser } from "@/hooks/use-auth";
import { insertBrandingSchema, type Branding } from "@shared/schema";

const settingsFormSchema = z.object({
  entityName: z.string().min(1, "Entity name is required"),
  cin: z.string().min(1, "CIN is required"),
  website: z.string().min(1, "Website is required"),
  email: z.string().email("Valid email is required"),
  headOfficeAddress: z.string().min(1, "Head office address is required"),
  workshopAddress: z.string().min(1, "Workshop address is required"),
});

type SettingsFormData = z.infer<typeof settingsFormSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  const { data: user } = useUser();
  
  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      entityName: "Revira NexGen Structure Pvt. Ltd.",
      cin: "U16222DL2025PTC459465",
      website: "www.reviranexgen.com",
      email: "info@reviranexgen.com",
      headOfficeAddress: "28, E2 Block, Shivram Park Nangloi Delhi - 110041",
      workshopAddress: "Flat No. 302, 3rd Floor Rajat Residency, Subharambha Society Near Toll Naka, Dabha, Nagpur 440023",
    },
  });

  const { data: branding, isLoading } = useQuery<Branding>({
    queryKey: ["/api/branding"],
  });

  useEffect(() => {
    if (branding) {
      form.reset({
        entityName: branding.entityName,
        cin: branding.cin,
        website: branding.website,
        email: branding.email,
        headOfficeAddress: branding.headOfficeAddress,
        workshopAddress: branding.workshopAddress,
      });
    }
  }, [branding, form]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      const res = await apiRequest("PUT", "/api/branding", {
        ...branding,
        ...data,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branding"] });
      toast({
        title: "Settings updated",
        description: "Your company registry data has been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SettingsFormData) => {
    updateSettingsMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <LayoutShell user={user}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#da2032]"></div>
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell user={user}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-[#da2032] text-white shadow-lg">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
                <p className="text-sm text-slate-500">Manage company registry information</p>
              </div>
            </div>
            
            <Button
              type="submit"
              disabled={updateSettingsMutation.isPending}
              className="bg-[#da2032] hover:bg-[#c41b2b]"
              data-testid="button-save-settings"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateSettingsMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Company Registry Data Core
              </CardTitle>
              <CardDescription>Company registration and legal information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="entityName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entity Registered Identity</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Revira NexGen Structure Pvt. Ltd."
                          data-testid="input-entity-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Universal Digital Hub (Website)
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="www.reviranexgen.com"
                          data-testid="input-website"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="cin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Corporate Registration (CIN)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="U16222DL2025PTC459465"
                          data-testid="input-cin"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Master Digital Channel (Email)
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="info@reviranexgen.com"
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="workshopAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Nagpur Regional Hub
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Flat No. 302, 3rd Floor Rajat Residency, Subharambha Society Near Toll Naka, Dabha, Nagpur 440023"
                          rows={3}
                          data-testid="input-nagpur-address"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="headOfficeAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Delhi Strategic H.O.
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="28, E2 Block, Shivram Park Nangloi Delhi - 110041"
                          rows={3}
                          data-testid="input-delhi-address"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </LayoutShell>
  );
}
