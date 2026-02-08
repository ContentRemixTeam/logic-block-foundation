import { useState, useEffect } from 'react';
import { BrandDNAPanel } from '@/components/ai-copywriting/BrandDNAPanel';
import { useBrandDNA } from '@/hooks/useBrandDNA';
import { BrandDNA } from '@/types/brandDNA';

export default function BrandDNAPage() {
  const { brandDNA: saved, save, isSaving, isLoading } = useBrandDNA();
  const [brandDNA, setBrandDNA] = useState<BrandDNA>(saved);
  
  useEffect(() => {
    setBrandDNA(saved);
  }, [saved]);
  
  if (isLoading) {
    return (
      <div className="container max-w-4xl py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="container max-w-4xl py-6">
      <BrandDNAPanel
        brandDNA={brandDNA}
        onChange={setBrandDNA}
        onSave={() => save(brandDNA)}
        isSaving={isSaving}
      />
    </div>
  );
}
