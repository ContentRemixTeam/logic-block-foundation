import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { EngineBuilderData } from './EngineBuilderTypes';

interface WorkshopTestimonialFormProps {
  engineData: EngineBuilderData;
}

export function WorkshopTestimonialForm({ engineData }: WorkshopTestimonialFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [testimonial, setTestimonial] = useState('');
  const [rating, setRating] = useState(5);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !testimonial.trim()) return;
    setSubmitting(true);
    try {
      await supabase.from('workshop_testimonials' as any).insert({
        name: name.trim().slice(0, 100),
        email: email.trim().slice(0, 255) || null,
        business_name: businessName.trim().slice(0, 100) || null,
        testimonial: testimonial.trim().slice(0, 2000),
        rating,
        engine_data: engineData as any,
      });
      setSubmitted(true);
    } catch {
      // silent fail
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="border border-primary/20 bg-accent/30 rounded-xl p-6 text-center space-y-2">
        <span className="text-3xl">💛</span>
        <h4 className="font-bold text-foreground">Thank you so much!</h4>
        <p className="text-sm text-muted-foreground">Your feedback means the world. Keep building that engine! 🏎️</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl p-5 space-y-4 bg-card">
      <div className="text-center space-y-1">
        <h4 className="font-bold text-foreground flex items-center justify-center gap-2">
          <span className="text-xl">💬</span> Did you love this workshop?
        </h4>
        <p className="text-sm text-muted-foreground">
          We'd love to hear about your experience! Leave a quick testimonial 🙏
        </p>
      </div>

      {/* Star rating */}
      <div className="flex justify-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            className="text-2xl transition-transform hover:scale-110"
          >
            {star <= rating ? '⭐' : '☆'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name *"
          maxLength={100}
          className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <input
          type="text"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="Business name (optional)"
          maxLength={100}
          className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email (optional — we may feature you!)"
        maxLength={255}
        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
      />

      <textarea
        value={testimonial}
        onChange={(e) => setTestimonial(e.target.value)}
        placeholder="What was your biggest takeaway? How did the engine builder help you? *"
        maxLength={2000}
        rows={3}
        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
      />

      <button
        onClick={handleSubmit}
        disabled={!name.trim() || !testimonial.trim() || submitting}
        className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
      >
        {submitting ? 'Sending...' : '💛 Submit Testimonial'}
      </button>
    </div>
  );
}
