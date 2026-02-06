import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  useAPIKey, 
  useSaveAPIKey, 
  useTestAPIKey, 
  useDeleteAPIKey 
} from '@/hooks/useAICopywriting';
import { 
  Key, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  AlertTriangle,
  ExternalLink,
  Shield,
  Trash2,
  RefreshCw
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { formatDistanceToNow } from 'date-fns';

interface APIKeySettingsProps {
  showSetupPrompt?: boolean;
}

export function APIKeySettings({ showSetupPrompt = false }: APIKeySettingsProps) {
  const { data: apiKey, isLoading } = useAPIKey();
  const saveKey = useSaveAPIKey();
  const testKey = useTestAPIKey();
  const deleteKey = useDeleteAPIKey();
  
  const [newKey, setNewKey] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const handleSaveKey = async () => {
    if (!newKey.startsWith('sk-')) {
      return;
    }
    
    await saveKey.mutateAsync(newKey);
    setNewKey('');
    setShowAddDialog(false);
  };

  const handleTestKey = async () => {
    await testKey.mutateAsync();
  };

  const handleDeleteKey = async () => {
    await deleteKey.mutateAsync();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  // No key configured
  if (!apiKey) {
    return (
      <Card className={showSetupPrompt ? 'border-primary' : ''}>
        <CardHeader>
          <div className="mx-auto mb-4 p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full w-fit">
            <AlertTriangle className="h-8 w-8 text-amber-600" />
          </div>
          <CardTitle className="text-center">OpenAI API Key Required</CardTitle>
          <CardDescription className="text-center">
            To use AI copywriting features, you need your own OpenAI API key.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium">Why your own key?</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• You pay OpenAI directly (~$2-5/month)</li>
              <li>• 90% cheaper than ChatGPT Plus ($20/month)</li>
              <li>• You control your spending</li>
              <li>• We never charge for AI usage</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <Key className="h-4 w-4 mr-2" />
                  Add API Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add OpenAI API Key</DialogTitle>
                  <DialogDescription>
                    Your key will be encrypted and stored securely.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="api-key">API Key</Label>
                    <Input
                      id="api-key"
                      type="password"
                      placeholder="sk-..."
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                    />
                    {newKey && !newKey.startsWith('sk-') && (
                      <p className="text-sm text-destructive">
                        API key must start with "sk-"
                      </p>
                    )}
                  </div>
                  <Button 
                    onClick={handleSaveKey}
                    disabled={!newKey.startsWith('sk-') || saveKey.isPending}
                    className="w-full"
                  >
                    {saveKey.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Encrypting and testing...
                      </>
                    ) : (
                      'Save & Test Key'
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  How to Get a Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Getting an OpenAI API Key</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <ol className="list-decimal list-inside space-y-3 text-sm">
                    <li>
                      Go to{' '}
                      <a 
                        href="https://platform.openai.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        platform.openai.com
                      </a>
                    </li>
                    <li>Sign up or log in to your OpenAI account</li>
                    <li>Navigate to the "API Keys" section</li>
                    <li>Click "Create new secret key"</li>
                    <li>Copy the key (it starts with "sk-")</li>
                    <li>Paste it in the form above</li>
                  </ol>
                  <Alert>
                    <AlertDescription>
                      Make sure to copy the key immediately - OpenAI only shows it once!
                    </AlertDescription>
                  </Alert>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Key configured
  const isValid = apiKey.key_status === 'valid';
  const lastTested = apiKey.last_tested 
    ? formatDistanceToNow(new Date(apiKey.last_tested), { addSuffix: true })
    : 'never';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isValid ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            API Key {isValid ? 'Connected' : 'Invalid'}
          </CardTitle>
          <CardDescription>
            Your OpenAI API key for generating copy
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status:</span>
              <span className={isValid ? 'text-green-500' : 'text-destructive'}>
                {isValid ? 'Valid' : 'Invalid'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Last tested:</span>
              <span>{lastTested}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestKey}
              disabled={testKey.isPending}
            >
              {testKey.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Test Connection
            </Button>

            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Key className="h-4 w-4 mr-2" />
                  Update Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Update API Key</DialogTitle>
                  <DialogDescription>
                    Enter your new OpenAI API key.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="api-key-update">New API Key</Label>
                    <Input
                      id="api-key-update"
                      type="password"
                      placeholder="sk-..."
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={handleSaveKey}
                    disabled={!newKey.startsWith('sk-') || saveKey.isPending}
                    className="w-full"
                  >
                    {saveKey.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save & Test'
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Key
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove API Key?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You won't be able to generate copy until you add a new key.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDeleteKey}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Security Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Your key is encrypted before storage</li>
            <li>• We never log or share your key</li>
            <li>• Key is only decrypted when generating copy</li>
            <li>• You can remove it anytime</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
