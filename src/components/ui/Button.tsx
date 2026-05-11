import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    isLoading?: boolean;
    variant?: ButtonVariant;
    fullWidth?: boolean;
  }
>;

export default function Button({
  children,
  className,
  disabled,
  fullWidth = false,
  isLoading = false,
  variant = "primary",
  type = "button",
  ...rest
}: ButtonProps) {
  const classes = [
    "button",
    `button-${variant}`,
    fullWidth ? "button-full" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={classes} disabled={disabled || isLoading} {...rest}>
      {isLoading ? (
        <>
          <span className="button-spinner" aria-hidden="true" />
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
