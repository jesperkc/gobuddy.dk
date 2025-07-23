import { ReadonlySignal } from "@preact/signals-react";
import clsx from "clsx";
import { ChangeEventHandler, FocusEventHandler, forwardRef } from "react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";

type TextInputProps = {
  type: "text" | "email" | "tel" | "password" | "url" | "number" | "date";
  name: string;
  value: ReadonlySignal<string | number | undefined>;
  onChange: ChangeEventHandler<HTMLInputElement>;
  onBlur: FocusEventHandler<HTMLInputElement>;
  placeholder?: string;
  required?: boolean;
  className?: string;
  label?: string;
  id?: string;
  error?: ReadonlySignal<string>;
};

/**
 * Text input field that users can type into. Various decorations can be
 * displayed in or around the field to communicate the entry requirements.
 */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(({ className, label, value, error, ...props }) => {
  const { name, id } = props;
  const inputId = id ?? `input-${name}`;

  return (
    <div className={clsx("space-y-2", className)}>
      {label && <Label htmlFor={inputId}>{label}</Label>}
      <Input id={inputId} defaultValue={value.value} {...props} />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
});
