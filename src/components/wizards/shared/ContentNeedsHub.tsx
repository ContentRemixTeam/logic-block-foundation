// Content Needs Hub
// Shows content items needing creation with AI generation options

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, Sparkles, Mail, Check, AlertTriangle, ExternalLink, 
  RefreshCw, Eye 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  ContentNeedItem, 
  WizardContentType, 
  EMAIL_SEQUENCE_CONFIGS,
  SEQUENCE_TYPE_TO_CONTENT_TYPE 
} from '@/types/wizardAIGeneration';
import { LaunchWizardV2Data } from '@/types/launchV2';
import { WizardAIGeneratorModal } from './WizardAIGeneratorModal';
import { useAPIKey } from '@/hooks/useAICopywriting';

interface ContentNeedsHubProps {
  data: LaunchWizardV2Data;
  generatedContent: Record<string, boolean>;
  onGenerationComplete: (contentType: WizardContentType) => void;
}

export function ContentNeedsHub({ 
  data, 
  generatedContent, 
  onGenerationComplete 
}: ContentNeedsHubProps) {
  const [openGeneratorType, setOpenGeneratorType] = useState<WizardContentType | null>(null);
  
  // Check API key status
  const { data: apiKey } = useAPIKey();
  const hasValidAPIKey = apiKey?.key_status === 'valid';
  
  // Build list of content needing creation
  const contentNeeds = useMemo(() => {
    const needs: ContentNeedItem[] = [];
    
    // Email sequences that need creation
    const sequences = data.emailSequences || [];
    sequences.forEach(seq => {
      if (seq.status === 'needs-creation') {
        const contentTypeKey = SEQUENCE_TYPE_TO_CONTENT_TYPE[seq.type];
        const config = contentTypeKey ? EMAIL_SEQUENCE_CONFIGS[contentTypeKey] : null;
        
        if (config) {
          needs.push({
            id: seq.type,
            type: 'email_sequence',
            contentType: contentTypeKey,
            label: config.label,
            emailCount: config.emailCount,
            purpose: config.emails[0]?.purpose || 'Email sequence',
          });
        }
      }
    });
    
    // Sales page
    if (data.salesPageStatus === 'needs-creation' || data.salesPageStatus === 'in-progress') {
      needs.push({
        id: 'sales_page',
        type: 'sales_page',
        contentType: 'launch_sales_page',
        label: 'Sales Page',
        purpose: 'Full long-form sales page copy',
      });
    }
    
    return needs;
  }, [data.emailSequences, data.salesPageStatus]);
  
  // Don't render if no content needs creation
  if (contentNeeds.length === 0) {
    return null;
  }
  
  const handleGenerate = (contentType: WizardContentType) => {
    setOpenGeneratorType(contentType);
  };
  
  const handleGenerationSuccess = () => {
    if (openGeneratorType) {
      onGenerationComplete(openGeneratorType);
    }
    setOpenGeneratorType(null);
  };
  
  const generatedCount = contentNeeds.filter(item => generatedContent[item.contentType]).length;
  
  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5 text-primary" />
            Content to Create
            {generatedCount > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {generatedCount}/{contentNeeds.length} done
              </Badge>
            )}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Generate high-quality copy with AI before creating your launch
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Content items list */}
          {contentNeeds.map((item) => {
            const isGenerated = generatedContent[item.contentType];
            
            return (
              <div 
                key={item.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  {item.type === 'email_sequence' ? (
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.emailCount 
                        ? `${item.emailCount} emails • ${item.purpose}`
                        : item.purpose
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isGenerated ? (
                    <>
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                        <Check className="h-3 w-3 mr-1" />
                        Generated
                      </Badge>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleGenerate(item.contentType)}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Regenerate
                      </Button>
                    </>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleGenerate(item.contentType)}
                      disabled={!hasValidAPIKey}
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Generate
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          
          {/* Batch generate button */}
          {contentNeeds.length > 1 && generatedCount < contentNeeds.length && (
            <div className="pt-3 border-t">
              <Button 
                onClick={() => {
                  // Generate the first non-generated item
                  const nextItem = contentNeeds.find(item => !generatedContent[item.contentType]);
                  if (nextItem) {
                    handleGenerate(nextItem.contentType);
                  }
                }} 
                disabled={!hasValidAPIKey}
                className="w-full"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Next ({contentNeeds.length - generatedCount} remaining)
              </Button>
            </div>
          )}
          
          {/* No API key warning */}
          {!hasValidAPIKey && (
            <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <span>Connect your OpenAI API key to use AI generation. </span>
                <Link 
                  to="/ai-copywriting" 
                  className="underline font-medium inline-flex items-center gap-1"
                >
                  Set up API key <ExternalLink className="h-3 w-3" />
                </Link>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      {/* AI Generation Modal */}
      <WizardAIGeneratorModal
        open={openGeneratorType !== null}
        onOpenChange={(open) => !open && setOpenGeneratorType(null)}
        wizardType="launch-v2"
        wizardData={data}
        contentType={openGeneratorType || 'launch_warmup_sequence'}
        baseDate={data.cartOpensDate}
        onScheduleToCalendar={(emails, baseDate) => {
          // Calendar integration handled by modal
          handleGenerationSuccess();
        }}
        onSaveToVault={(emails) => {
          // Vault integration handled by modal
          handleGenerationSuccess();
        }}
      />
    </>
  );
}
