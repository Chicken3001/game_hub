import { forwardRef } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "back";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "primary",
      size = "md",
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const base =
      "inline-flex items-center justify-center font-semibold rounded-2xl transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
    const variants = {
      primary:
        "bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700",
      secondary:
        "bg-amber-200 text-sky-900 hover:bg-amber-300 active:bg-amber-400",
      ghost:
        "bg-transparent text-sky-800 hover:bg-sky-100/80 active:bg-sky-200/80",
      back:
        "bg-sky-50 text-sky-800 border-2 border-sky-300 hover:bg-sky-200 hover:border-sky-400 hover:shadow-md active:bg-sky-300",
    };
    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-base",
      lg: "px-6 py-3 text-lg",
    };

    const hasShadow = variant !== "back";
    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${hasShadow ? "shadow-sm hover:shadow" : ""} ${sizes[size]} ${className}`}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
