import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Fuel, Cog, Zap, Gift, CheckCircle } from 'lucide-react';

export default function WorkshopRegisterPage() {
  // Load GHL form embed script
  useEffect(() => {
    const existingScript = document.querySelector('script[src="https://link.msgsndr.com/js/form_embed.js"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://link.msgsndr.com/js/form_embed.js';
      script.async = true;
      document.body.appendChild(script);
      return () => {
        document.body.removeChild(script);
      };
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Checkered stripe */}
      <div className="h-3 w-full" style={{
        backgroundImage: 'repeating-conic-gradient(hsl(var(--foreground)) 0% 25%, transparent 0% 50%)',
        backgroundSize: '24px 24px',
        opacity: 0.08,
      }} />

      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/30 pointer-events-none" />
        <div className="max-w-3xl mx-auto px-4 pt-12 pb-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="text-5xl mb-4"
          >
            🏎️
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground leading-tight mb-4"
          >
            Build Your{' '}
            <span className="text-primary">Business Engine</span>{' '}
            Workshop
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-lg text-muted-foreground max-w-xl mx-auto mb-2"
          >
            Map out your Discover → Nurture → Convert engine and finally have a plan that makes money on repeat.
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-sm text-primary font-semibold"
          >
            FREE Workshop — Register below! 🏁
          </motion.p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left — What you'll build */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="space-y-5"
          >
            <h2 className="text-xl font-bold text-foreground">
              What You'll Build 🔧
            </h2>

            <div className="space-y-3">
              {[
                { icon: Fuel, emoji: '⛽', label: 'Fuel System', desc: 'Pick your #1 platform and weekly discovery action' },
                { icon: Cog, emoji: '🔧', label: 'Engine Block', desc: 'Set up your email nurture system + lead magnet' },
                { icon: Zap, emoji: '🚀', label: 'Turbo Boost', desc: 'Define your offer, pricing, and revenue goal' },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + i * 0.1 }}
                  className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-lg">
                    {item.emoji}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-foreground">{item.label}</h4>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-accent/20 border border-primary/20"
            >
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2 mb-2">
                <Gift className="w-4 h-4 text-primary" /> You'll walk away with:
              </h3>
              <ul className="space-y-1.5">
                {[
                  'Your complete Business Engine Blueprint',
                  'A downloadable PDF plan',
                  'Free live coaching sessions',
                  'Access to Office Hours & Q&A',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-3.5 h-3.5 text-success shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>

          {/* Right — GHL Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="rounded-2xl border border-border bg-card p-6 shadow-lg"
          >
            <h3 className="font-bold text-foreground text-center mb-4 text-lg">
              🏁 Save Your Spot
            </h3>
            <div className="min-h-[400px]">
              <iframe
                src="https://api.leadconnectorhq.com/widget/form/I8MFmXNo7QQQPcVfdxuQ"
                style={{ width: '100%', height: '500px', border: 'none', borderRadius: '8px' }}
                id="inline-I8MFmXNo7QQQPcVfdxuQ"
                data-layout="{'id':'INLINE'}"
                data-trigger-type="alwaysShow"
                data-trigger-value=""
                data-activation-type="alwaysActivated"
                data-activation-value=""
                data-deactivation-type="neverDeactivate"
                data-deactivation-value=""
                data-form-name="BUILD YOUR BUSINESS ENGINE WORKSHOP"
                data-height="undefined"
                data-layout-iframe-id="inline-I8MFmXNo7QQQPcVfdxuQ"
                data-form-id="I8MFmXNo7QQQPcVfdxuQ"
                title="BUILD YOUR BUSINESS ENGINE WORKSHOP"
              />
            </div>
          </motion.div>
        </div>
      </main>

      {/* Checkered stripe bottom */}
      <div className="h-3 w-full" style={{
        backgroundImage: 'repeating-conic-gradient(hsl(var(--foreground)) 0% 25%, transparent 0% 50%)',
        backgroundSize: '24px 24px',
        opacity: 0.08,
      }} />
    </div>
  );
}
