import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowDown } from "lucide-react";
import { expect } from "storybook/test";
import { FLOWS, type FlowStatus } from "./flows";

const ACTOR_STYLES = ["bg-blue-50 border-blue-200 text-blue-900", "bg-green-50 border-green-200 text-green-900", "bg-gray-50 border-gray-200 text-gray-800"];
const STATUS: Record<FlowStatus, { label: string; className: string }> = {
  live: { label: "I appen", className: "bg-green-100 text-green-800" },
  prototype: { label: "Prototype", className: "bg-orange-100 text-orange-800" },
};

const storyHref = (id: string) => `/?path=/story/${encodeURIComponent(id)}`;

function FlowOverview() {
  // Same colour for the same person across all flows.
  const actors = [...new Set(FLOWS.flatMap((f) => f.steps.map((s) => s.actor)))];
  const style = (actor: string) => ACTOR_STYLES[Math.min(actors.indexOf(actor), ACTOR_STYLES.length - 1)];

  return (
    <div className="max-w-6xl p-6">
      <h1 className="text-3xl font-bold">Flows</h1>
      <p className="mt-1 text-gray-600">Alle forløb, der har stories. Klik på et trin for at se det spillet af.</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {actors.map((a) => (
          <span key={a} className={`rounded-full border px-2 py-0.5 ${style(a)}`}>{a}</span>
        ))}
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {FLOWS.map((flow) => (
          <section key={flow.title} className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-semibold">{flow.title}</h2>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS[flow.status].className}`}>{STATUS[flow.status].label}</span>
            </div>
            <p className="mt-1 text-sm text-gray-600">{flow.summary}</p>
            <ol className="mt-4 flex flex-col items-stretch">
              {flow.steps.map((step, i) => {
                const body = (
                  <>
                    <span className="block text-xs font-semibold uppercase tracking-wide opacity-70">{step.actor}</span>
                    <span className="block text-sm">{step.text}</span>
                  </>
                );
                const className = `block rounded-xl border px-3 py-2 no-underline ${style(step.actor)}`;
                return (
                  <li key={i} className="flex flex-col items-center">
                    {i > 0 && <ArrowDown className="my-1 h-4 w-4 text-gray-300" aria-hidden />}
                    <div className="w-full">
                      {step.story ? (
                        <a href={storyHref(step.story)} target="_top" className={`${className} hover:brightness-95`}>{body}</a>
                      ) : (
                        <div className={className}>{body}</div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}

const meta = {
  title: "Flows/Overblik",
  parameters: { layout: "fullscreen" },
  render: () => <FlowOverview />,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Alle: Story = {};

/** Fails when a step points at a story that was renamed or removed. */
export const LinksVirker: Story = {
  play: async () => {
    const index = (await (await fetch("/index.json")).json()) as { entries: Record<string, unknown> };
    const missing = FLOWS.flatMap((f) => f.steps.flatMap((s) => (s.story && !(s.story in index.entries) ? [`${f.title}: ${s.story}`] : [])));
    expect(missing).toEqual([]);
  },
};
