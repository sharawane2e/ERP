import { useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, UseFormReturn } from "react-hook-form";
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
  Palette, 
  Building2, 
  Globe, 
  Mail, 
  MapPin,
  Upload,
  Image as ImageIcon,
  FileImage,
  Stamp
} from "lucide-react";
import { LayoutShell } from "@/components/layout-shell";
import { useUser } from "@/hooks/use-auth";
import { insertBrandingSchema, type Branding } from "@shared/schema";

const brandingFormSchema = insertBrandingSchema.extend({
  logoUrl: z.string().min(1, "Logo URL is required").max(500000, "Logo data too large"),
  headerUrl: z.string().min(1, "Header URL is required").max(500000, "Header data too large"),
  footerUrl: z.string().min(1, "Footer URL is required").max(500000, "Footer data too large"),
  stampUrl: z.string().min(1, "Stamp URL is required").max(500000, "Stamp data too large"),
  storeKeeperSignUrl: z.string().max(500000, "Store Keeper signature data too large"),
  qcEnggSignUrl: z.string().max(500000, "Qc Engg. signature data too large"),
  storeInchargeSignUrl: z.string().max(500000, "Store Incharge signature data too large"),
  plantHeadSignUrl: z.string().max(500000, "Plant Head signature data too large"),
  primaryColor: z.string().min(4, "Primary color is required").regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color"),
  secondaryColor: z.string().min(4, "Secondary color is required").regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color"),
  email: z.string().email("Valid email is required"),
});

type BrandingFormData = z.infer<typeof brandingFormSchema>;

export default function BrandingPage() {
  const { toast } = useToast();
  const { data: user } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const form = useForm<BrandingFormData>({
    resolver: zodResolver(brandingFormSchema),
    defaultValues: {
      logoUrl: "https://reviranexgen.com/assets/logo-with-name.png",
      headerUrl: "https://reviranexgen.com/assets/header.jpg",
      footerUrl: "https://reviranexgen.com/assets/footer.jpg",
      stampUrl: "https://reviranexgen.com/assets/stamp.png",
      storeKeeperSignUrl: "",
      qcEnggSignUrl: "",
      storeInchargeSignUrl: "",
      plantHeadSignUrl: "",
      primaryColor: "#da2032",
      secondaryColor: "#2f3591",
      entityName: "Revira NexGen Structure Pvt. Ltd.",
      cin: "U16222DL2025PTC459465",
      companyGstin: "07AAPCR3026H1ZA",
      website: "www.reviranexgen.com",
      email: "info@reviranexgen.com",
      headOfficeAddress: "28, E2 Block, Shivram Park Nangloi Delhi - 110041",
      workshopAddress: "Flat No. 302, 3rd Floor Rajat Residency, Subharambha Society Near Toll Naka, Dabha, Nagpur 440023",
    },
  });

  const { data: branding, isLoading } = useQuery<Branding>({
    queryKey: ["/revira/api/branding"],
  });

  useEffect(() => {
    if (branding) {
      form.reset({
        logoUrl: branding.logoUrl,
        headerUrl: branding.headerUrl,
        footerUrl: branding.footerUrl,
        stampUrl: branding.stampUrl,
        storeKeeperSignUrl: branding.storeKeeperSignUrl || "",
        qcEnggSignUrl: branding.qcEnggSignUrl || "",
        storeInchargeSignUrl: branding.storeInchargeSignUrl || "",
        plantHeadSignUrl: branding.plantHeadSignUrl || "",
        primaryColor: branding.primaryColor,
        secondaryColor: branding.secondaryColor,
        entityName: branding.entityName,
        cin: branding.cin,
        companyGstin: branding.companyGstin,
        website: branding.website,
        email: branding.email,
        headOfficeAddress: branding.headOfficeAddress,
        workshopAddress: branding.workshopAddress,
      });
    }
  }, [branding, form]);

  const updateBrandingMutation = useMutation({
    mutationFn: async (data: BrandingFormData) => {
      const res = await apiRequest("PUT", "/revira/api/branding", data);
      return res.json();
    },
    onSuccess: (updated: Branding) => {
      form.reset({
        logoUrl: updated.logoUrl,
        headerUrl: updated.headerUrl,
        footerUrl: updated.footerUrl,
        stampUrl: updated.stampUrl,
        storeKeeperSignUrl: updated.storeKeeperSignUrl || "",
        qcEnggSignUrl: updated.qcEnggSignUrl || "",
        storeInchargeSignUrl: updated.storeInchargeSignUrl || "",
        plantHeadSignUrl: updated.plantHeadSignUrl || "",
        primaryColor: updated.primaryColor,
        secondaryColor: updated.secondaryColor,
        entityName: updated.entityName,
        cin: updated.cin,
        companyGstin: updated.companyGstin,
        website: updated.website,
        email: updated.email,
        headOfficeAddress: updated.headOfficeAddress,
        workshopAddress: updated.workshopAddress,
      });
      queryClient.invalidateQueries({ queryKey: ["/revira/api/branding"] });
      toast({
        title: "Branding updated",
        description: "Your branding settings have been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update branding",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BrandingFormData) => {
    updateBrandingMutation.mutate(data);
  };


  if (isLoading) {
    return (
      <LayoutShell user={user}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </LayoutShell>
    );
  }

  const logoUrl = form.watch("logoUrl");
  const headerUrl = form.watch("headerUrl");
  const footerUrl = form.watch("footerUrl");
  const stampUrl = form.watch("stampUrl");
  const storeKeeperSignUrl = form.watch("storeKeeperSignUrl");
  const qcEnggSignUrl = form.watch("qcEnggSignUrl");
  const storeInchargeSignUrl = form.watch("storeInchargeSignUrl");
  const plantHeadSignUrl = form.watch("plantHeadSignUrl");
  const primaryColor = form.watch("primaryColor");
  const secondaryColor = form.watch("secondaryColor");

  const handleImageUpload = (fieldName: keyof BrandingFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload an image smaller than 500KB",
          variant: "destructive",
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        form.setValue(fieldName, base64String, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <LayoutShell user={user}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg">
                <Palette className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Branding</h1>
                <p className="text-sm text-slate-500">Manage your company branding and identity</p>
              </div>
            </div>
            
            <Button
              type="submit"
              disabled={updateBrandingMutation.isPending}
              className="bg-gradient-to-r from-primary to-primary/90"
              data-testid="button-save-branding"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateBrandingMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Company Logo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Company Logo
                </CardTitle>
                <CardDescription>Upload or provide a URL for your company logo (max 500KB)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-full max-w-xs h-32 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center bg-slate-50 overflow-hidden">
                    {logoUrl ? (
                      <img 
                        src={logoUrl} 
                        alt="Company Logo" 
                        className="max-h-full max-w-full object-contain p-2"
                        data-testid="img-logo-preview"
                      />
                    ) : (
                      <div className="text-slate-400 text-center">
                        <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">No logo uploaded</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="w-full space-y-3">
                    <FormField
                      control={form.control}
                      name="logoUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Logo URL</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="https://example.com/logo.png"
                              data-testid="input-logo-url"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="text-center text-sm text-slate-500">or</div>
                    
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload("logoUrl")}
                      accept="image/*"
                      className="hidden"
                      data-testid="input-logo-file"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="button-upload-logo"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Image
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Brand Colors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Brand Colors
                </CardTitle>
                <CardDescription>Set your primary and secondary brand colors</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="primaryColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Color</FormLabel>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={field.value}
                            onChange={field.onChange}
                            className="w-12 h-10 rounded border cursor-pointer"
                            data-testid="input-primary-color"
                          />
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="#da2032"
                              className="flex-1"
                              data-testid="input-primary-color-text"
                            />
                          </FormControl>
                        </div>
                        <div 
                          className="h-8 rounded-md shadow-inner" 
                          style={{ backgroundColor: primaryColor }}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="secondaryColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Secondary Color</FormLabel>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={field.value}
                            onChange={field.onChange}
                            className="w-12 h-10 rounded border cursor-pointer"
                            data-testid="input-secondary-color"
                          />
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="#2f3591"
                              className="flex-1"
                              data-testid="input-secondary-color-text"
                            />
                          </FormControl>
                        </div>
                        <div 
                          className="h-8 rounded-md shadow-inner" 
                          style={{ backgroundColor: secondaryColor }}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Document Assets */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileImage className="w-5 h-5" />
                  Document Assets
                </CardTitle>
                <CardDescription>Header, footer, and stamp images for documents (max 500KB each)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Header Image */}
                  <div className="space-y-3">
                    <div className="w-full h-24 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center bg-slate-50 overflow-hidden">
                      {headerUrl ? (
                        <img 
                          src={headerUrl} 
                          alt="Header" 
                          className="max-h-full max-w-full object-contain"
                          data-testid="img-header-preview"
                        />
                      ) : (
                        <div className="text-slate-400 text-center text-sm">
                          <FileImage className="w-6 h-6 mx-auto mb-1" />
                          No header
                        </div>
                      )}
                    </div>
                    <FormField
                      control={form.control}
                      name="headerUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Header Image</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="https://example.com/header.jpg"
                              data-testid="input-header-url"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <input
                      type="file"
                      id="header-file"
                      onChange={handleImageUpload("headerUrl")}
                      accept="image/*"
                      className="hidden"
                      data-testid="input-header-file"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => document.getElementById("header-file")?.click()}
                      data-testid="button-upload-header"
                    >
                      <Upload className="w-3 h-3 mr-2" />
                      Upload Header
                    </Button>
                  </div>

                  {/* Footer Image */}
                  <div className="space-y-3">
                    <div className="w-full h-24 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center bg-slate-50 overflow-hidden">
                      {footerUrl ? (
                        <img 
                          src={footerUrl} 
                          alt="Footer" 
                          className="max-h-full max-w-full object-contain"
                          data-testid="img-footer-preview"
                        />
                      ) : (
                        <div className="text-slate-400 text-center text-sm">
                          <FileImage className="w-6 h-6 mx-auto mb-1" />
                          No footer
                        </div>
                      )}
                    </div>
                    <FormField
                      control={form.control}
                      name="footerUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Footer Image</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="https://example.com/footer.jpg"
                              data-testid="input-footer-url"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <input
                      type="file"
                      id="footer-file"
                      onChange={handleImageUpload("footerUrl")}
                      accept="image/*"
                      className="hidden"
                      data-testid="input-footer-file"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => document.getElementById("footer-file")?.click()}
                      data-testid="button-upload-footer"
                    >
                      <Upload className="w-3 h-3 mr-2" />
                      Upload Footer
                    </Button>
                  </div>

                  {/* Stamp & Signature */}
                  <div className="space-y-3">
                    <div className="w-full h-24 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center bg-slate-50 overflow-hidden">
                      {stampUrl ? (
                        <img 
                          src={stampUrl} 
                          alt="Stamp & Signature" 
                          className="max-h-full max-w-full object-contain"
                          data-testid="img-stamp-preview"
                        />
                      ) : (
                        <div className="text-slate-400 text-center text-sm">
                          <Stamp className="w-6 h-6 mx-auto mb-1" />
                          No stamp
                        </div>
                      )}
                    </div>
                    <FormField
                      control={form.control}
                      name="stampUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Stamp & Signature</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="https://example.com/stamp.png"
                              data-testid="input-stamp-url"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <input
                      type="file"
                      id="stamp-file"
                      onChange={handleImageUpload("stampUrl")}
                      accept="image/*"
                      className="hidden"
                      data-testid="input-stamp-file"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => document.getElementById("stamp-file")?.click()}
                      data-testid="button-upload-stamp"
                    >
                      <Upload className="w-3 h-3 mr-2" />
                      Upload Stamp
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileImage className="w-5 h-5" />
                  Signatures
                </CardTitle>
                <CardDescription>Upload signature images for Gate Pass roles (max 500KB each)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-3">
                    <div className="w-full h-24 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center bg-slate-50 overflow-hidden">
                      {storeKeeperSignUrl ? (
                        <img src={storeKeeperSignUrl} alt="Store Keeper Signature" className="max-h-full max-w-full object-contain" data-testid="img-store-keeper-sign-preview" />
                      ) : (
                        <div className="text-slate-400 text-center text-sm">
                          <FileImage className="w-6 h-6 mx-auto mb-1" />
                          No signature
                        </div>
                      )}
                    </div>
                    <FormField
                      control={form.control}
                      name="storeKeeperSignUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Store Keeper</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Signature URL" data-testid="input-store-keeper-sign-url" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <input type="file" id="store-keeper-sign-file" onChange={handleImageUpload("storeKeeperSignUrl")} accept="image/*" className="hidden" data-testid="input-store-keeper-sign-file" />
                    <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => document.getElementById("store-keeper-sign-file")?.click()} data-testid="button-upload-store-keeper-sign">
                      <Upload className="w-3 h-3 mr-2" />
                      Upload
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div className="w-full h-24 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center bg-slate-50 overflow-hidden">
                      {qcEnggSignUrl ? (
                        <img src={qcEnggSignUrl} alt="Qc Engg. Signature" className="max-h-full max-w-full object-contain" data-testid="img-qc-engg-sign-preview" />
                      ) : (
                        <div className="text-slate-400 text-center text-sm">
                          <FileImage className="w-6 h-6 mx-auto mb-1" />
                          No signature
                        </div>
                      )}
                    </div>
                    <FormField
                      control={form.control}
                      name="qcEnggSignUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Qc Engg.</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Signature URL" data-testid="input-qc-engg-sign-url" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <input type="file" id="qc-engg-sign-file" onChange={handleImageUpload("qcEnggSignUrl")} accept="image/*" className="hidden" data-testid="input-qc-engg-sign-file" />
                    <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => document.getElementById("qc-engg-sign-file")?.click()} data-testid="button-upload-qc-engg-sign">
                      <Upload className="w-3 h-3 mr-2" />
                      Upload
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div className="w-full h-24 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center bg-slate-50 overflow-hidden">
                      {storeInchargeSignUrl ? (
                        <img src={storeInchargeSignUrl} alt="Store Incharge Signature" className="max-h-full max-w-full object-contain" data-testid="img-store-incharge-sign-preview" />
                      ) : (
                        <div className="text-slate-400 text-center text-sm">
                          <FileImage className="w-6 h-6 mx-auto mb-1" />
                          No signature
                        </div>
                      )}
                    </div>
                    <FormField
                      control={form.control}
                      name="storeInchargeSignUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Store Incharge</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Signature URL" data-testid="input-store-incharge-sign-url" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <input type="file" id="store-incharge-sign-file" onChange={handleImageUpload("storeInchargeSignUrl")} accept="image/*" className="hidden" data-testid="input-store-incharge-sign-file" />
                    <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => document.getElementById("store-incharge-sign-file")?.click()} data-testid="button-upload-store-incharge-sign">
                      <Upload className="w-3 h-3 mr-2" />
                      Upload
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div className="w-full h-24 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center bg-slate-50 overflow-hidden">
                      {plantHeadSignUrl ? (
                        <img src={plantHeadSignUrl} alt="Plant Head Signature" className="max-h-full max-w-full object-contain" data-testid="img-plant-head-sign-preview" />
                      ) : (
                        <div className="text-slate-400 text-center text-sm">
                          <FileImage className="w-6 h-6 mx-auto mb-1" />
                          No signature
                        </div>
                      )}
                    </div>
                    <FormField
                      control={form.control}
                      name="plantHeadSignUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Plant Head</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Signature URL" data-testid="input-plant-head-sign-url" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <input type="file" id="plant-head-sign-file" onChange={handleImageUpload("plantHeadSignUrl")} accept="image/*" className="hidden" data-testid="input-plant-head-sign-file" />
                    <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => document.getElementById("plant-head-sign-file")?.click()} data-testid="button-upload-plant-head-sign">
                      <Upload className="w-3 h-3 mr-2" />
                      Upload
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Registry Data Core */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Registry Data Core
                </CardTitle>
                <CardDescription>Company registration and legal information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    name="companyGstin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company GST No.</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="07AAPCR3026H1ZA"
                            data-testid="input-company-gstin"
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
                </div>
              </CardContent>
            </Card>

            {/* Addresses */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Locations
                </CardTitle>
                <CardDescription>Head office and workshop addresses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="headOfficeAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Head Office (H.O)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="28, E2 Block, Shivram Park Nangloi Delhi - 110041"
                            rows={3}
                            data-testid="input-head-office-address"
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
                        <FormLabel>Workshop</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Flat No. 302, 3rd Floor Rajat Residency..."
                            rows={3}
                            data-testid="input-workshop-address"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </Form>
    </LayoutShell>
  );
}
