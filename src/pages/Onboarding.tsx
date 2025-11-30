import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Layout } from '@/components/Layout';

const checklistItems = [
  { id: 'mastermind', label: 'Join the Mastermind Group' },
  { id: 'coworking', label: 'Bookmark Coworking Link' },
  { id: 'calendar', label: 'Add Events to Calendar' },
  { id: 'review', label: 'Review Planning Process' },
];

export default function Onboarding() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();

  const allChecked = checklistItems.every((item) => checked[item.id]);

  return (
    <Layout>
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <span>⚡</span>
            Welcome!
          </h1>
          <p className="text-muted-foreground">
            Complete these steps to prepare for your 90-day journey
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Mastermind Checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {checklistItems.map((item) => (
              <div key={item.id} className="flex items-center space-x-3">
                <Checkbox
                  id={item.id}
                  checked={checked[item.id] || false}
                  onCheckedChange={(value) =>
                    setChecked((prev) => ({ ...prev, [item.id]: !!value }))
                  }
                />
                <label
                  htmlFor={item.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {item.label}
                </label>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <a
                href="#"
                target="_blank"
                className="text-primary hover:underline"
              >
                Mastermind Group Link →
              </a>
            </div>
            <div>
              <a
                href="#"
                target="_blank"
                className="text-primary hover:underline"
              >
                Coworking Sessions →
              </a>
            </div>
            <div>
              <a
                href="#"
                target="_blank"
                className="text-primary hover:underline"
              >
                Event Calendar →
              </a>
            </div>
          </CardContent>
        </Card>

        <Button
          size="lg"
          className="w-full"
          disabled={!allChecked}
          onClick={() => navigate('/cycle-setup')}
        >
          ⚡ Start 90-Day Cycle →
        </Button>
      </div>
    </Layout>
  );
}
