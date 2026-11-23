import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Calendar, MapPin } from "lucide-react";
import { expect, within, userEvent } from "storybook/test";
import { Button } from "@/components/ui/button";
import { SuggestTimeDialog, TimeSuggestionCard, formatSuggestionTime, type TimeSuggestion } from "@/components/TimeSuggestion";
import { daysFromNow } from "./fixtures";

type Viewer = "creator" | "invitee";

/** A stripped-down event page: the event's time, the viewer's actions and the suggestion card. */
function EventPageHarness({ initial = null, startAs = "invitee" }: { initial?: TimeSuggestion | null; startAs?: Viewer }) {
  const [viewer, setViewer] = useState<Viewer>(startAs);
  const [time, setTime] = useState({ date: daysFromNow(3), time: "10:00" as string | null });
  const [suggestion, setSuggestion] = useState<TimeSuggestion | null>(initial);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [joined, setJoined] = useState(false);

  const canSuggest = viewer === "invitee" && !joined && suggestion?.status !== "pending";
  const resolve = (status: TimeSuggestion["status"]) => setSuggestion((s) => (s ? { ...s, status } : s));

  return (
    <div className="w-[420px] space-y-4">
      <div className="flex gap-2 text-xs">
        <span className="text-gray-400">Vis som:</span>
        <button className={viewer === "invitee" ? "font-bold" : "underline"} onClick={() => setViewer("invitee")}>
          Jesper (inviteret)
        </button>
        <button className={viewer === "creator" ? "font-bold" : "underline"} onClick={() => setViewer("creator")}>
          Mette (opretter)
        </button>
      </div>

      <h1 className="text-2xl font-bold">Løb med Jesper</h1>
      <div className="flex flex-col gap-1.5 text-sm text-gray-500">
        <span className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4" />
          <span className="capitalize" data-testid="event-time">{formatSuggestionTime(time.date, time.time)}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <MapPin className="h-4 w-4" />
          Søerne, København
        </span>
        <span>{joined ? "2 deltagere / 2" : "1 deltager / 2"}</span>
      </div>

      {viewer === "invitee" && !joined && (
        <div className="flex gap-3">
          <Button onClick={() => setJoined(true)}>Ja, jeg kommer</Button>
          {canSuggest && (
            <Button variant="outline" onClick={() => setDialogOpen(true)}>
              Foreslå et andet tidspunkt
            </Button>
          )}
        </div>
      )}
      {viewer === "invitee" && joined && <Button variant="outline">Afmeld</Button>}

      {suggestion && (
        <TimeSuggestionCard
          suggestion={suggestion}
          viewer={viewer === "creator" ? "creator" : "suggester"}
          onApprove={() => {
            setTime({ date: suggestion.date, time: suggestion.time });
            setJoined(true); // the suggester asked for this time, so approving it also confirms them
            resolve("approved");
          }}
          onDecline={() => resolve("declined")}
          onWithdraw={() => resolve("withdrawn")}
        />
      )}

      <SuggestTimeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        creatorName="Mette"
        onSubmit={(input) => setSuggestion({ ...input, status: "pending", suggestedBy: "Jesper" })}
      />
    </div>
  );
}

const meta = {
  title: "Flows/Foreslå et andet tidspunkt",
  parameters: { layout: "padded" },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const pending = (): TimeSuggestion => ({ date: daysFromNow(5), time: "18:30", note: "Jeg skal arbejde søndag", status: "pending", suggestedBy: "Jesper" });

/** Click through the whole thing: suggest as Jesper, switch to Mette, approve. */
export const SuggestAndApprove: Story = {
  render: () => <EventPageHarness />,
  play: async ({ canvasElement }) => {
    const page = within(canvasElement);
    const body = within(document.body);
    const newDate = daysFromNow(5);

    await userEvent.click(page.getByRole("button", { name: "Foreslå et andet tidspunkt" }));
    await userEvent.type(await body.findByLabelText("Dato"), newDate);
    await userEvent.type(body.getByLabelText("Tid (valgfri)"), "18:30");
    await userEvent.type(body.getByLabelText("Besked (valgfri)"), "Jeg skal arbejde søndag");
    await userEvent.click(body.getByRole("button", { name: "Send forslag" }));

    // Jesper now waits; the event time has not changed yet.
    const card = await page.findByRole("region", { name: "Forslag til nyt tidspunkt" });
    expect(within(card).getByText("Venter på svar")).toBeInTheDocument();
    expect(page.getByTestId("event-time")).toHaveTextContent("kl. 10:00");
    expect(page.queryByRole("button", { name: "Foreslå et andet tidspunkt" })).not.toBeInTheDocument();

    // Mette sees the suggestion and approves it.
    await userEvent.click(page.getByRole("button", { name: "Mette (opretter)" }));
    expect(within(page.getByRole("region")).getByText("Jesper foreslår et andet tidspunkt")).toBeInTheDocument();
    await userEvent.click(page.getByRole("button", { name: "Godkend" }));

    expect(page.getByText("Nyt tidspunkt godkendt")).toBeInTheDocument();
    expect(page.getByTestId("event-time")).toHaveTextContent("kl. 18:30");
    expect(page.getByText("2 deltagere / 2")).toBeInTheDocument();
  },
};

/** Mette says no; Jesper can still say yes to the original time or suggest again. */
export const Declined: Story = {
  render: () => <EventPageHarness initial={pending()} startAs="creator" />,
  play: async ({ canvasElement }) => {
    const page = within(canvasElement);
    await userEvent.click(page.getByRole("button", { name: "Afvis" }));
    expect(page.getByText("Du afviste forslaget")).toBeInTheDocument();
    expect(page.getByTestId("event-time")).toHaveTextContent("kl. 10:00");

    await userEvent.click(page.getByRole("button", { name: "Jesper (inviteret)" }));
    expect(page.getByText("Forslaget blev afvist")).toBeInTheDocument();
    expect(page.getByRole("button", { name: "Foreslå et andet tidspunkt" })).toBeInTheDocument();
  },
};

/** Jesper changes his mind before Mette answers. */
export const Withdrawn: Story = {
  render: () => <EventPageHarness initial={pending()} />,
  play: async ({ canvasElement }) => {
    const page = within(canvasElement);
    await userEvent.click(page.getByRole("button", { name: "Træk tilbage" }));
    expect(page.getByText("Forslaget er trukket tilbage")).toBeInTheDocument();
  },
};

export const PendingForCreator: Story = { render: () => <EventPageHarness initial={pending()} startAs="creator" /> };
export const PendingForSuggester: Story = { render: () => <EventPageHarness initial={pending()} /> };
