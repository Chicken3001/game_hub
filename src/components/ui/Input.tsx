import { forwardRef } from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full rounded-2xl border-2 border-violet-200 bg-white px-4 py-3 text-base font-semibold text-indigo-900 placeholder:font-normal placeholder:text-violet-300 focus:border-orange-400 focus:outline-none focus:ring-4 focus:ring-orange-200 disabled:opacity-50 ${className}`}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
