/**
 * Registry of the UX flows that have stories. The "Flows › Overblik" page renders it.
 * When you add a flow story, add the flow (or a step) here too; the Overblik
 * page has a check that every story id below still exists.
 */
export type FlowStatus = "live" | "prototype";

export interface FlowStep {
  /** Who acts in this step. Steps with different actors are shown in different colours. */
  actor: string;
  text: string;
  /** Story that plays this step (id from the Storybook URL). */
  story?: string;
}

export interface Flow {
  title: string;
  status: FlowStatus;
  summary: string;
  steps: FlowStep[];
}

export const FLOWS: Flow[] = [
  {
    title: "Foreslå en tur",
    status: "live",
    summary: "Én buddy foreslår en konkret tur til en anden, direkte fra chatten.",
    steps: [
      { actor: "Jesper", text: "Åbner “Foreslå en tur”, vælger dato, tid og sted og sender", story: "flows-foreslå-en-tur--send-proposal" },
      { actor: "Jesper", text: "Ser sit forslag i chatten", story: "flows-foreslå-en-tur--sent-proposal" },
      { actor: "Mette", text: "Får forslaget som besked med link", story: "flows-foreslå-en-tur--received-proposal" },
    ],
  },
  {
    title: "Invitation til en tur",
    status: "live",
    summary: "Den inviterede åbner forslaget og siger ja. Opretteren kan ikke selv svare, og en fuld tur kan ikke tages.",
    steps: [
      { actor: "Jesper", text: "Åbner Mettes besked i chatten og følger linket", story: "flows-invitation-til-en-tur--receive-in-chat-and-accept" },
      { actor: "Jesper", text: "Trykker “Ja, jeg kommer” og står på deltagerlisten", story: "flows-invitation-til-en-tur--accept-invitation" },
      { actor: "Mette", text: "Ser sin egen tur med Rediger og Aflys, men kan ikke acceptere", story: "flows-invitation-til-en-tur--sender-view" },
      { actor: "Andre", text: "Finder linket, efter turen er fuld, og ser “Fuldt booket”", story: "flows-invitation-til-en-tur--already-full" },
    ],
  },
  {
    title: "Foreslå et andet tidspunkt",
    status: "prototype",
    summary: "Den inviterede foreslår et nyt tidspunkt, og opretteren godkender eller afviser. Kun UI, ingen database endnu.",
    steps: [
      { actor: "Jesper", text: "Foreslår en anden dato og tid med en besked", story: "flows-foreslå-et-andet-tidspunkt--pending-for-suggester" },
      { actor: "Mette", text: "Ser forslaget og godkender: tidspunktet ændres og Jesper er med", story: "flows-foreslå-et-andet-tidspunkt--suggest-and-approve" },
      { actor: "Mette", text: "Afviser: tidspunktet er uændret", story: "flows-foreslå-et-andet-tidspunkt--declined" },
      { actor: "Jesper", text: "Trækker forslaget tilbage, før der er svaret", story: "flows-foreslå-et-andet-tidspunkt--withdrawn" },
    ],
  },
];
