import { useState, useEffect, useRef } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LoadingState } from '@/components/system/LoadingState';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { 
  Users, AlertTriangle, MessageSquare, Lightbulb, Shield, Trash2, UserPlus, 
  ShieldCheck, ShieldOff, RefreshCw, Upload, FileSpreadsheet, CheckCircle, 
  XCircle, AlertCircle, Download, Link2, Copy, Check
} from 'lucide-react';
import { format } from 'date-fns';

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  is_admin: boolean;
}

interface ErrorLog {
  id: string;
  user_id: string | null;
  error_type: string;
  error_message: string;
  error_stack: string | null;
  component: string | null;
  route: string | null;
  metadata: any;
  created_at: string;
}

interface IssueReport {
  id: string;
  user_id: string;
  ticket_number: string;
  title: string;
  what_trying_to_do: string;
  what_happened: string;
  page_section: string;
  severity: string;
  status: string;
  created_at: string;
}

interface FeatureRequest {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
}

interface Member {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  tier: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

interface CSVRow {
  email: string;
  first_name?: string;
  last_name?: string;
}

interface ImportResult {
  added: number;
  updated: number;
  errors: Array<{ email: string; error: string }>;
}

const SUPABASE_PROJECT_ID = 'wdxelomsouudmidakxiz';

export default function Admin() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [users, setUsers] = useState<User[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [issueReports, setIssueReports] = useState<IssueReport[]>([]);
  const [featureRequests, setFeatureRequests] = useState<FeatureRequest[]>([]);
  
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [createUserOpen, setCreateUserOpen] = useState(false);
  
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberFirstName, setNewMemberFirstName] = useState('');
  const [newMemberLastName, setNewMemberLastName] = useState('');
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  
  const [parsedRows, setParsedRows] = useState<CSVRow[]>([]);
  const [existingEmails, setExistingEmails] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState('members');

  const webhookUrls = {
    add: `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/ghl-webhook-add-member`,
    remove: `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/ghl-webhook-remove-member`,
  };

  useEffect(() => {
    checkAdminAndLoad();
  }, [user]);

  const checkAdminAndLoad = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Use the is_admin RPC function which has SECURITY DEFINER
      // This bypasses RLS and properly checks admin status
      const { data: isAdminResult, error: adminError } = await supabase
        .rpc('is_admin', { check_user_id: user.id });

      if (adminError) {
        console.error('Admin check error:', adminError);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      if (!isAdminResult) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(true);
      await loadAllData();
    } catch (err: any) {
      console.error('Admin check error:', err);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const loadAllData = async () => {
    try {
      const [usersRes, errorsRes, issuesRes, featuresRes, membersRes] = await Promise.all([
        supabase.functions.invoke('admin-get-data', { body: { action: 'get_users', limit: 100 } }),
        supabase.functions.invoke('admin-get-data', { body: { action: 'get_error_logs', limit: 100 } }),
        supabase.functions.invoke('admin-get-data', { body: { action: 'get_issue_reports', limit: 100 } }),
        supabase.functions.invoke('admin-get-data', { body: { action: 'get_feature_requests', limit: 100 } }),
        supabase.from('entitlements').select('*').order('created_at', { ascending: false }),
      ]);

      if (usersRes.data?.users) setUsers(usersRes.data.users);
      if (errorsRes.data?.error_logs) setErrorLogs(errorsRes.data.error_logs);
      if (issuesRes.data?.issue_reports) setIssueReports(issuesRes.data.issue_reports);
      if (featuresRes.data?.feature_requests) setFeatureRequests(featuresRes.data.feature_requests);
      if (membersRes.data) setMembers(membersRes.data);
      
      // Update existing emails set
      if (membersRes.data) {
        setExistingEmails(new Set(membersRes.data.map((m: Member) => m.email.toLowerCase())));
      }
    } catch (err: any) {
      console.error('Load data error:', err);
      toast.error('Failed to load admin data');
    }
  };

  const handleDeleteUser = async (targetUserId: string) => {
    if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return;
    
    try {
      const { error } = await supabase.functions.invoke('admin-get-data', {
        body: { action: 'delete_user', target_user_id: targetUserId }
      });
      
      if (error) throw error;
      toast.success('User deleted');
      setUsers(users.filter(u => u.id !== targetUserId));
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete user');
    }
  };

  const handleToggleAdmin = async (targetUserId: string, currentlyAdmin: boolean) => {
    try {
      const action = currentlyAdmin ? 'remove_admin' : 'add_admin';
      const { error } = await supabase.functions.invoke('admin-get-data', {
        body: { action, target_user_id: targetUserId }
      });
      
      if (error) throw error;
      toast.success(currentlyAdmin ? 'Admin removed' : 'Admin added');
      setUsers(users.map(u => u.id === targetUserId ? { ...u, is_admin: !currentlyAdmin } : u));
    } catch (err: any) {
      toast.error(err.message || 'Failed to update admin status');
    }
  };

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword) {
      toast.error('Email and password are required');
      return;
    }
    
    try {
      const { error } = await supabase.functions.invoke('admin-get-data', {
        body: { action: 'create_user', email: newUserEmail, password: newUserPassword }
      });
      
      if (error) throw error;
      toast.success('User created');
      setCreateUserOpen(false);
      setNewUserEmail('');
      setNewUserPassword('');
      await loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create user');
    }
  };

  // Member management
  const handleAddMember = async () => {
    if (!newMemberEmail) {
      toast.error('Email is required');
      return;
    }
    
    try {
      const { error } = await supabase.from('entitlements').upsert({
        email: newMemberEmail.toLowerCase().trim(),
        first_name: newMemberFirstName || null,
        last_name: newMemberLastName || null,
        tier: 'mastermind',
        status: 'active',
        starts_at: new Date().toISOString().split('T')[0],
      }, { onConflict: 'email' });
      
      if (error) throw error;
      toast.success('Member added');
      setAddMemberOpen(false);
      setNewMemberEmail('');
      setNewMemberFirstName('');
      setNewMemberLastName('');
      await loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (memberId: string, email: string) => {
    if (!confirm(`Remove ${email} from the Mastermind?`)) return;
    
    try {
      const { error } = await supabase.from('entitlements')
        .update({ status: 'cancelled', ends_at: new Date().toISOString().split('T')[0] })
        .eq('id', memberId);
      
      if (error) throw error;
      toast.success('Member removed');
      await loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove member');
    }
  };

  const handleReactivateMember = async (memberId: string) => {
    try {
      const { error } = await supabase.from('entitlements')
        .update({ status: 'active', ends_at: null })
        .eq('id', memberId);
      
      if (error) throw error;
      toast.success('Member reactivated');
      await loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reactivate member');
    }
  };

  // CSV Import
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      toast.error('CSV file is empty');
      return;
    }

    const headerLine = lines[0].toLowerCase();
    const headers = headerLine.split(',').map(h => h.trim().replace(/"/g, ''));
    
    const emailIndex = headers.findIndex(h => h === 'email' || h.includes('email'));
    const firstNameIndex = headers.findIndex(h => h === 'first_name' || h === 'firstname' || h === 'first name');
    const lastNameIndex = headers.findIndex(h => h === 'last_name' || h === 'lastname' || h === 'last name');

    if (emailIndex === -1) {
      toast.error('CSV must have an "email" column');
      return;
    }

    const rows: CSVRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const email = values[emailIndex]?.trim().toLowerCase();
      
      if (email && isValidEmail(email)) {
        rows.push({
          email,
          first_name: firstNameIndex >= 0 ? values[firstNameIndex]?.trim() : undefined,
          last_name: lastNameIndex >= 0 ? values[lastNameIndex]?.trim() : undefined,
        });
      }
    }

    if (rows.length === 0) {
      toast.error('No valid email addresses found in CSV');
      return;
    }

    setParsedRows(rows);
    setImportResult(null);
    toast.success(`Parsed ${rows.length} rows from CSV`);
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.replace(/"/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.replace(/"/g, ''));
    return result;
  };

  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) return;

    setImporting(true);
    const result: ImportResult = { added: 0, updated: 0, errors: [] };

    for (const row of parsedRows) {
      const isExisting = existingEmails.has(row.email.toLowerCase());

      if (isExisting) {
        const { error } = await supabase.from('entitlements')
          .update({
            first_name: row.first_name,
            last_name: row.last_name,
            status: 'active',
          })
          .ilike('email', row.email);

        if (error) {
          result.errors.push({ email: row.email, error: error.message });
        } else {
          result.updated++;
        }
      } else {
        const { error } = await supabase.from('entitlements')
          .insert({
            email: row.email.toLowerCase(),
            first_name: row.first_name,
            last_name: row.last_name,
            tier: 'mastermind',
            status: 'active',
            starts_at: new Date().toISOString().split('T')[0]
          });

        if (error) {
          result.errors.push({ email: row.email, error: error.message });
        } else {
          result.added++;
        }
      }
    }

    setImportResult(result);
    setImporting(false);

    if (result.errors.length === 0) {
      toast.success(`Import complete! Added ${result.added}, updated ${result.updated}`);
      setParsedRows([]);
    } else {
      toast.warning(`Import finished with ${result.errors.length} errors`);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    await loadAllData();
  };

  const downloadTemplate = () => {
    const csv = 'email,first_name,last_name\njohn@example.com,John,Doe\njane@example.com,Jane,Smith';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mastermind_roster_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async (text: string, type: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedUrl(type);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const newCount = parsedRows.filter(r => !existingEmails.has(r.email.toLowerCase())).length;
  const updateCount = parsedRows.filter(r => existingEmails.has(r.email.toLowerCase())).length;
  const activeMembers = members.filter(m => m.status === 'active');
  const cancelledMembers = members.filter(m => m.status === 'cancelled');

  if (loading) {
    return (
      <Layout>
        <LoadingState message="Checking admin access..." />
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <Shield className="h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access the admin panel.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              Admin Panel
            </h1>
            <p className="text-muted-foreground">Manage members, users, and view reports</p>
          </div>
          <Button onClick={loadAllData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Members ({activeMembers.length})
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              App Users ({users.length})
            </TabsTrigger>
            <TabsTrigger value="errors" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Errors ({errorLogs.length})
            </TabsTrigger>
            <TabsTrigger value="issues" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Issues ({issueReports.length})
            </TabsTrigger>
            <TabsTrigger value="features" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Features ({featureRequests.length})
            </TabsTrigger>
          </TabsList>

          {/* MEMBERS TAB */}
          <TabsContent value="members" className="space-y-6">
            {/* GHL Integration Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5" />
                  Go High Level Integration
                </CardTitle>
                <CardDescription>
                  Use these webhook URLs in Go High Level to automatically add/remove members
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Add Member (on purchase)</Label>
                  <div className="flex gap-2">
                    <Input value={webhookUrls.add} readOnly className="font-mono text-xs" />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => copyToClipboard(webhookUrls.add, 'add')}
                    >
                      {copiedUrl === 'add' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Remove Member (on cancellation)</Label>
                  <div className="flex gap-2">
                    <Input value={webhookUrls.remove} readOnly className="font-mono text-xs" />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => copyToClipboard(webhookUrls.remove, 'remove')}
                    >
                      {copiedUrl === 'remove' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Both endpoints accept POST requests with JSON body containing an "email" field
                </p>
              </CardContent>
            </Card>

            {/* CSV Upload Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    CSV Import
                  </CardTitle>
                  <CardDescription>
                    Upload a CSV with email, first_name, last_name columns
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Template
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="flex-1"
                  />
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Select
                  </Button>
                </div>

                {parsedRows.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Preview ({parsedRows.length} rows)</span>
                      <div className="flex gap-2">
                        <Badge variant="default">{newCount} new</Badge>
                        <Badge variant="secondary">{updateCount} updates</Badge>
                      </div>
                    </div>
                    <div className="max-h-40 overflow-auto border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parsedRows.slice(0, 10).map((row, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-mono text-xs">{row.email}</TableCell>
                              <TableCell className="text-sm">{row.first_name} {row.last_name}</TableCell>
                              <TableCell>
                                {existingEmails.has(row.email.toLowerCase()) ? (
                                  <Badge variant="secondary">Update</Badge>
                                ) : (
                                  <Badge variant="default">New</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <Button onClick={handleImport} disabled={importing} className="w-full">
                      {importing ? 'Importing...' : `Import ${parsedRows.length} Members`}
                    </Button>
                  </div>
                )}

                {importResult && (
                  <div className="p-4 border rounded-md bg-muted/50">
                    <div className="flex items-center gap-2 mb-2">
                      {importResult.errors.length === 0 ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                      )}
                      <span className="font-medium">Import Results</span>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span>{importResult.added} added</span>
                      <span>{importResult.updated} updated</span>
                      {importResult.errors.length > 0 && (
                        <span className="text-destructive">{importResult.errors.length} errors</span>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Members List */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Mastermind Members</CardTitle>
                  <CardDescription>
                    {activeMembers.length} active, {cancelledMembers.length} cancelled
                  </CardDescription>
                </div>
                <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Member
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Member</DialogTitle>
                      <DialogDescription>Add a new member to the Mastermind</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="member-email">Email *</Label>
                        <Input
                          id="member-email"
                          type="email"
                          value={newMemberEmail}
                          onChange={(e) => setNewMemberEmail(e.target.value)}
                          placeholder="member@example.com"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="member-first">First Name</Label>
                          <Input
                            id="member-first"
                            value={newMemberFirstName}
                            onChange={(e) => setNewMemberFirstName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="member-last">Last Name</Label>
                          <Input
                            id="member-last"
                            value={newMemberLastName}
                            onChange={(e) => setNewMemberLastName(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAddMemberOpen(false)}>Cancel</Button>
                      <Button onClick={handleAddMember}>Add Member</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Since</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.email}</TableCell>
                          <TableCell>{[m.first_name, m.last_name].filter(Boolean).join(' ') || '-'}</TableCell>
                          <TableCell>
                            {m.status === 'active' ? (
                              <Badge className="bg-green-500/10 text-green-600">Active</Badge>
                            ) : (
                              <Badge variant="secondary">Cancelled</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {m.starts_at ? format(new Date(m.starts_at), 'MMM d, yyyy') : '-'}
                          </TableCell>
                          <TableCell>
                            {m.status === 'active' ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveMember(m.id, m.email)}
                                className="text-destructive hover:text-destructive"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReactivateMember(m.id)}
                                className="text-green-600"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* USERS TAB */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>App Users</CardTitle>
                  <CardDescription>Registered users who have signed up</CardDescription>
                </div>
                <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New User</DialogTitle>
                      <DialogDescription>Add a new user account</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          placeholder="user@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          value={newUserPassword}
                          onChange={(e) => setNewUserPassword(e.target.value)}
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setCreateUserOpen(false)}>Cancel</Button>
                      <Button onClick={handleCreateUser}>Create User</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Last Sign In</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.email}</TableCell>
                          <TableCell>{format(new Date(u.created_at), 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                            {u.last_sign_in_at ? format(new Date(u.last_sign_in_at), 'MMM d, yyyy HH:mm') : 'Never'}
                          </TableCell>
                          <TableCell>
                            {u.is_admin ? (
                              <Badge className="bg-primary/10 text-primary">Admin</Badge>
                            ) : (
                              <Badge variant="outline">User</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleAdmin(u.id, u.is_admin)}
                                disabled={u.id === user?.id}
                              >
                                {u.is_admin ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteUser(u.id)}
                                disabled={u.id === user?.id}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ERRORS TAB */}
          <TabsContent value="errors" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Error Logs</CardTitle>
                <CardDescription>Application errors reported by users</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Component</TableHead>
                        <TableHead>Route</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {errorLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No error logs yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        errorLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-xs">
                              {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                            </TableCell>
                            <TableCell>
                              <Badge variant="destructive" className="text-xs">{log.error_type}</Badge>
                            </TableCell>
                            <TableCell className="max-w-[300px] truncate" title={log.error_message}>
                              {log.error_message}
                            </TableCell>
                            <TableCell className="text-xs">{log.component || '-'}</TableCell>
                            <TableCell className="text-xs">{log.route || '-'}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ISSUES TAB */}
          <TabsContent value="issues" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Issue Reports</CardTitle>
                <CardDescription>Bug reports submitted by users</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ticket</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Page</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {issueReports.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No issue reports yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        issueReports.map((report) => (
                          <TableRow key={report.id}>
                            <TableCell className="font-mono text-xs">{report.ticket_number}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{report.title}</TableCell>
                            <TableCell className="text-xs">{report.page_section}</TableCell>
                            <TableCell>
                              <Badge variant={report.severity === 'critical' ? 'destructive' : 'outline'}>
                                {report.severity}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{report.status}</Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              {format(new Date(report.created_at), 'MMM d, yyyy')}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FEATURES TAB */}
          <TabsContent value="features" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Feature Requests</CardTitle>
                <CardDescription>Feature suggestions from users</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {featureRequests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No feature requests yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        featureRequests.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell className="max-w-[250px] truncate">{request.title}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{request.category}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={request.priority === 'high' ? 'destructive' : 'secondary'}>
                                {request.priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{request.status}</Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              {format(new Date(request.created_at), 'MMM d, yyyy')}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
