import { CalendarDays } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ProposalMapPreview } from "./ProposalMapPreview";

interface ProposalMessageProps {
  text: string;
  slug: string;
  isMe: boolean;
  time: string;
  /** Called when the link is followed, e.g. to close a popup. */
  onNavigate?: () => void;
}

/** A chat bubble for a proposal message: the sentence, a map of the meeting point and a link to the event. */
export function ProposalMessage({ text, slug, isMe, time, onNavigate }: ProposalMessageProps) {
  return (
    <div
      className={`message-fade-in max-w-[85%] rounded-2xl overflow-hidden border ${
        isMe ? "bg-blue-600 border-blue-600 text-white rounded-br-md" : "bg-white border-gray-200 text-gray-900 rounded-bl-md"
      }`}
    >
      <div className="px-3 py-2">
        <p className={`flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide ${isMe ? "text-blue-200" : "text-blue-700"}`}>
          <CalendarDays className="w-3.5 h-3.5" />
          Forslag
        </p>
        <p className="whitespace-pre-wrap break-words text-base mt-1">{text}</p>
        <p className={`text-[10px] mt-0.5 ${isMe ? "text-blue-200" : "text-gray-400"}`}>{time}</p>
      </div>
      <ProposalMapPreview slug={slug} />
      <Link
        to="/activities/$slug"
        params={{ slug }}
        onClick={onNavigate}
        className={`block px-3 py-2 text-sm font-medium text-center no-underline ${
          isMe ? "bg-blue-700 text-white hover:bg-blue-800" : "bg-green-50 text-green-800 hover:bg-green-100"
        }`}
      >
        {isMe ? "Se forslaget" : "Se forslaget og svar"}
      </Link>
    </div>
  );
}
