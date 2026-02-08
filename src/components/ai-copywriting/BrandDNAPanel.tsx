import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { X, Plus, Save, Loader2 } from 'lucide-react';
import { BrandDNA, BrandFramework } from '@/types/brandDNA';

interface BrandDNAPanelProps {
  brandDNA: BrandDNA;
  onChange: (dna: BrandDNA) => void;
  onSave: () => void;
  isSaving?: boolean;
}

export function BrandDNAPanel({ brandDNA, onChange, onSave, isSaving }: BrandDNAPanelProps) {
  const [newBanned, setNewBanned] = useState('');
  const [newPhrase, setNewPhrase] = useState('');
  const [newFramework, setNewFramework] = useState({ name: '', description: '', example: '' });
  
  const addBannedPhrase = () => {
    if (newBanned.trim()) {
      onChange({
        ...brandDNA,
        custom_banned_phrases: [...brandDNA.custom_banned_phrases, newBanned.trim()]
      });
      setNewBanned('');
    }
  };
  
  const addSignaturePhrase = () => {
    if (newPhrase.trim()) {
      onChange({
        ...brandDNA,
        signature_phrases: [...brandDNA.signature_phrases, newPhrase.trim()]
      });
      setNewPhrase('');
    }
  };
  
  const addFramework = () => {
    if (newFramework.name && newFramework.description) {
      onChange({
        ...brandDNA,
        frameworks: [
          ...brandDNA.frameworks,
          {
            id: Date.now().toString(),
            name: newFramework.name,
            description: newFramework.description,
            example: newFramework.example || undefined
          }
        ]
      });
      setNewFramework({ name: '', description: '', example: '' });
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Brand DNA</h2>
          <p className="text-sm text-muted-foreground">Your brand's unique elements for AI generation</p>
        </div>
        <Button onClick={onSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
      
      <Tabs defaultValue="banned" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="banned">Banned Words</TabsTrigger>
          <TabsTrigger value="frameworks">Frameworks</TabsTrigger>
          <TabsTrigger value="phrases">Phrases</TabsTrigger>
          <TabsTrigger value="values">Values</TabsTrigger>
        </TabsList>
        
        {/* Banned Words Tab */}
        <TabsContent value="banned" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Custom Banned Words</CardTitle>
              <CardDescription>Words you never want in your content</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., 'leverage', 'synergy'"
                  value={newBanned}
                  onChange={(e) => setNewBanned(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addBannedPhrase()}
                />
                <Button onClick={addBannedPhrase} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {brandDNA.custom_banned_phrases.map((phrase, i) => (
                  <Badge key={i} variant="destructive" className="gap-1">
                    {phrase}
                    <button
                      onClick={() => onChange({
                        ...brandDNA,
                        custom_banned_phrases: brandDNA.custom_banned_phrases.filter((_, idx) => idx !== i)
                      })}
                      className="ml-1 hover:bg-destructive-foreground/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {brandDNA.custom_banned_phrases.length === 0 && (
                  <p className="text-sm text-muted-foreground">No custom banned words yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Frameworks Tab */}
        <TabsContent value="frameworks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your Frameworks</CardTitle>
              <CardDescription>Proprietary methods AI should reference</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Input
                  placeholder="Framework name (e.g., 'The 3-Step Launch Method')"
                  value={newFramework.name}
                  onChange={(e) => setNewFramework({ ...newFramework, name: e.target.value })}
                />
                <Textarea
                  placeholder="Description (what it is and when to use it)..."
                  value={newFramework.description}
                  onChange={(e) => setNewFramework({ ...newFramework, description: e.target.value })}
                  rows={2}
                />
                <Textarea
                  placeholder="Example usage (optional)..."
                  value={newFramework.example}
                  onChange={(e) => setNewFramework({ ...newFramework, example: e.target.value })}
                  rows={2}
                />
                <Button onClick={addFramework} className="w-full" disabled={!newFramework.name || !newFramework.description}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Framework
                </Button>
              </div>
              
              <div className="space-y-2">
                {brandDNA.frameworks.map((fw) => (
                  <Card key={fw.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-base">{fw.name}</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onChange({
                            ...brandDNA,
                            frameworks: brandDNA.frameworks.filter(f => f.id !== fw.id)
                          })}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <CardDescription className="text-sm">{fw.description}</CardDescription>
                    </CardHeader>
                    {fw.example && (
                      <CardContent className="pt-0">
                        <p className="text-xs text-muted-foreground italic">"{fw.example}"</p>
                      </CardContent>
                    )}
                  </Card>
                ))}
                {brandDNA.frameworks.length === 0 && (
                  <p className="text-sm text-muted-foreground">No frameworks added yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Signature Phrases Tab */}
        <TabsContent value="phrases" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Signature Phrases</CardTitle>
              <CardDescription>Your go-to expressions AI should use</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., 'Execution beats ideas every time'"
                  value={newPhrase}
                  onChange={(e) => setNewPhrase(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addSignaturePhrase()}
                />
                <Button onClick={addSignaturePhrase} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {brandDNA.signature_phrases.map((phrase, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    {phrase}
                    <button
                      onClick={() => onChange({
                        ...brandDNA,
                        signature_phrases: brandDNA.signature_phrases.filter((_, idx) => idx !== i)
                      })}
                      className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {brandDNA.signature_phrases.length === 0 && (
                  <p className="text-sm text-muted-foreground">No signature phrases yet</p>
                )}
              </div>
              
              {/* Emoji Preferences */}
              <div className="pt-4 border-t space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Use Emojis</Label>
                    <p className="text-xs text-muted-foreground">Allow AI to use emojis in generated content</p>
                  </div>
                  <Switch
                    checked={brandDNA.emoji_preferences.use_emojis}
                    onCheckedChange={(checked) => onChange({
                      ...brandDNA,
                      emoji_preferences: { ...brandDNA.emoji_preferences, use_emojis: checked }
                    })}
                  />
                </div>
                {brandDNA.emoji_preferences.use_emojis && (
                  <div className="space-y-2">
                    <Label>Preferred Emojis</Label>
                    <Input
                      placeholder="🎉 ✨ 💡 🚀"
                      value={brandDNA.emoji_preferences.preferred_emojis.join(' ')}
                      onChange={(e) => onChange({
                        ...brandDNA,
                        emoji_preferences: {
                          ...brandDNA.emoji_preferences,
                          preferred_emojis: e.target.value.split(' ').filter(s => s.trim())
                        }
                      })}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Values Tab */}
        <TabsContent value="values" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Brand Values & Philosophies</CardTitle>
              <CardDescription>What you stand for (shapes AI tone)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Content Philosophies</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  e.g., "Execution over perfection", "Simple beats complex"
                </p>
                <Textarea
                  placeholder="One per line..."
                  value={brandDNA.content_philosophies.join('\n')}
                  onChange={(e) => onChange({
                    ...brandDNA,
                    content_philosophies: e.target.value.split('\n').filter(l => l.trim())
                  })}
                  rows={4}
                />
              </div>
              
              <div>
                <Label>Brand Values</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  e.g., "Authenticity", "Community-driven", "Results-focused"
                </p>
                <Textarea
                  placeholder="One per line..."
                  value={brandDNA.brand_values.join('\n')}
                  onChange={(e) => onChange({
                    ...brandDNA,
                    brand_values: e.target.value.split('\n').filter(l => l.trim())
                  })}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
