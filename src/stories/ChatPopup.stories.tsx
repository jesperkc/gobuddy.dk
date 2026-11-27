import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider, Outlet } from "@tanstack/react-router";
import { expect, waitFor, within, userEvent } from "storybook/test";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { ChatPopup } from "@/components/ChatPopup";
import { useChatPopupStore } from "@/store/chatPopup";
import { mockDb, type MockUser } from "../../.storybook/mocks/supabase";
import { jesper, mette, seedBuddies } from "./fixtures";

/** Router + auth shell with the routes the popup links to, and a page behind it. */
function Shell() {
  const [router] = useState(() => {
    const root = createRootRoute({
      component: () => (
        <AuthProvider>
          <div className="min-h-screen bg-gray-50">
            <Outlet />
          </div>
          <ChatPopup />
          <Toaster position="top-right" richColors />
        </AuthProvider>
      ),
    });
    const page = (path: string, text: string) =>
      createRoute({ getParentRoute: () => root, path, component: () => <p className="p-6 text-sm text-gray-500">{text}</p> });
    const routes = [
      page("/", "Siden bag chatvinduet."),
      page("/buddy/$slug", "Her åbner buddyens profil."),
      page("/chat/$buddyId", "Her åbner den fulde chat."),
      page("/activities/$slug", "Her åbner aktivitetssiden."),
    ];
    return createRouter({ routeTree: root.addChildren(routes), history: createMemoryHistory({ initialEntries: ["/"] }) });
  });
  return <RouterProvider router={router} />;
}

const meta = {
  title: "Komponenter/ChatPopup",
  parameters: { layout: "fullscreen" },
  render: () => <Shell />,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function at(daysAgo: number, time: string): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const [h, m] = time.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

function message(id: number, from: MockUser, to: MockUser, content: string, createdAt: string) {
  return { id, sender_id: from.id, receiver_id: to.id, content, created_at: createdAt, read_at: null as string | null, unsent_at: null as string | null };
}

/** Seed the buddies, log in as `me`, and open the popup on the other one. */
function openChat(me: MockUser, messages: ReturnType<typeof message>[] = [], hi5s: Record<string, unknown>[] = []) {
  seedBuddies(me, { messages, hi5s });
  const buddy = me === jesper ? { id: mette.id, name: "Mette" } : { id: jesper.id, name: "Jesper" };
  useChatPopupStore.setState({ isOpen: true, buddyId: buddy.id, buddyName: buddy.name });
}

/** Jesper's chat with Mette: highfives both ways, text over two days and a proposal. */
export const Conversation: Story = {
  beforeEach: () =>
    openChat(jesper, [
      message(1, mette, jesper, "👋", at(1, "18:40")),
      message(2, jesper, mette, "👋", at(1, "18:52")),
      message(3, mette, jesper, "Hej Jesper! Jeg så du også løber. Hvor plejer du at løbe?", at(1, "19:05")),
      message(4, jesper, mette, "Mest rundt om Søerne, et par gange om ugen 🏃", at(0, "08:12")),
      message(5, mette, jesper, "Skal vi løbe en tur lørdag kl. 10:00?\n📍 Søerne – ved Dronning Louises Bro\n/activities/loeb-med-jesper", at(0, "08:20")),
    ]),
  play: async () => {
    const body = within(document.body);
    expect(await body.findByText(/Hvor plejer du at løbe/)).toBeInTheDocument();
    expect(body.getByText("I går")).toBeInTheDocument();
    expect(body.getByText("I dag")).toBeInTheDocument();
    expect(body.getByRole("link", { name: "Se forslaget og svar" })).toBeInTheDocument();
  },
};

/** No messages yet. */
export const Empty: Story = {
  beforeEach: () => openChat(jesper),
  play: async () => {
    expect(await within(document.body).findByText("Skriv den første besked! 👋")).toBeInTheDocument();
  },
};

const sentHi5 = () =>
  openChat(jesper, [message(1, jesper, mette, "👋", at(0, "09:30"))], [{ sender_id: jesper.id, receiver_id: mette.id }]);

/** Like Messenger: the ⋯ next to your own highfive opens "Fortryd afsendelse", which asks first. */
export const ConfirmUnsend: Story = {
  beforeEach: sentHi5,
  play: async () => {
    const body = within(document.body);
    await userEvent.click(await body.findByRole("button", { name: "Flere handlinger" }));
    await userEvent.click(await body.findByRole("menuitem", { name: "Fortryd afsendelse" }));
    expect(await body.findByRole("dialog", { name: "Fortryd afsendelse?" })).toBeInTheDocument();
  },
};

/** Jesper unsends his highfive: a placeholder takes its place and the hi5 record is gone. */
export const UnsendHighfive: Story = {
  beforeEach: sentHi5,
  play: async () => {
    const body = within(document.body);
    await userEvent.click(await body.findByRole("button", { name: "Flere handlinger" }));
    await userEvent.click(await body.findByRole("menuitem", { name: "Fortryd afsendelse" }));
    await userEvent.click(await body.findByRole("button", { name: "Fortryd afsendelse" }));

    expect(await body.findByText("Du har fortrudt en highfive")).toBeInTheDocument();
    await waitFor(() => expect(body.queryByRole("dialog")).not.toBeInTheDocument());
    expect(mockDb.rows("messages")[0].unsent_at).toBeTruthy();
    expect(mockDb.rows("hi5s")).toEqual([]);
  },
};

/** Mette's view of Jesper's highfive: no ⋯ menu, she can't unsend it. */
const receivedAt = at(0, "09:30");
export const ReceivedHighfive: Story = {
  beforeEach: () => openChat(mette, [message(1, jesper, mette, "👋", receivedAt)], [{ sender_id: jesper.id, receiver_id: mette.id }]),
  play: async () => {
    const body = within(document.body);
    const time = new Date(receivedAt).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });
    expect(await body.findByText(time)).toBeInTheDocument();
    expect(body.queryByRole("button", { name: "Flere handlinger" })).not.toBeInTheDocument();
  },
};

/** Mette's view after Jesper unsent it. */
export const ReceivedUnsentHighfive: Story = {
  beforeEach: () => openChat(mette, [{ ...message(1, jesper, mette, "👋", at(0, "09:30")), unsent_at: at(0, "09:31") }]),
  play: async () => {
    expect(await within(document.body).findByText("Jesper har fortrudt en highfive")).toBeInTheDocument();
  },
};

/** An unread text message can be unsent too; its text is gone from the database. */
export const UnsendUnreadMessage: Story = {
  beforeEach: () => openChat(jesper, [message(1, jesper, mette, "Hej Mette! Skal vi løbe en tur i weekenden?", at(0, "09:30"))]),
  play: async () => {
    const body = within(document.body);
    await userEvent.click(await body.findByRole("button", { name: "Flere handlinger" }));
    await userEvent.click(await body.findByRole("menuitem", { name: "Fortryd afsendelse" }));
    expect(await body.findByText(/så længe Mette ikke har læst den/)).toBeInTheDocument();
    await userEvent.click(await body.findByRole("button", { name: "Fortryd afsendelse" }));

    expect(await body.findByText("Du har fortrudt en besked")).toBeInTheDocument();
    expect(mockDb.rows("messages")[0]).toMatchObject({ content: "", unsent_at: expect.any(String) });
  },
};

/** Once Mette has read it, the message can't be unsent: no ⋯ menu. */
export const ReadMessage: Story = {
  beforeEach: () =>
    openChat(jesper, [{ ...message(1, jesper, mette, "Hej Mette! Skal vi løbe en tur i weekenden?", at(0, "09:30")), read_at: at(0, "09:35") }]),
  play: async () => {
    const body = within(document.body);
    expect(await body.findByText(/Skal vi løbe en tur i weekenden/)).toBeInTheDocument();
    expect(body.queryByRole("button", { name: "Flere handlinger" })).not.toBeInTheDocument();
  },
};

/** Mette opens the chat: Jesper's messages are now read, so he can no longer unsend the text. */
export const OpeningMarksAsRead: Story = {
  beforeEach: () => openChat(mette, [message(1, jesper, mette, "Hej Mette! Skal vi løbe en tur i weekenden?", at(0, "09:30"))]),
  play: async () => {
    await within(document.body).findByText(/Skal vi løbe en tur i weekenden/);
    await waitFor(() => expect(mockDb.rows("messages")[0].read_at).toBeTruthy());
  },
};

/** Mette's view after Jesper unsent a message. */
export const ReceivedUnsentMessage: Story = {
  beforeEach: () => openChat(mette, [{ ...message(1, jesper, mette, "", at(0, "09:30")), unsent_at: at(0, "09:31") }]),
  play: async () => {
    expect(await within(document.body).findByText("Jesper har fortrudt en besked")).toBeInTheDocument();
  },
};

/** Messages that are only emoji have no bubble (like the highfive); mixed text keeps it. */
export const EmojiMessages: Story = {
  beforeEach: () =>
    openChat(jesper, [
      message(1, mette, jesper, "Hej! Skal vi løbe i morgen? 🏃", at(0, "09:30")),
      message(2, jesper, mette, "👍🏽", at(0, "09:31")),
      message(3, mette, jesper, "😂🙌", at(0, "09:32")),
      message(4, jesper, mette, "🏃‍♀️🏃🌳☀️🇩🇰", at(0, "09:33")),
    ]),
  play: async () => {
    const body = within(document.body);
    const bubbleOf = (el: HTMLElement) => el.closest(".rounded-2xl");
    expect(bubbleOf(await body.findByText("Hej! Skal vi løbe i morgen? 🏃"))).not.toBeNull();
    expect(bubbleOf(body.getByText("😂🙌"))).toBeNull();
    expect(bubbleOf(body.getByText("👍🏽"))).toBeNull();
    expect(bubbleOf(body.getByText("🏃‍♀️🏃🌳☀️🇩🇰"))).toBeNull();
  },
};

/** Minimized to the header bar. */
export const Minimized: Story = {
  beforeEach: () => openChat(jesper, [message(1, mette, jesper, "Hej! 👋 Skal vi løbe sammen?", at(0, "09:30"))]),
  play: async () => {
    const body = within(document.body);
    await body.findByText("Hej! 👋 Skal vi løbe sammen?");
    await userEvent.click(body.getByRole("button", { name: "Minimer chat" }));
    expect(body.queryByPlaceholderText("Skriv en besked...")).not.toBeInTheDocument();
  },
};
