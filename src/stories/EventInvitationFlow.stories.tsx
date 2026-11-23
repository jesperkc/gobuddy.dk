import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { expect, waitFor, within, userEvent } from "storybook/test";
import { routeTree } from "../../app/routeTree.gen";
import { mockDb } from "../../.storybook/mocks/supabase";
import { jesper, mette, seedInvitation } from "./fixtures";

/**
 * The real app (route tree, root route, AuthProvider, event page) on top of the
 * in-memory Supabase. Each story starts at a URL and plays what a user does.
 */
function App({ path }: { path: string }) {
  const [router] = useState(() => createRouter({ routeTree, history: createMemoryHistory({ initialEntries: [path] }) }));
  return <RouterProvider router={router} />;
}

const meta = {
  title: "Flows/Invitation til en tur",
  parameters: { layout: "fullscreen" },
  render: () => <App path="/activities/loeb-med-jesper" />,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** Jesper opens Mette's invitation, says yes, and is on the participant list. */
export const AcceptInvitation: Story = {
  beforeEach: () => seedInvitation(jesper),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(await canvas.findByText(/har foreslået det her til dig/)).toBeInTheDocument();
    expect(canvas.getByText("1 deltager / 2")).toBeInTheDocument();

    await userEvent.click(canvas.getByRole("button", { name: "Ja, jeg kommer" }));

    expect(await canvas.findByRole("button", { name: "Afmeld" })).toBeInTheDocument();
    await waitFor(() => expect(canvas.getByText("2 deltagere / 2")).toBeInTheDocument());
    expect(mockDb.rows("event_participants").map((p) => p.profile_id)).toEqual([mette.id, jesper.id]);
  },
};

/** The whole path: Jesper gets Mette's message in the chat, opens the proposal from it, and accepts. */
export const ReceiveInChatAndAccept: Story = {
  render: () => <App path="/chat/profile-mette" />,
  beforeEach: () => {
    seedInvitation(jesper);
    mockDb.rows("messages").push({
      id: "message-1",
      sender_id: mette.id,
      receiver_id: jesper.id,
      content: "Skal vi løbe en tur søndag?\n📍 Søerne – ved Dronning Louises Bro\n/activities/loeb-med-jesper",
      created_at: new Date().toISOString(),
    });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("link", { name: "Se forslaget og svar" }));

    expect(await canvas.findByText(/har foreslået det her til dig/)).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Ja, jeg kommer" }));
    expect(await canvas.findByRole("button", { name: "Afmeld" })).toBeInTheDocument();
  },
};

/** Mette, who sent the invitation, can edit or cancel but not accept it herself. */
export const SenderView: Story = {
  beforeEach: () => seedInvitation(mette),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(await canvas.findByRole("button", { name: "Aflys" })).toBeInTheDocument();
    expect(canvas.queryByRole("button", { name: "Ja, jeg kommer" })).not.toBeInTheDocument();
  },
};

/** A third person finds the link after the invitation was taken. */
export const AlreadyFull: Story = {
  beforeEach: () => {
    seedInvitation(jesper);
    mockDb.rows("event_participants").push({ event_id: "event-1", profile_id: "profile-someone" });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(await canvas.findByRole("button", { name: "Fuldt booket" })).toBeDisabled();
  },
};
