import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { BrandWizardData, ProductType } from '@/types/aiCopywriting';
import { Plus, Trash2, Package } from 'lucide-react';

interface StepProductsProps {
  data: BrandWizardData;
  onChange: (updates: Partial<BrandWizardData>) => void;
}

const PRODUCT_TYPES: { value: ProductType; label: string }[] = [
  { value: 'course', label: 'Course' },
  { value: 'coaching', label: 'Coaching' },
  { value: 'membership', label: 'Membership' },
  { value: 'service', label: 'Service' },
  { value: 'affiliate', label: 'Affiliate' },
];

export function StepProducts({ data, onChange }: StepProductsProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [form, setForm] = useState({
    product_name: '',
    product_type: 'course' as ProductType,
    price: '',
    affiliate_link: '',
    description: '',
  });

  const resetForm = () => {
    setForm({
      product_name: '',
      product_type: 'course',
      price: '',
      affiliate_link: '',
      description: '',
    });
    setEditIndex(null);
  };

  const handleSave = () => {
    const product = {
      product_name: form.product_name,
      product_type: form.product_type,
      price: form.price ? parseFloat(form.price) : null,
      affiliate_link: form.product_type === 'affiliate' ? form.affiliate_link : null,
      description: form.description || null,
    };

    const updated = [...data.products];
    if (editIndex !== null) {
      updated[editIndex] = product;
    } else {
      updated.push(product);
    }
    
    onChange({ products: updated });
    setShowDialog(false);
    resetForm();
  };

  const handleEdit = (index: number) => {
    const product = data.products[index];
    setForm({
      product_name: product.product_name,
      product_type: product.product_type,
      price: product.price?.toString() || '',
      affiliate_link: product.affiliate_link || '',
      description: product.description || '',
    });
    setEditIndex(index);
    setShowDialog(true);
  };

  const handleDelete = (index: number) => {
    const updated = data.products.filter((_, i) => i !== index);
    onChange({ products: updated });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Products & Offers</h3>
        <p className="text-muted-foreground">
          What can you promote in your copy? (Optional)
        </p>
      </div>

      {data.products.length > 0 && (
        <div className="space-y-3">
          {data.products.map((product, i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{product.product_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {product.product_type}
                      {product.price && ` • $${product.price}`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(i)}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) resetForm();
      }}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editIndex !== null ? 'Edit' : 'Add'} Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Product Type</Label>
              <RadioGroup
                value={form.product_type}
                onValueChange={(v) => setForm({ ...form, product_type: v as ProductType })}
                className="flex flex-wrap gap-2"
              >
                {PRODUCT_TYPES.map((type) => (
                  <div key={type.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={type.value} id={type.value} />
                    <Label htmlFor={type.value}>{type.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product_name">Product Name *</Label>
              <Input
                id="product_name"
                value={form.product_name}
                onChange={(e) => setForm({ ...form, product_name: e.target.value })}
                placeholder="e.g., Masterclass Bundle"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price (optional)</Label>
              <Input
                id="price"
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="997"
              />
            </div>

            {form.product_type === 'affiliate' && (
              <div className="space-y-2">
                <Label htmlFor="affiliate_link">Affiliate Link *</Label>
                <Input
                  id="affiliate_link"
                  value={form.affiliate_link}
                  onChange={(e) => setForm({ ...form, affiliate_link: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description..."
                maxLength={200}
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={!form.product_name || (form.product_type === 'affiliate' && !form.affiliate_link)}
              className="w-full"
            >
              Save Product
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
