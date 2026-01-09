import { useState, useRef, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, Users, Download } from 'lucide-react';
import { LoadingState } from '@/components/system/LoadingState';

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

export default function MastermindRosterImport() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [parsedRows, setParsedRows] = useState<CSVRow[]>([]);
  const [existingEmails, setExistingEmails] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check admin status on mount
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc('is_admin', { check_user_id: user.id });
      if (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } else {
        setIsAdmin(data === true);
      }
      setLoading(false);
    };
    checkAdmin();
  }, [user]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      toast.error('CSV file is empty');
      return;
    }

    // Parse header
    const headerLine = lines[0].toLowerCase();
    const headers = headerLine.split(',').map(h => h.trim().replace(/"/g, ''));
    
    const emailIndex = headers.findIndex(h => h === 'email' || h.includes('email'));
    const firstNameIndex = headers.findIndex(h => h === 'first_name' || h === 'firstname' || h === 'first name');
    const lastNameIndex = headers.findIndex(h => h === 'last_name' || h === 'lastname' || h === 'last name');

    if (emailIndex === -1) {
      toast.error('CSV must have an "email" column');
      return;
    }

    // Parse rows
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

    // Check which emails already exist
    const { data: existing } = await supabase
      .from('entitlements')
      .select('email');

    if (existing) {
      setExistingEmails(new Set(existing.map(e => e.email.toLowerCase())));
    }

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
        // Update existing
        const { error } = await supabase
          .from('entitlements')
          .update({
            first_name: row.first_name,
            last_name: row.last_name,
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .ilike('email', row.email);

        if (error) {
          result.errors.push({ email: row.email, error: error.message });
        } else {
          result.updated++;
        }
      } else {
        // Insert new
        const { error } = await supabase
          .from('entitlements')
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

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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

  const newCount = parsedRows.filter(r => !existingEmails.has(r.email.toLowerCase())).length;
  const updateCount = parsedRows.filter(r => existingEmails.has(r.email.toLowerCase())).length;

  if (loading) {
    return (
      <Layout>
        <LoadingState message="Checking access..." />
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <XCircle className="h-5 w-5" />
                Access Denied
              </CardTitle>
              <CardDescription>
                Only administrators can access this page.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-4xl py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" />
              Mastermind Roster Import
            </h1>
            <p className="text-muted-foreground">
              Import members from CSV to grant Mastermind access
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
        </div>

        {/* Upload Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Upload CSV
            </CardTitle>
            <CardDescription>
              CSV must have an "email" column. Optional: first_name, last_name
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="flex-1"
              />
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Select File
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        {parsedRows.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Preview ({parsedRows.length} rows)</span>
                <div className="flex gap-2">
                  <Badge variant="default">{newCount} new</Badge>
                  <Badge variant="secondary">{updateCount} updates</Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-h-64 overflow-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>First Name</TableHead>
                      <TableHead>Last Name</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.slice(0, 50).map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-sm">{row.email}</TableCell>
                        <TableCell>{row.first_name || '-'}</TableCell>
                        <TableCell>{row.last_name || '-'}</TableCell>
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
              {parsedRows.length > 50 && (
                <p className="text-sm text-muted-foreground text-center">
                  Showing first 50 of {parsedRows.length} rows
                </p>
              )}
              <Button 
                onClick={handleImport} 
                disabled={importing}
                className="w-full"
              >
                {importing ? 'Importing...' : `Import ${parsedRows.length} Members`}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {importResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {importResult.errors.length === 0 ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                )}
                Import Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <Badge variant="default">{importResult.added}</Badge>
                  <span className="text-sm">Added</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{importResult.updated}</Badge>
                  <span className="text-sm">Updated</span>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">{importResult.errors.length}</Badge>
                    <span className="text-sm">Errors</span>
                  </div>
                )}
              </div>

              {importResult.errors.length > 0 && (
                <div className="border rounded-md p-4 bg-destructive/5">
                  <p className="font-medium text-sm mb-2">Errors:</p>
                  <ul className="text-sm space-y-1">
                    {importResult.errors.map((err, i) => (
                      <li key={i} className="text-destructive">
                        {err.email}: {err.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
