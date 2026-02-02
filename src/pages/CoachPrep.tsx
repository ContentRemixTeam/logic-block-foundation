import { useState } from 'react';
import { Link } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { ArrowLeft, Plus, FileText, Calendar, Trash2 } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CoachPrepForm } from '@/components/coaching/CoachPrepForm';
import { useCoachingPrep, type CoachingCallPrep } from '@/hooks/useCoachingPrep';
import { Skeleton } from '@/components/ui/skeleton';
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
import { toast } from 'sonner';

export default function CoachPrep() {
  const [activePrep, setActivePrep] = useState<CoachingCallPrep | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { allPreps, isLoading, createPrep, updatePrep, deletePrep } = useCoachingPrep();

  const handleSave = (values: {
    call_date: string;
    metrics: Record<string, unknown>;
    main_question: string;
    what_tried: string;
    blocking_thought: string;
    coaching_need: string;
  }) => {
    if (activePrep?.id) {
      updatePrep.mutate({ id: activePrep.id, ...values });
    } else {
      createPrep.mutate(values, {
        onSuccess: (data) => {
          setActivePrep(data);
          setIsCreating(false);
        },
      });
    }
  };

  const handleExportPdf = () => {
    if (!activePrep) return;
    
    const doc = new jsPDF();
    const margin = 20;
    let y = margin;
    
    // Title
    doc.setFontSize(20);
    doc.text('Coaching Call Prep', margin, y);
    y += 15;
    
    // Date
    doc.setFontSize(12);
    doc.text(`Call Date: ${format(new Date(activePrep.call_date), 'EEEE, MMMM d, yyyy')}`, margin, y);
    y += 15;
    
    // Metrics
    doc.setFontSize(14);
    doc.text('Your Numbers:', margin, y);
    y += 8;
    doc.setFontSize(10);
    const metrics = activePrep.metrics as Record<string, string> | null;
    if (metrics) {
      Object.entries(metrics).forEach(([key, value]) => {
        if (value) {
          doc.text(`• ${key}: ${value}`, margin + 5, y);
          y += 6;
        }
      });
    }
    y += 8;
    
    // Questions
    const sections = [
      { title: 'Your Question', content: activePrep.main_question },
      { title: "What You've Tried", content: activePrep.what_tried },
      { title: 'Thought Creating This Problem', content: activePrep.blocking_thought },
      { title: 'What You Need Coaching On', content: activePrep.coaching_need },
    ];
    
    sections.forEach(({ title, content }) => {
      if (content) {
        doc.setFontSize(14);
        doc.text(title, margin, y);
        y += 8;
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(content, 170);
        doc.text(lines, margin + 5, y);
        y += lines.length * 6 + 10;
      }
    });
    
    doc.save(`coaching-prep-${activePrep.call_date}.pdf`);
    toast.success('PDF downloaded');
  };

  const handleShare = () => {
    if (!activePrep?.share_token) return;
    
    const shareUrl = `${window.location.origin}/coach-prep/shared/${activePrep.share_token}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Share link copied to clipboard');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDelete = (id: string) => {
    deletePrep.mutate(id, {
      onSuccess: () => {
        if (activePrep?.id === id) {
          setActivePrep(null);
        }
      },
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Coaching Call Prep</h1>
              <p className="text-muted-foreground text-sm">Prepare for your coaching sessions</p>
            </div>
          </div>
          <Button
            onClick={() => {
              setActivePrep(null);
              setIsCreating(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New Prep
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Prep List */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Your Preps
            </h2>
            
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : allPreps.length === 0 && !isCreating ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No coaching preps yet</p>
                  <Button
                    variant="link"
                    onClick={() => setIsCreating(true)}
                    className="mt-2"
                  >
                    Create your first prep
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {allPreps.map((prep) => (
                  <Card
                    key={prep.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      activePrep?.id === prep.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => {
                      setActivePrep(prep);
                      setIsCreating(false);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(new Date(prep.call_date), 'MMM d, yyyy')}
                          </div>
                          {prep.main_question && (
                            <p className="text-sm mt-1 line-clamp-2">{prep.main_question}</p>
                          )}
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this prep?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(prep.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            {(activePrep || isCreating) ? (
              <CoachPrepForm
                initialValues={activePrep || undefined}
                onSave={handleSave}
                onExportPdf={activePrep ? handleExportPdf : undefined}
                onShare={activePrep ? handleShare : undefined}
                onPrint={activePrep ? handlePrint : undefined}
                isSaving={createPrep.isPending || updatePrep.isPending}
              />
            ) : (
              <Card className="border-dashed h-full min-h-[400px]">
                <CardContent className="h-full flex flex-col items-center justify-center text-center p-8">
                  <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Select or Create a Prep</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Choose an existing coaching prep from the list or create a new one to prepare for your next call.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
