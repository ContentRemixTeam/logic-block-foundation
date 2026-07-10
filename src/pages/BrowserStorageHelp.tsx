import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, HardDrive, Smartphone, Monitor, AlertTriangle, Lock, Wifi, FileSpreadsheet } from 'lucide-react';
import { Layout } from '@/components/Layout';

export default function BrowserStorageHelp() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to="/support">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Support
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Browser Storage &amp; Offline Data
            </CardTitle>
            <CardDescription>
              What that "Heads up about your browser" message means and how to fix it in plain English.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-sm">
            <section className="space-y-2">
              <h2 className="font-semibold text-base">What happened?</h2>
              <p className="text-muted-foreground">
                Your browser didn't give us permission to <strong>permanently save</strong> a small
                local backup on this device. Everything will still work — but if your phone or laptop
                runs low on space, the browser <em>could</em> clear out drafts that were held on-device
                during a connection blip.
              </p>
              <p className="text-muted-foreground">
                Your saved tasks, plans, and notes in the cloud are <strong>always safe</strong>. This
                just makes your work extra-protected on this specific device if your connection drops
                mid-edit.
              </p>
            </section>

            <section className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex gap-3">
              <FileSpreadsheet className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-medium">Looking for Google Drive planner storage?</p>
                <p className="text-muted-foreground text-xs">
                  Browser storage protects offline drafts on this device. Google Drive storage creates a private planner Sheet for backup and the new storage rollout.
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/help/planner-storage">Open planner storage help</Link>
                </Button>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="font-semibold text-base flex items-center gap-2">
                <Smartphone className="h-4 w-4" /> Fix it on iPhone or iPad
              </h2>
              <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                <li>Open this planner in <strong>Safari</strong> (not Chrome or an in-app browser like Instagram).</li>
                <li>Tap the <strong>Share</strong> button (square with an arrow at the bottom).</li>
                <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                <li>Open the planner from the new icon on your Home Screen — that version gets persistent storage.</li>
              </ol>
            </section>

            <section className="space-y-3">
              <h2 className="font-semibold text-base flex items-center gap-2">
                <Smartphone className="h-4 w-4" /> Fix it on Android
              </h2>
              <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                <li>Open the planner in <strong>Chrome</strong>.</li>
                <li>Tap the <strong>⋮</strong> menu in the top-right.</li>
                <li>Tap <strong>Install app</strong> or <strong>Add to Home Screen</strong>.</li>
                <li>Launch the planner from the new icon.</li>
              </ol>
            </section>

            <section className="space-y-3">
              <h2 className="font-semibold text-base flex items-center gap-2">
                <Monitor className="h-4 w-4" /> Fix it on Desktop (Mac / Windows)
              </h2>
              <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                <li>Use <strong>Chrome</strong>, <strong>Edge</strong>, or <strong>Safari 17+</strong>.</li>
                <li>Look for the <strong>install icon</strong> in the address bar (a small monitor/computer icon, usually on the right).</li>
                <li>Click it and choose <strong>Install</strong>.</li>
              </ol>
            </section>

            <section className="space-y-2">
              <h2 className="font-semibold text-base flex items-center gap-2">
                <Lock className="h-4 w-4" /> Are you in Private / Incognito mode?
              </h2>
              <p className="text-muted-foreground">
                Private windows automatically wipe everything when you close them. Use a regular browser
                window for daily planning.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-semibold text-base flex items-center gap-2">
                <Wifi className="h-4 w-4" /> Did you open from a link inside Instagram, Facebook, or TikTok?
              </h2>
              <p className="text-muted-foreground">
                Those apps use a stripped-down browser that blocks persistent storage. Tap the <strong>⋮</strong> or{' '}
                <strong>⋯</strong> menu inside the app and choose <strong>Open in Safari / Chrome</strong>.
              </p>
            </section>

            <section className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium">Still seeing the warning?</p>
                <p className="text-muted-foreground text-xs">
                  You can keep using the planner safely — your data syncs to the cloud the moment you're
                  online. If you'd like help, email <a className="underline text-primary" href="mailto:info@faithmariah.com">info@faithmariah.com</a>.
                </p>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
