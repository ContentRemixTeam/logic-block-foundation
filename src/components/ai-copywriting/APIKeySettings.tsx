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

export function APIKeySettings({ showSetupPrompt = false }: APIKeySettingsProps) {
  const { data: apiKey, isLoading } = useAPIKey();
  const saveKey = useSaveAPIKey();
  const testKey = useTestAPIKey();
  const deleteKey = useDeleteAPIKey();
  
  const [newKey, setNewKey] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showCostInfo, setShowCostInfo] = useState(false);

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
      <div className="space-y-6">
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
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium">Why your own key?</h4>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li className="flex items-start gap-2">
                  <DollarSign className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Pay-as-you-go:</strong> Only pay for what you use (~$0.02-0.08 per email)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CreditCard className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span><strong>No markup:</strong> Pay OpenAI directly at their rates</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span><strong>You control spending:</strong> Set monthly limits in OpenAI dashboard</span>
                </li>
              </ul>
              <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-green-700 dark:text-green-300">
                  💡 Most users spend $2-10/month
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  That's 90% cheaper than ChatGPT Plus ($20/month) or Jasper AI ($49/month)
                </p>
              </div>
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
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Getting an OpenAI API Key</DialogTitle>
                    <DialogDescription>
                      Follow these steps to set up your API key
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-5 py-4">
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">1</div>
                        <div>
                          <p className="font-medium text-sm">Create an OpenAI Account</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Go to{' '}
                            <a 
                              href="https://platform.openai.com" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              platform.openai.com
                            </a>
                            {' '}and sign up (free)
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">2</div>
                        <div>
                          <p className="font-medium text-sm">Add a Payment Method</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Click your profile → <strong>Billing</strong> → Add a credit card.
                            Start with $10-20 credit.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">3</div>
                        <div>
                          <p className="font-medium text-sm">Set a Spending Limit (Recommended)</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Go to <strong>Usage → Limits</strong> and set a monthly budget.
                            We recommend $10-20/month to start.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">4</div>
                        <div>
                          <p className="font-medium text-sm">Create Your API Key</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Go to{' '}
                            <a 
                              href="https://platform.openai.com/api-keys" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              API Keys
                            </a>
                            {' '}→ Click "Create new secret key" → Name it "90 Day Planner"
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">5</div>
                        <div>
                          <p className="font-medium text-sm">Copy & Paste Your Key</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Copy the key (starts with "sk-") and paste it above.
                          </p>
                        </div>
                      </div>
                    </div>

                    <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-700 dark:text-amber-300">
                        <strong>Important:</strong> Copy your key immediately! OpenAI only shows it once.
                      </AlertDescription>
                    </Alert>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* What Will It Cost Section */}
        <Card>
          <Collapsible open={showCostInfo} onOpenChange={setShowCostInfo}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <DollarSign className="h-4 w-4" />
                    What will it cost?
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
              <CardContent className="space-y-4 pt-0">
                <div className="space-y-3">
                  <div>
                    <h5 className="text-sm font-medium mb-2">Cost per generation (GPT-4o):</h5>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-muted/50 rounded p-2">
                        <p className="text-muted-foreground">Single email</p>
                        <p className="font-medium">$0.02-0.05</p>
                      </div>
                      <div className="bg-muted/50 rounded p-2">
                        <p className="text-muted-foreground">5-email sequence</p>
                        <p className="font-medium">$0.15-0.25</p>
                      </div>
                      <div className="bg-muted/50 rounded p-2">
                        <p className="text-muted-foreground">Social post</p>
                        <p className="font-medium">$0.01-0.03</p>
                      </div>
                      <div className="bg-muted/50 rounded p-2">
                        <p className="text-muted-foreground">Voice analysis</p>
                        <p className="font-medium">$0.01-0.02</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h5 className="text-sm font-medium mb-2">Monthly estimates:</h5>
                    <ul className="text-sm space-y-1.5">
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Light use (10 generations)</span>
                        <span className="font-medium text-green-600">$0.50-1.00</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Regular use (30 generations)</span>
                        <span className="font-medium text-green-600">$1.50-3.00</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Heavy use (100+ generations)</span>
                        <span className="font-medium text-green-600">$5.00-15.00</span>
                      </li>
                    </ul>
                  </div>

                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      💡 <strong>Tip:</strong> Set a spending limit in OpenAI (Usage → Limits) to control your costs. We recommend $10-20/month to start.
                    </p>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </div>
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

      {/* Cost Information for configured users */}
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
                Set a spending limit in OpenAI: Usage → Limits. We recommend $10-20/month to start.
              </p>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}
