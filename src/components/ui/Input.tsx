import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full rounded-xl border-2 border-sky-200 bg-white px-4 py-2.5 text-sky-900 placeholder:text-sky-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-300 disabled:opacity-50 ${className}`}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
