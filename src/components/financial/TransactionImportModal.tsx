import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Upload, 
  FileText, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  ArrowUp,
  ArrowDown 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format as formatDate, parse, isValid } from 'date-fns';
import { cn } from '@/lib/utils';

type ImportFormat = 'generic' | 'quickbooks' | 'stripe';

interface ParsedTransaction {
  date: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  error?: string;
}

interface TransactionImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
  categories: { income: string[]; expense: string[] };
}

// Column mappings for different formats
const COLUMN_MAPPINGS: Record<string, Record<string, string>> = {
  date: {
    'date': 'date',
    'transaction date': 'date',
    'created': 'date',
    'created (utc)': 'date',
    'txn date': 'date',
  },
  amount: {
    'amount': 'amount',
    'net': 'amount',
    'total': 'amount',
    'gross': 'amount',
    'debit': 'amount',
    'credit': 'amount',
  },
  description: {
    'description': 'description',
    'memo': 'description',
    'name': 'description',
    'memo/description': 'description',
    'customer': 'description',
  },
  type: {
    'type': 'type',
    'transaction type': 'type',
  },
  category: {
    'category': 'category',
    'account': 'category',
    'class': 'category',
  },
};

// QuickBooks type mappings
const QUICKBOOKS_INCOME_TYPES = ['sales receipt', 'payment', 'invoice', 'deposit', 'credit'];
const QUICKBOOKS_EXPENSE_TYPES = ['expense', 'bill', 'check', 'credit card', 'purchase'];

export function TransactionImportModal({
  open,
  onOpenChange,
  onImportComplete,
  categories,
}: TransactionImportModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [importFormat, setImportFormat] = useState<ImportFormat>('generic');
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const resetState = () => {
    setFile(null);
    setParsedTransactions([]);
    setErrors([]);
    setIsParsing(false);
    setIsImporting(false);
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  // Parse CSV text into rows
  const parseCSV = (text: string): string[][] => {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (inQuotes) {
        if (char === '"' && nextChar === '"') {
          currentField += '"';
          i++;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          currentField += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          currentRow.push(currentField.trim());
          currentField = '';
        } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
          currentRow.push(currentField.trim());
          if (currentRow.some(f => f)) rows.push(currentRow);
          currentRow = [];
          currentField = '';
          if (char === '\r') i++;
        } else {
          currentField += char;
        }
      }
    }

    if (currentField || currentRow.length) {
      currentRow.push(currentField.trim());
      if (currentRow.some(f => f)) rows.push(currentRow);
    }

    return rows;
  };

  // Parse date from various formats
  const parseDate = (value: string): string | null => {
    const formats = [
      'yyyy-MM-dd',
      'MM/dd/yyyy',
      'MM-dd-yyyy',
      'dd/MM/yyyy',
      'M/d/yyyy',
      'yyyy/MM/dd',
    ];

    for (const fmt of formats) {
      try {
        const parsedDate = parse(value, fmt, new Date());
        if (isValid(parsedDate)) {
          return formatDate(parsedDate, 'yyyy-MM-dd');
        }
      } catch {
        continue;
      }
    }

    // Try native Date parsing
    const nativeDate = new Date(value);
    if (isValid(nativeDate)) {
      return formatDate(nativeDate, 'yyyy-MM-dd');
    }

    return null;
  };

  // Determine transaction type
  const determineType = (
    row: Record<string, string>,
    selectedFormat: ImportFormat
  ): 'income' | 'expense' => {
    const typeValue = row.type?.toLowerCase() || '';
    const amount = parseFloat(row.amount?.replace(/[^-\d.]/g, '') || '0');

    if (selectedFormat === 'quickbooks') {
      if (QUICKBOOKS_INCOME_TYPES.some(t => typeValue.includes(t))) return 'income';
      if (QUICKBOOKS_EXPENSE_TYPES.some(t => typeValue.includes(t))) return 'expense';
    }

    if (selectedFormat === 'stripe') {
      // Stripe: positive amounts are income, fees could be expenses
      return amount >= 0 ? 'income' : 'expense';
    }

    // Generic: check type column or amount sign
    if (typeValue.includes('income') || typeValue.includes('revenue') || typeValue.includes('sale')) {
      return 'income';
    }
    if (typeValue.includes('expense') || typeValue.includes('cost') || typeValue.includes('purchase')) {
      return 'expense';
    }

    return amount >= 0 ? 'income' : 'expense';
  };

  // Map category to existing categories
  const mapCategory = (value: string, type: 'income' | 'expense'): string => {
    const catList = type === 'income' ? categories.income : categories.expense;
    const normalized = value.toLowerCase();
    
    // Try exact match
    const exact = catList.find(c => c.toLowerCase() === normalized);
    if (exact) return exact;

    // Try partial match
    const partial = catList.find(c => 
      c.toLowerCase().includes(normalized) || normalized.includes(c.toLowerCase())
    );
    if (partial) return partial;

    // Default
    return type === 'income' ? 'Other Income' : 'Other Expense';
  };

  const handleFileUpload = async (uploadedFile: File, selectedFormat: ImportFormat) => {
    setFile(uploadedFile);
    setIsParsing(true);
    setErrors([]);

    try {
      const text = await uploadedFile.text();
      const rows = parseCSV(text);

      if (rows.length < 2) {
        setErrors(['File appears to be empty or has no data rows']);
        setIsParsing(false);
        return;
      }

      // Map headers
      const headers = rows[0].map(h => h.toLowerCase().trim());
      const columnMap: Record<string, number> = {};

      headers.forEach((header, idx) => {
        for (const [field, aliases] of Object.entries(COLUMN_MAPPINGS)) {
          if (aliases[header]) {
            columnMap[field] = idx;
          }
        }
      });

      // Parse data rows
      const parsed: ParsedTransaction[] = [];
      const parseErrors: string[] = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rowData: Record<string, string> = {};

        headers.forEach((header, idx) => {
          rowData[header] = row[idx] || '';
        });

        // Extract values
        const dateIdx = columnMap.date;
        const amountIdx = columnMap.amount;
        const descIdx = columnMap.description;
        const catIdx = columnMap.category;

        const dateValue = dateIdx !== undefined ? row[dateIdx] : '';
        const amountValue = amountIdx !== undefined ? row[amountIdx] : '';
        const descValue = descIdx !== undefined ? row[descIdx] : '';
        const catValue = catIdx !== undefined ? row[catIdx] : '';

        // Parse date
        const parsedDate = parseDate(dateValue);
        if (!parsedDate) {
          parseErrors.push(`Row ${i + 1}: Invalid date "${dateValue}"`);
          continue;
        }

        // Parse amount
        const amount = Math.abs(parseFloat(amountValue.replace(/[^-\d.]/g, '') || '0'));
        if (isNaN(amount) || amount === 0) {
          parseErrors.push(`Row ${i + 1}: Invalid amount "${amountValue}"`);
          continue;
        }

        // Determine type
        const type = determineType(rowData, selectedFormat);

        // Map category
        const category = mapCategory(catValue || 'Other', type);

        parsed.push({
          date: parsedDate,
          amount,
          type,
          category,
          description: descValue || category,
        });
      }

      setParsedTransactions(parsed);
      if (parseErrors.length > 0) {
        setErrors(parseErrors.slice(0, 10));
      }
    } catch (error: any) {
      setErrors([`Error parsing file: ${error.message}`]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === 'text/csv' || droppedFile?.name.endsWith('.csv')) {
      handleFileUpload(droppedFile, importFormat);
    } else {
      setErrors(['Please upload a CSV file']);
    }
  }, [importFormat]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileUpload(selectedFile, importFormat);
    }
  };

  const downloadTemplate = (templateFormat: ImportFormat) => {
    let content = '';
    
    if (templateFormat === 'generic') {
      content = 'Date,Type,Amount,Category,Description\n2024-01-15,income,1500,Sales,Product sale\n2024-01-16,expense,50,Software & Tools,Monthly subscription';
    } else if (templateFormat === 'quickbooks') {
      content = 'Date,Transaction Type,Amount,Account,Memo/Description\n01/15/2024,Sales Receipt,1500,Sales,Customer payment\n01/16/2024,Expense,50,Software,Monthly subscription';
    } else if (templateFormat === 'stripe') {
      content = 'Created (UTC),Description,Amount,Net,Status\n2024-01-15T10:00:00Z,Payment from customer,1500,1450,Succeeded\n2024-01-16T10:00:00Z,Subscription fee,-29.99,-29.99,Succeeded';
    }

    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${templateFormat}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!user || parsedTransactions.length === 0) return;

    setIsImporting(true);

    try {
      const transactions = parsedTransactions.map(tx => ({
        user_id: user.id,
        type: tx.type,
        amount: tx.amount,
        category: tx.category,
        description: tx.description,
        date: tx.date,
        is_recurring: false,
      }));

      const { error } = await supabase
        .from('financial_transactions')
        .insert(transactions);

      if (error) throw error;

      toast({
        title: '✅ Import successful!',
        description: `${transactions.length} transactions imported`,
      });

      onImportComplete();
      handleClose();
    } catch (error: any) {
      toast({
        title: 'Import failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const validTransactions = parsedTransactions.filter(t => !t.error);
  const incomeCount = validTransactions.filter(t => t.type === 'income').length;
  const expenseCount = validTransactions.filter(t => t.type === 'expense').length;
  const totalIncome = validTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = validTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Transactions
          </DialogTitle>
          <DialogDescription>
            Import transactions from CSV files (QuickBooks, Stripe, or generic format)
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden space-y-4">
          {/* Format Selector */}
          <div className="flex items-center gap-4 flex-wrap">
            <Select value={importFormat} onValueChange={(v) => setImportFormat(v as ImportFormat)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="generic">Generic CSV</SelectItem>
                <SelectItem value="quickbooks">QuickBooks</SelectItem>
                <SelectItem value="stripe">Stripe</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadTemplate(importFormat)}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download Template
            </Button>
          </div>

          {/* Drop Zone */}
          {!file && (
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                'hover:border-primary hover:bg-primary/5'
              )}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <input
                id="file-input"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileInput}
              />
              <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">Drop your CSV file here</p>
              <p className="text-sm text-muted-foreground">or click to browse</p>
            </div>
          )}

          {/* Parsing Indicator */}
          {isParsing && (
            <div className="flex items-center justify-center py-8 gap-3">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Parsing file...</span>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((err, i) => (
                    <li key={i} className="text-sm">{err}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Preview */}
          {validTransactions.length > 0 && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowUp className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-600">{incomeCount} Income</span>
                  </div>
                  <p className="text-lg font-bold text-emerald-600">{formatCurrency(totalIncome)}</p>
                </div>
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowDown className="h-4 w-4 text-rose-600" />
                    <span className="text-sm font-medium text-rose-600">{expenseCount} Expenses</span>
                  </div>
                  <p className="text-lg font-bold text-rose-600">{formatCurrency(totalExpenses)}</p>
                </div>
              </div>

              {/* Transaction Preview Table */}
              <ScrollArea className="h-[200px] border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Type</th>
                      <th className="text-left p-2">Category</th>
                      <th className="text-left p-2">Description</th>
                      <th className="text-right p-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validTransactions.slice(0, 50).map((tx, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{tx.date}</td>
                        <td className="p-2">
                          <Badge variant={tx.type === 'income' ? 'default' : 'destructive'} className="text-xs">
                            {tx.type}
                          </Badge>
                        </td>
                        <td className="p-2">{tx.category}</td>
                        <td className="p-2 max-w-[150px] truncate">{tx.description}</td>
                        <td className={cn(
                          'p-2 text-right font-medium',
                          tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                        )}>
                          {formatCurrency(tx.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {validTransactions.length > 50 && (
                  <p className="p-2 text-center text-sm text-muted-foreground">
                    ...and {validTransactions.length - 50} more
                  </p>
                )}
              </ScrollArea>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={validTransactions.length === 0 || isImporting}
            className="gap-2"
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Import {validTransactions.length} Transactions
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
