import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileSpreadsheet,
  HelpCircle,
  Mail,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

const troubleshootingItems = [
  {
    title: 'Google opens the wrong account',
    detail: 'Sign out of the extra Google account in that browser, or open the setup link in the browser where the correct Drive account is already active.',
  },
  {
    title: 'Google says permission was denied',
    detail: 'Start the connection again and approve the requested Google permissions. The planner needs permission to create and update your planner Sheet.',
  },
  {
    title: 'The app says Google is connected but no Sheet exists',
    detail: 'Go back to setup and click Create my planner Sheet. Connecting Google and creating the planner Sheet are two separate steps.',
  },
  {
    title: 'The Sheet was created but setup still says it needs attention',
    detail: 'Click Check again or Refresh. If it still fails, leave the Sheet in Drive and contact support before deleting anything.',
  },
  {
    title: 'A task says Google backup is pending',
    detail: 'Your task is still saved in the app. Open Settings, find Planner Data Storage, and click Retry backup once you are online.',
  },
  {
    title: 'You are using a private window or an in-app browser',
    detail: 'Use a normal Safari, Chrome, or Edge window. Instagram, Facebook, TikTok, and private browsers can block the storage checks the app relies on.',
  },
];

export default function PlannerStorageHelp() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" size="sm" asChild className="w-fit">
            <Link to={user ? '/dashboard' : '/auth'}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {user ? 'Back to app' : 'Back to sign in'}
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="w-fit gap-2">
            <a href="mailto:info@faithmariah.com">
              <Mail className="h-4 w-4" />
              Contact support
            </a>
          </Button>
        </div>

        <Card className="border-primary/20">
          <CardHeader>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <CardTitle className="text-3xl">Google Drive planner storage</CardTitle>
            <CardDescription className="text-base">
              Boss Planner creates a private Google Sheet in your Drive so your planner data has a customer-owned storage layer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertTitle>New accounts set this up first</AlertTitle>
              <AlertDescription>
                New users connect Google and create a planner Sheet before entering the app. Existing users can turn this on from Settings.
              </AlertDescription>
            </Alert>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border p-4">
                <CheckCircle2 className="mb-3 h-5 w-5 text-primary" />
                <h2 className="font-semibold">Connect Google</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Approve the Google permission screen using the Drive account where you want the planner Sheet to live.
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <FileSpreadsheet className="mb-3 h-5 w-5 text-primary" />
                <h2 className="font-semibold">Create the Sheet</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  The app creates the tabs and protected system rows. You do not need to build the Sheet manually.
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <RefreshCw className="mb-3 h-5 w-5 text-primary" />
                <h2 className="font-semibold">Let backup verify</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  The app starts in safe mode while it checks that Google backup is working.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What lives in Google Drive?</CardTitle>
            <CardDescription>
              The planner Sheet is a private spreadsheet owned by the Google account you connect.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              The rollout starts with task storage and backup. Other planner sections stay in protected app storage until their Sheet tabs are activated.
            </p>
            <p>
              Do not edit hidden system tabs, protected header rows, or rows that start with an underscore. Normal planner work should happen inside the app.
            </p>
            <p>
              Do not put passwords, payment details, or private customer information in the planner Sheet.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Troubleshooting
            </CardTitle>
            <CardDescription>Use these first when setup or backup feels stuck.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {troubleshootingItems.map((item) => (
              <div key={item.title} className="rounded-lg border p-4">
                <h3 className="font-medium">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>When to contact support</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Do not delete the planner Sheet while troubleshooting</AlertTitle>
              <AlertDescription>
                If setup partially worked, deleting the Sheet can make support recovery harder.
              </AlertDescription>
            </Alert>
            <div className="text-sm text-muted-foreground">
              Send your account email, the Google account you connected, the exact error message, your browser/device, and whether you can see a planner Sheet in Drive.
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild className="gap-2">
                <a href="mailto:info@faithmariah.com">
                  <Mail className="h-4 w-4" />
                  Email support
                </a>
              </Button>
              {user && (
                <Button variant="outline" asChild className="gap-2">
                  <Link to="/settings">
                    Open storage settings
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
