import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const toastWidthStyle = {
    "--width": "min(calc(100vw - 2rem), 356px)",
    ...props.style,
  } as ToasterProps["style"];

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      mobileOffset={props.mobileOffset ?? "16px"}
      style={toastWidthStyle}
      toastOptions={{
        classNames: {
          toast:
            "group toast max-w-[calc(100vw-2rem)] overflow-hidden group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg sm:max-w-[356px]",
          description: "break-words leading-relaxed group-[.toast]:text-muted-foreground",
          actionButton: "shrink-0 group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
