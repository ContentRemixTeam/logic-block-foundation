import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { CharacterCounter } from "@/components/ui/character-counter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { CustomQuestion as CustomQuestionType } from "@/types/dailyPage";
import * as LucideIcons from "lucide-react";

interface CustomQuestionProps {
  question: CustomQuestionType;
  value: string | number | boolean | undefined;
  onChange: (value: string | number | boolean) => void;
  onBlur?: () => void;
  error?: string;
  className?: string;
}

export function CustomQuestion({
  question,
  value,
  onChange,
  onBlur,
  error,
  className,
}: CustomQuestionProps) {
  const [touched, setTouched] = useState(false);

  // Get the icon component dynamically
  const IconComponent = question.icon
    ? (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[question.icon]
    : null;

  // Validation
  const validateValue = (): string | null => {
    if (question.isRequired) {
      if (value === undefined || value === null || value === "") {
        return "This field is required";
      }
      if (question.type === "checkbox" && value === false) {
        return "This field is required";
      }
    }

    if (question.type === "number" && typeof value === "number") {
      if (question.minValue !== undefined && value < question.minValue) {
        return `Value must be at least ${question.minValue}`;
      }
      if (question.maxValue !== undefined && value > question.maxValue) {
        return `Value must be at most ${question.maxValue}`;
      }
    }

    if (question.type === "text" && typeof value === "string") {
      if (question.maxLength && value.length > question.maxLength) {
        return `Maximum ${question.maxLength} characters allowed`;
      }
    }

    return null;
  };

  const validationError = touched ? validateValue() : null;
  const displayError = error || validationError;

  const handleBlur = () => {
    setTouched(true);
    onBlur?.();
  };

  const renderInput = () => {
    switch (question.type) {
      case "checkbox":
        return (
          <div className="flex items-center space-x-3">
            <Checkbox
              id={question.id}
              checked={Boolean(value)}
              onCheckedChange={(checked) => onChange(Boolean(checked))}
              className={cn(displayError && "border-destructive")}
            />
            <Label
              htmlFor={question.id}
              className="text-sm font-normal cursor-pointer"
            >
              {question.question}
              {question.isRequired && (
                <span className="text-destructive ml-1">*</span>
              )}
            </Label>
          </div>
        );

      case "text":
        return (
          <div className="space-y-2">
            <Textarea
              id={question.id}
              value={String(value || "")}
              onChange={(e) => onChange(e.target.value)}
              onBlur={handleBlur}
              placeholder={question.placeholder || "Enter your response..."}
              maxLength={question.maxLength}
              className={cn(
                "min-h-[80px] resize-none",
                displayError && "border-destructive focus-visible:ring-destructive"
              )}
            />
            {question.maxLength && (
              <CharacterCounter
                current={String(value || "").length}
                max={question.maxLength}
              />
            )}
          </div>
        );

      case "number":
        return (
          <Input
            id={question.id}
            type="number"
            value={value !== undefined ? String(value) : ""}
            onChange={(e) => {
              const num = e.target.value === "" ? "" : Number(e.target.value);
              onChange(num as number);
            }}
            onBlur={handleBlur}
            min={question.minValue}
            max={question.maxValue}
            placeholder={question.placeholder || "Enter a number..."}
            className={cn(
              displayError && "border-destructive focus-visible:ring-destructive"
            )}
          />
        );

      case "rating":
        const minVal = question.minValue ?? 1;
        const maxVal = question.maxValue ?? 10;
        const currentValue = typeof value === "number" ? value : minVal;

        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{question.minLabel || minVal}</span>
              <span className="font-medium text-foreground text-lg">
                {currentValue}
              </span>
              <span>{question.maxLabel || maxVal}</span>
            </div>
            <Slider
              value={[currentValue]}
              onValueChange={(vals) => onChange(vals[0])}
              onValueCommit={() => handleBlur()}
              min={minVal}
              max={maxVal}
              step={1}
              className="w-full"
            />
          </div>
        );

      case "time":
        return (
          <Input
            id={question.id}
            type="time"
            value={String(value || "")}
            onChange={(e) => onChange(e.target.value)}
            onBlur={handleBlur}
            className={cn(
              "w-auto",
              displayError && "border-destructive focus-visible:ring-destructive"
            )}
          />
        );

      case "dropdown":
        const options = question.options || [];
        return (
          <Select
            value={String(value || "")}
            onValueChange={(val) => {
              onChange(val);
              handleBlur();
            }}
          >
            <SelectTrigger
              className={cn(
                displayError && "border-destructive focus:ring-destructive"
              )}
            >
              <SelectValue placeholder={question.placeholder || "Select an option..."} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option, index) => (
                <SelectItem key={`${question.id}-option-${index}`} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      default:
        return null;
    }
  };

  // Checkbox renders its own label inline
  if (question.type === "checkbox") {
    return (
      <Card className={cn("border-border/50", className)}>
        <CardContent className="pt-4">
          {renderInput()}
          {displayError && (
            <p className="text-sm text-destructive mt-2">{displayError}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-border/50", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          {IconComponent && <IconComponent className="h-4 w-4 text-muted-foreground" />}
          <span>
            {question.question}
            {question.isRequired && (
              <span className="text-destructive ml-1">*</span>
            )}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {renderInput()}
        {displayError && (
          <p className="text-sm text-destructive mt-2">{displayError}</p>
        )}
      </CardContent>
    </Card>
  );
}
