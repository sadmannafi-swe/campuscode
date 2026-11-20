import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n";

export const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  (props, ref) => {
    const [show, setShow] = useState(false);
    const { t } = useI18n();
    return (
      <div className="relative">
        <Input ref={ref} type={show ? "text" : "password"} className="pr-11" {...props} />
        <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? t("auth.hidePassword") : t("auth.showPassword")}
          aria-pressed={show} className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded text-slate hover:text-ink">
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const isStrongPassword = (p: string) => p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);
