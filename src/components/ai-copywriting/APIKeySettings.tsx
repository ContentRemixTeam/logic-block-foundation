import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  useAPIKeys, 
  useSaveAPIKey, 
  useTestAPIKey, 
  useDeleteAPIKey 
} from '@/hooks/useAICopywriting';
import { AIProvider, AI_PROVIDER_INSTRUCTIONS, AI_PROVIDER_KEY_PREFIX } from '@/types/aiProvider';
import { 
  Key, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  AlertTriangle,
  ExternalLink,
  Shield,
  Trash2,
  RefreshCw,
  DollarSign,
  ChevronDown,
  ChevronUp,
  CreditCard
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formatDistanceToNow } from 'date-fns';

interface APIKeySettingsProps {
  showSetupPrompt?: boolean;
}

function ProviderKeySection({ provider }: { provider: AIProvider }) {
  const { data: apiKeys, isLoading } = useAPIKeys();
  const saveKey = useSaveAPIKey();
  const testKey = useTestAPIKey();
  const deleteKey = useDeleteAPIKey();
  
  const [newKey, setNewKey] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const providerKey = apiKeys?.find(k => k.provider === provider);
  const instructions = AI_PROVIDER_INSTRUCTIONS[provider];
  const keyPrefix = AI_PROVIDER_KEY_PREFIX[provider];

  const isValidPrefix = newKey.startsWith(keyPrefix);

  const handleSaveKey = async () => {
    if (!isValidPrefix) return;
    await saveKey.mutateAsync({ apiKey: newKey, provider });
    setNewKey('');
    setShowAddDialog(false);
  };

  const handleTestKey = async () => {
    await testKey.mutateAsync(provider);
  };

  const handleDeleteKey = async () => {
    await deleteKey.mutateAsync(provider);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  // No key configured for this provider
  if (!providerKey) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="mx-auto mb-4 p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full w-fit">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
            <CardTitle className="text-center">{instructions.name} API Key Required</CardTitle>
            <CardDescription className="text-center">
              Add your {instructions.name} API key to use this provider for AI copywriting.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium">Why your own key?</h4>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li className="flex items-start gap-2">
                  <DollarSign className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Pay-as-you-go:</strong> Only pay for what you use</span>
                </li>
                <li className="flex items-start gap-2">
                  <CreditCard className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span><strong>No markup:</strong> Pay {instructions.name} directly</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span><strong>You control spending:</strong> Set limits in your dashboard</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <Key className="h-4 w-4 mr-2" />
                    Add {instructions.name} Key
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add {instructions.name} API Key</DialogTitle>
                    <DialogDescription>
                      Your key will be encrypted and stored securely.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor={`api-key-${provider}`}>API Key</Label>
                      <Input
                        id={`api-key-${provider}`}
                        type="password"
                        placeholder={`${keyPrefix}...`}
                        value={newKey}
                        onChange={(e) => setNewKey(e.target.value)}
                      />
                      {newKey && !isValidPrefix && (
                        <p className="text-sm text-destructive">
                          API key must start with "{keyPrefix}"
                        </p>
                      )}
                    </div>
                    <Button 
                      onClick={handleSaveKey}
                      disabled={!isValidPrefix || saveKey.isPending}
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
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Getting an {instructions.name} API Key</DialogTitle>
                    <DialogDescription>
                      Follow these steps to set up your API key
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-5 py-4">
                    <div className="space-y-4">
                      {instructions.steps.map((step, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">{i + 1}</div>
                          <div>
                            <p className="text-sm text-muted-foreground">{step}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <a 
                        href={instructions.keysUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Open {instructions.name} API Keys page
                      </a>
                    </div>
                    <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-700 dark:text-amber-300">
                        <strong>Important:</strong> Copy your key immediately! It may only be shown once.
                      </AlertDescription>
                    </Alert>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Key configured
  const isValid = providerKey.key_status === 'valid';
  const lastTested = providerKey.last_tested 
    ? formatDistanceToNow(new Date(providerKey.last_tested), { addSuffix: true })
    : 'never';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isValid ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            {instructions.name} Key {isValid ? 'Connected' : 'Invalid'}
          </CardTitle>
          <CardDescription>
            Your {instructions.name} API key for generating copy
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
                  <DialogTitle>Update {instructions.name} API Key</DialogTitle>
                  <DialogDescription>
                    Enter your new {instructions.name} API key.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor={`api-key-update-${provider}`}>New API Key</Label>
                    <Input
                      id={`api-key-update-${provider}`}
                      type="password"
                      placeholder={`${keyPrefix}...`}
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={handleSaveKey}
                    disabled={!isValidPrefix || saveKey.isPending}
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
                  <AlertDialogTitle>Remove {instructions.name} API Key?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You won't be able to generate copy with {instructions.name} until you add a new key.
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
    </div>
  );
}

export function APIKeySettings({ showSetupPrompt = false }: APIKeySettingsProps) {
  const [showCostInfo, setShowCostInfo] = useState(false);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="openai" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="openai">OpenAI (GPT-4o)</TabsTrigger>
          <TabsTrigger value="anthropic">Claude (Sonnet)</TabsTrigger>
        </TabsList>
        <TabsContent value="openai" className="mt-4">
          <ProviderKeySection provider="openai" />
        </TabsContent>
        <TabsContent value="anthropic" className="mt-4">
          <ProviderKeySection provider="anthropic" />
        </TabsContent>
      </Tabs>

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
            <li>• Your keys are encrypted before storage</li>
            <li>• We never log or share your keys</li>
            <li>• Keys are only decrypted when generating copy</li>
            <li>• You can remove them anytime</li>
          </ul>
        </CardContent>
      </Card>

      {/* Cost Information */}
      <Card>
        <Collapsible open={showCostInfo} onOpenChange={setShowCostInfo}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <DollarSign className="h-4 w-4" />
                  Cost Guide
                </CardTitle>
                {showCostInfo ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-3 pt-0">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-muted/50 rounded p-2">
                  <p className="text-muted-foreground">Single email</p>
                  <p className="font-medium">$0.02-0.05</p>
                </div>
                <div className="bg-muted/50 rounded p-2">
                  <p className="text-muted-foreground">5-email sequence</p>
                  <p className="font-medium">$0.15-0.25</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Both OpenAI and Anthropic have similar pricing. Set spending limits in your provider's dashboard.
              </p>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}
