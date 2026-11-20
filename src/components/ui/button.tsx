import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded font-sans text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        lime: "bg-lime text-ink hover:bg-lime-600",
        ink: "bg-ink text-paper hover:bg-ink-700",
        outline: "border border-line bg-white text-ink hover:bg-paper",
        "outline-dark": "border border-ink-600 bg-transparent text-paper hover:bg-ink-700",
        ghost: "text-ink hover:bg-ink/5",
        "ghost-dark": "text-paper/80 hover:bg-white/5 hover:text-paper",
        subtle: "bg-paper text-ink hover:bg-line",
        "subtle-dark": "bg-ink-700 text-paper hover:bg-ink-600",
        danger: "bg-error text-white hover:bg-error/90",
        link: "h-auto p-0 text-ink underline decoration-lime decoration-2 underline-offset-4 hover:decoration-ink",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-[15px]",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: { variant: "lime", size: "md" },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} {...props}>
        {asChild ? children : (<>{loading && <Loader2 className="animate-spin" aria-hidden />}{children}</>)}
      </Comp>
    );
  },
);
Button.displayName = "Button";
export { buttonVariants };
