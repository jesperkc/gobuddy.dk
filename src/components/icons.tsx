import { AlertCircle, CheckCircle, Sparkles } from "lucide-react";

export const SuccessIcon = (props: React.ComponentProps<typeof Sparkles>) => <CheckCircle {...props} />;
export const ErrorIcon = (props: React.ComponentProps<typeof Sparkles>) => <AlertCircle {...props} />;
export const AIIcon = (props: React.ComponentProps<typeof Sparkles>) => <Sparkles {...props} />;
