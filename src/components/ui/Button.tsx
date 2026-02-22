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
      "inline-flex items-center justify-center font-extrabold rounded-full transition-all duration-100 cursor-pointer focus:outline-none focus:ring-4 focus:ring-orange-300 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none";

    const variants = {
      primary:
        "bg-orange-400 text-white hover:bg-orange-300 active:bg-orange-500 shadow-[0_5px_0_0_#c2410c] active:shadow-[0_2px_0_0_#c2410c] active:translate-y-[3px]",
      secondary:
        "bg-violet-400 text-white hover:bg-violet-300 active:bg-violet-500 shadow-[0_5px_0_0_#5b21b6] active:shadow-[0_2px_0_0_#5b21b6] active:translate-y-[3px]",
      ghost:
        "bg-transparent text-violet-700 hover:bg-violet-100 active:bg-violet-200",
      back:
        "bg-white text-indigo-600 border-2 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-400 hover:shadow-md active:bg-indigo-100",
    };

    const sizes = {
      sm: "px-4 py-2 text-sm",
      md: "px-5 py-2.5 text-base",
      lg: "px-7 py-3.5 text-lg",
    };

    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
