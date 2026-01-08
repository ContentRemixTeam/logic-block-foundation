import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AuthLogo } from '@/components/auth/AuthLogo';
import { Mail, ArrowLeft, Key, RefreshCw, AlertCircle, HelpCircle } from 'lucide-react';

export default function LoginHelp() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-6">
        <AuthLogo />
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Need Help Logging In?
            </CardTitle>
            <CardDescription>
              We're here to help you access your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Contact Info */}
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
              <h3 className="font-semibold flex items-center gap-2 mb-2">
                <Mail className="h-4 w-4 text-primary" />
                Contact Support
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                If you're still having trouble, reach out to us directly:
              </p>
              <a 
                href="mailto:info@faithmariah.com" 
                className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
              >
                info@faithmariah.com
              </a>
            </div>

            {/* Troubleshooting Steps */}
            <div className="space-y-4">
              <h3 className="font-semibold">Common Issues & Solutions</h3>
              
              <div className="space-y-3">
                <div className="flex gap-3">
                  <Key className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Forgot your password?</p>
                    <p className="text-sm text-muted-foreground">
                      Use the "Forgot your password?" link on the sign-in page to reset it via email.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <RefreshCw className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Not receiving emails?</p>
                    <p className="text-sm text-muted-foreground">
                      Check your spam/junk folder. Add info@faithmariah.com to your contacts and try again.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">"Invalid credentials" error?</p>
                    <p className="text-sm text-muted-foreground">
                      Double-check your email address is correct. Try resetting your password if you're unsure.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Can't remember which email you used?</p>
                    <p className="text-sm text-muted-foreground">
                      Try your most common email addresses. If you still can't find it, contact us at info@faithmariah.com.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <HelpCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Signed up with Google?</p>
                    <p className="text-sm text-muted-foreground">
                      Use the "Continue with Google" button instead of email/password to sign in.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Button variant="outline" className="w-full" asChild>
              <Link to="/auth">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sign In
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
