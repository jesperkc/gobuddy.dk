import * as React from "react";

import { Input, InputIcon, InputRoot } from "./input";
import { cva, VariantProps } from "class-variance-authority";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const inputVariants = cva(
  "flex h-9 w-full rounded-md bg-transparent border px-3 py-1 text-base transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
  {
    variants: {
      variant: {
        default: "border-input shadow-xs focus-visible:ring-ring",
        destructive:
          "border-destructive shadow-xs focus-visible:ring-destructive",
        ghost: "border-transparent -mx-3 -my-1 focus-visible:ring-ring",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface InputProps
  extends React.ComponentProps<"input">,
    VariantProps<typeof inputVariants> {
  ref?: React.ForwardedRef<HTMLInputElement>;
  icon?: React.ReactNode;
  rootClassName?: string;
}
function InputWithIcon(props: InputProps) {
  return (
    <InputRoot className={props.rootClassName}>
      <InputIcon>{props.icon}</InputIcon>
      <Input {...props} />
    </InputRoot>
  );
}
Input.displayName = "InputWithIcon";

export { InputWithIcon };
