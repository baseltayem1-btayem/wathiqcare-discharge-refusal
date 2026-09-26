"use client";

import * as React from "react";
import { cn } from "./utils";

type FormContextValue = {
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
};

const FormContext = React.createContext<FormContextValue | null>(null);

type FormProps = React.ComponentProps<"form"> & {
  errors?: Record<string, string>;
};

export function Form({ errors = {}, children, className, ...props }: FormProps) {
  const [internalErrors, setInternalErrors] = React.useState(errors);

  return (
    <FormContext.Provider value={{ errors: internalErrors, setErrors: setInternalErrors }}>
      <form className={cn("space-y-4", className)} {...props}>
        {children}
      </form>
    </FormContext.Provider>
  );
}

type FormFieldProps = {
  name: string;
  children?: React.ReactNode;
  label?: React.ReactNode;
  htmlFor?: string;
  error?: React.ReactNode;
  className?: string;
  labelClassName?: string;
};

export function FormField({
  name,
  children,
  label,
  htmlFor,
  error,
  className,
  labelClassName,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)} data-field-name={name}>
      {label ? (
        <FormLabel htmlFor={htmlFor} className={labelClassName}>
          {label}
        </FormLabel>
      ) : null}
      {children}
      {error ? (
        <p className="text-xs text-[var(--wc-danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function FormLabel({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      className={cn("block text-sm font-medium text-slate-700", className)}
      {...props}
    />
  );
}

export function FormControl({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("relative", className)} {...props} />;
}

export function FormDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("text-xs text-slate-500", className)}
      {...props}
    />
  );
}

export function FormMessage({ name, className, ...props }: React.ComponentProps<"p"> & { name: string }) {
  const ctx = React.useContext(FormContext);
  const error = ctx?.errors[name];

  if (!error) return null;

  return (
    <p
      className={cn("text-xs text-rose-600", className)}
      {...props}
    >
      {error}
    </p>
  );
}

export function FormItem({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("space-y-2", className)} {...props} />
  );
}
