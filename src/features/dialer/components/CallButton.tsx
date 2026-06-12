import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useCountryFeatures } from "@/shared/hooks/useCountryFeatures";
import { useDialer } from "../hooks/useDialer";
import { normalizeToE164 } from "../lib/phone-utils";

interface Props {
  phone: string | null | undefined;
  contactName: string;
  contactId?: string | null;
  dealId?: string | null;
  className?: string;
}

/** Click-to-call: renders nothing without a phone number. */
export function CallButton({ phone, contactName, contactId, dealId, className }: Props) {
  const dialer = useDialer();
  const { phoneCountryCode } = useCountryFeatures();
  if (!phone) return null;

  const normalized = normalizeToE164(phone, phoneCountryCode);
  const busy = dialer.status === "ringing" || dialer.status === "in_call";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("inline-flex", className)}>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-primary-light hover:bg-primary/15"
            disabled={!normalized || busy}
            aria-label={`Call ${contactName}`}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (!normalized) return;
              void dialer.startCall({ phone: normalized, contactName, contactId, dealId });
            }}
          >
            <Phone className="h-3.5 w-3.5" />
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {!normalized
          ? `Can't call "${phone}" — not a valid number`
          : busy
            ? "A call is already active"
            : `Call ${normalized}`}
      </TooltipContent>
    </Tooltip>
  );
}
