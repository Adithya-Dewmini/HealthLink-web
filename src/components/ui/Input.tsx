import { forwardRef, type InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  labelClassName?: string;
  wrapperClassName?: string;
};

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, id, label, labelClassName, wrapperClassName, ...props },
  ref
) {
  return (
    <label className={wrapperClassName || "field-group"} htmlFor={id}>
      <span className={labelClassName || "field-label"}>{label}</span>
      <input id={id} ref={ref} className={className || "field-input"} {...props} />
    </label>
  );
});

export default Input;
