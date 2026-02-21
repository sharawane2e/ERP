import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@shared/routes";
import { useLogin, useUser } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Branding } from "@shared/schema";

// Extend the API schema to handle form state
const loginSchema = api.auth.login.input;
type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading: isUserLoading } = useUser();
  const { mutate: login, isPending } = useLogin();
  
  const { data: branding } = useQuery<Branding>({
    queryKey: ["/api/branding/public"],
    staleTime: 5 * 60 * 1000,
  });

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  useEffect(() => {
    if (user) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  function onSubmit(data: LoginFormValues) {
    login(data);
  }

  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // If already logged in, show nothing while redirect happens
  if (user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          {branding?.logoUrl ? (
            <img 
              src={branding.logoUrl} 
              alt="Company Logo" 
              className="h-16 max-w-[280px] object-contain"
              data-testid="img-login-logo"
            />
          ) : (
            <h1 className="font-display font-bold text-3xl text-slate-900">REVIRAAPP</h1>
          )}
        </div>

        {/* Welcome Text */}
        <div className="text-center mb-8">
          <h2 className="font-display font-bold text-2xl text-slate-900">Welcome Back</h2>
          <p className="text-slate-500 mt-2">Please enter your details to sign in.</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-medium">Email Address</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="admin@reviranexgen.com" 
                      className="h-12 rounded-xl border-slate-300 focus:border-slate-900 transition-all" 
                      data-testid="input-username"
                      {...field} 
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
                  <FormLabel className="text-slate-700 font-medium">Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="••••••••" 
                      className="h-12 rounded-xl border-slate-300 focus:border-slate-900 transition-all" 
                      data-testid="input-password"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              disabled={isPending}
              className="w-full h-12 rounded-xl text-base font-semibold bg-[#da2032] hover:bg-[#c41b2b] text-white transition-all duration-300"
              data-testid="button-login"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </Form>

        <div className="mt-8 pt-6 border-t border-slate-200 text-center">
          <p className="text-sm text-slate-500">
            Don't have an account?{" "}
            <span className="font-medium text-slate-900">
              Contact Support
            </span>
          </p>
        </div>
      </div>
      
      {/* Footer Credentials Hint (Development Only) */}
      <div className="fixed bottom-4 right-4 bg-slate-900/90 text-slate-300 p-4 rounded-lg backdrop-blur text-xs hidden lg:block shadow-xl">
        <p className="font-bold text-white mb-1">Demo Credentials:</p>
        <p>User: admin@reviranexgen.com</p>
        <p>Pass: Admin@121</p>
      </div>
    </div>
  );
}
