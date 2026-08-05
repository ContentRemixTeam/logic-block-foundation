import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { BatteryLow } from 'lucide-react';

export function TeachingNote({
  children,
  presenter,
}: {
  children: ReactNode;
  presenter: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border-l-4 border-primary bg-primary/5 px-4 py-3',
        presenter && 'px-5 py-5'
      )}
    >
      <p
        className={cn(
          'font-medium uppercase tracking-wide text-primary',
          presenter ? 'text-sm' : 'text-xs'
        )}
      >
        Faith&apos;s teaching note
      </p>
      <p
        className={cn(
          'mt-1 text-foreground',
          presenter ? 'text-2xl font-semibold leading-snug' : 'text-base'
        )}
      >
        {children}
      </p>
    </div>
  );
}

export function HelperText({
  children,
  presenter,
  className,
}: {
  children: ReactNode;
  presenter: boolean;
  className?: string;
}) {
  if (presenter) return null;
  return <p className={cn('text-sm text-muted-foreground', className)}>{children}</p>;
}

export function ReflectionBanner({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3">
      <BatteryLow className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      <p className="text-sm font-medium text-foreground">{children}</p>
    </div>
  );
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helper?: ReactNode;
  presenter: boolean;
  type?: string;
}

export function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  helper,
  presenter,
  type = 'text',
}: FieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-base">
        {label}
      </Label>
      {helper ? <HelperText presenter={presenter}>{helper}</HelperText> : null}
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={presenter ? undefined : placeholder}
        className="min-h-[44px] text-base"
      />
    </div>
  );
}

export function TextAreaField({
  id,
  label,
  value,
  onChange,
  placeholder,
  helper,
  presenter,
  rows = 4,
}: FieldProps & { rows?: number }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-base">
        {label}
      </Label>
      {helper ? <HelperText presenter={presenter}>{helper}</HelperText> : null}
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={presenter ? undefined : placeholder}
        rows={rows}
        className="text-base"
      />
    </div>
  );
}

/** Single-choice list rendered as large tappable rows. */
export function ChoiceList({
  label,
  options,
  value,
  onChange,
  name,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  name: string;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-base font-medium text-foreground">{label}</legend>
      <div className="grid gap-2">
        {options.map((option) => {
          const selected = value === option;
          return (
            <label
              key={option}
              className={cn(
                'flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-base transition-colors',
                selected
                  ? 'border-primary bg-primary/10 font-medium text-foreground'
                  : 'border-border bg-card hover:bg-muted/60'
              )}
            >
              <input
                type="radio"
                name={name}
                className="h-4 w-4 accent-[hsl(var(--primary))]"
                checked={selected}
                onChange={() => onChange(option)}
              />
              <span>{option}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Multi-select list. When `crossOff` is true, selected items render struck through. */
export function MultiSelectList({
  label,
  options,
  values,
  onToggle,
  crossOff = false,
}: {
  label: string;
  options: string[];
  values: string[];
  onToggle: (option: string) => void;
  crossOff?: boolean;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-base font-medium text-foreground">{label}</legend>
      <div className="grid gap-2">
        {options.map((option) => {
          const selected = values.includes(option);
          return (
            <label
              key={option}
              className={cn(
                'flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-base transition-colors',
                selected
                  ? crossOff
                    ? 'border-border bg-muted text-muted-foreground'
                    : 'border-primary bg-primary/10 font-medium text-foreground'
                  : 'border-border bg-card hover:bg-muted/60'
              )}
            >
              <input
                type="checkbox"
                className="h-4 w-4 accent-[hsl(var(--primary))]"
                checked={selected}
                onChange={() => onToggle(option)}
              />
              <span className={cn(selected && crossOff && 'line-through')}>{option}</span>
              {selected && crossOff ? (
                <span className="ml-auto text-xs uppercase tracking-wide">Off the plan</span>
              ) : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
