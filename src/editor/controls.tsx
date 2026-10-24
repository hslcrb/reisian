import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import { X, type LucideIcon } from 'lucide-react';
export function IconButton({
  icon: Icon,
  label,
  active,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={`icon-button ${active ? 'is-active' : ''} ${className}`}
      aria-label={label}
      title={label}
      aria-pressed={active}
      {...props}
    >
      <Icon size={17} strokeWidth={1.7} aria-hidden="true" />
    </button>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const id = useId();
  const control = isValidElement(children)
    ? cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        id,
        'aria-label': label,
        'aria-describedby': hint ? `${id}-hint` : undefined,
      })
    : children;
  return (
    <label className="field" htmlFor={id}>
      <span className="field-label">{label}</span>
      {control}
      {hint && (
        <span className="field-hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
    </label>
  );
}
export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="color-control">
        <input
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#ffffff'}
          onChange={(event) => onChange(event.target.value)}
          aria-label={label}
        />
        <span>{value.toUpperCase()}</span>
      </span>
    </label>
  );
}
export function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix = '',
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <label className="field slider-field">
      <span className="field-label">
        {label}
        <output>
          {value}
          {suffix}
        </output>
      </span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
export function Modal({
  title,
  eyebrow,
  open,
  onClose,
  children,
  className = '',
}: {
  title: string;
  eyebrow?: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && !ref.current?.open) ref.current?.showModal();
    if (!open && ref.current?.open) ref.current.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={`modal ${className}`}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-inner">
        <div className="modal-heading">
          <div>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            <h2>{title}</h2>
          </div>
          <IconButton icon={X} label="Close dialog" onClick={onClose} />
        </div>
        {children}
      </div>
    </dialog>
  );
}

export function ValidatedInput({
  value,
  onChange,
  validate,
  maxLength = 2000,
  placeholder,
  ...inputProps
}: {
  value: string;
  onChange: (value: string) => void;
  validate: (value: string) => string | null;
  maxLength?: number;
  placeholder?: string;
  id?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  useEffect(() => {
    setDraft(value);
    setError(null);
  }, [value]);
  return (
    <>
      <input
        {...inputProps}
        value={draft}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={error ? id : inputProps['aria-describedby']}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          const problem = validate(next);
          setError(problem);
          if (!problem) onChange(next);
        }}
        onBlur={() => {
          if (error) {
            setDraft(value);
            setError(null);
          }
        }}
      />
      {error && (
        <span className="validation-error" id={id}>
          Not applied: {error}
        </span>
      )}
    </>
  );
}
