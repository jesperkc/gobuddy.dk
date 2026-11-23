import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider, Outlet } from "@tanstack/react-router";
import { expect, fn, waitFor, within, userEvent } from "storybook/test";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProposalDialog } from "@/components/ProposalDialog";
import { ProposalMessage } from "@/components/ProposalMessage";
import { Toaster } from "sonner";
import { mockDb } from "../../.storybook/mocks/supabase";
import { daysFromNow, jesper, mette, seedBuddies } from "./fixtures";

/**
 * Router + auth shell for components that use <Link> and useAuth, backed by the
 * in-memory Supabase from .storybook/mocks. Not the full app: see EventInvitationFlow.
 */
function Shell({ children }: { children: React.ReactNode }) {
  const [router] = useState(() => {
    const root = createRootRoute({
      component: () => (
        <AuthProvider>
          <Outlet />
          <Toaster position="top-right" richColors />
        </AuthProvider>
      ),
    });
    const event = createRoute({ getParentRoute: () => root, path: "/activities/$slug", component: () => <p className="text-sm text-gray-500">Her åbner aktivitetssiden. Se "Invitation til en tur" for hele forløbet.</p> });
    const home = createRoute({ getParentRoute: () => root, path: "/", component: () => <>{children}</> });
    return createRouter({ routeTree: root.addChildren([home, event]), history: createMemoryHistory({ initialEntries: ["/"] }) });
  });
  return <RouterProvider router={router} />;
}

const meta = {
  title: "Flows/Foreslå en tur",
  parameters: { layout: "padded" },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function DialogHarness({ onSent }: { onSent: () => void }) {
  const [open, setOpen] = useState(true);
  return (
    <Shell>
      <ProposalDialog open={open} onOpenChange={setOpen} buddyId={mette.id} buddyName="Mette" onSent={onSent} />
    </Shell>
  );
}

/** Jesper opens the dialog, picks a date and sends. The event and the chat message must exist afterwards. */
export const SendProposal: Story = {
  args: { onSent: fn() } as never,
  beforeEach: () => seedBuddies(jesper),
  render: (args) => <DialogHarness onSent={(args as unknown as { onSent: () => void }).onSent} />,
  play: async ({ args }) => {
    const body = within(document.body);
    const date = daysFromNow(4);

    // The form waits for the profile + interests to load; the shared interest is preselected.
    const dateInput = await body.findByLabelText("Dato");
    await body.findByText(/Skal vi/, undefined, { timeout: 100 }).catch(() => undefined);
    await userEvent.type(dateInput, date);
    await userEvent.type(body.getByLabelText("Tid (valgfri)"), "10:00");

    const send = await body.findByRole("button", { name: "Send forslag til Mette" });
    await waitFor(() => expect(send).toBeEnabled());
    await userEvent.click(send);

    await waitFor(() => expect((args as unknown as { onSent: () => void }).onSent).toHaveBeenCalled());

    const [event] = mockDb.rows("events");
    expect(event).toMatchObject({ creator_id: jesper.id, title: "Løb med Mette", event_date: date, max_participants: 2 });
    expect(mockDb.rows("event_participants")).toEqual([expect.objectContaining({ profile_id: jesper.id })]);

    const [message] = mockDb.rows("messages");
    expect(message).toMatchObject({ sender_id: jesper.id, receiver_id: mette.id });
    expect(message.content).toMatch(/^Skal vi .* kl\. 10:00\?\n📍 København\n\/activities\/.+/);
  },
};

/** What Mette sees in the chat: the sentence and a link to answer. */
export const ReceivedProposal: Story = {
  render: () => (
    <Shell>
      <ProposalMessage text={"Skal vi løbe en tur lørdag 15. november kl. 10:00?\n📍 Søerne – ved Dronning Louises Bro"} slug="loeb-med-jesper" isMe={false} time="14:02" />
    </Shell>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(await canvas.findByRole("link", { name: "Se forslaget og svar" })).toHaveAttribute("href", "/activities/loeb-med-jesper");
  },
};

/** The sender's view of the same message. */
export const SentProposal: Story = {
  render: () => (
    <Shell>
      <ProposalMessage text={"Skal vi løbe en tur lørdag 15. november kl. 10:00?\n📍 Søerne – ved Dronning Louises Bro"} slug="loeb-med-jesper" isMe time="14:02" />
    </Shell>
  ),
};
