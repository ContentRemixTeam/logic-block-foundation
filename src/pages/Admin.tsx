import { useState, useEffect } from 'react';
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
import { ErrorState } from '@/components/system/ErrorState';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Users, AlertTriangle, MessageSquare, Lightbulb, Shield, Trash2, UserPlus, ShieldCheck, ShieldOff, RefreshCw, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
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

export default function Admin() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [users, setUsers] = useState<User[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [issueReports, setIssueReports] = useState<IssueReport[]>([]);
  const [featureRequests, setFeatureRequests] = useState<FeatureRequest[]>([]);
  
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('users');

  useEffect(() => {
    checkAdminAndLoad();
  }, [user]);

  const checkAdminAndLoad = async () => {
    if (!user) {
      setLoading(false);
      setError('Please log in');
      return;
    }

    try {
      // Check admin status
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (adminError) throw adminError;
      
      if (!adminData) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(true);
      await loadAllData();
    } catch (err: any) {
      console.error('Admin check error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAllData = async () => {
    try {
      const [usersRes, errorsRes, issuesRes, featuresRes] = await Promise.all([
        supabase.functions.invoke('admin-get-data', { body: { action: 'get_users', limit: 100 } }),
        supabase.functions.invoke('admin-get-data', { body: { action: 'get_error_logs', limit: 100 } }),
        supabase.functions.invoke('admin-get-data', { body: { action: 'get_issue_reports', limit: 100 } }),
        supabase.functions.invoke('admin-get-data', { body: { action: 'get_feature_requests', limit: 100 } }),
      ]);

      if (usersRes.data?.users) setUsers(usersRes.data.users);
      if (errorsRes.data?.error_logs) setErrorLogs(errorsRes.data.error_logs);
      if (issuesRes.data?.issue_reports) setIssueReports(issuesRes.data.issue_reports);
      if (featuresRes.data?.feature_requests) setFeatureRequests(featuresRes.data.feature_requests);
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
      const { data, error } = await supabase.functions.invoke('admin-get-data', {
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
            <p className="text-muted-foreground">Manage users, view errors, and review reports</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/mastermind-roster">
                <Crown className="h-4 w-4 mr-2" />
                Mastermind Roster
              </Link>
            </Button>
            <Button onClick={loadAllData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users ({users.length})
            </TabsTrigger>
            <TabsTrigger value="errors" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Error Logs ({errorLogs.length})
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

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>View and manage all registered users</CardDescription>
                </div>
                <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New User</DialogTitle>
                      <DialogDescription>Add a new user to the system</DialogDescription>
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
                                {u.is_admin ? (
                                  <ShieldOff className="h-4 w-4" />
                                ) : (
                                  <ShieldCheck className="h-4 w-4" />
                                )}
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