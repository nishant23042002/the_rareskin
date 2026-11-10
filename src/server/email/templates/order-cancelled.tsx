import type { OrderCancelledProps } from "../types";
import { EmailLayout } from "./_layout";
import {
  Cta,
  Eyebrow,
  Lede,
  OrderMeta,
  Panel,
  Pieces,
  Summary,
  Title,
} from "./_parts";
import { mockBase } from "./_mock";

/** A reason typed by staff or set by a job may lack a full stop or a capital —
 *  make it a proper sentence so "…at your request Nothing has been charged" can't happen. */
function asSentence(text: string | null | undefined, fallback: string): string {
  const t = (text ?? "").trim();
  if (!t) return fallback;
  const s = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?]$/.test(s) ? s : `${s}.`;
}

export default function OrderCancelled(props: OrderCancelledProps) {
  const { brand, customerName } = props;
  return (
    <EmailLayout brand={brand} preview={`Order ${props.orderNumber} cancelled`}>
      <Eyebrow>Order cancelled</Eyebrow>
      <Title>This one didn&rsquo;t go through, {customerName}.</Title>
      <Lede>
        {asSentence(
          props.reason,
          "Your order was cancelled before payment was completed.",
        )}{" "}
        Nothing has been charged
        {props.refundNote ? `, and ${props.refundNote.toLowerCase()}` : ""}.
      </Lede>

      <OrderMeta orderNumber={props.orderNumber} placedAt={props.placedAt} />
      <Pieces items={props.items} />
      <Summary totals={props.totals} grandLabel="Order value" />

      <Panel heading="Still want these?">
        Everything is back in stock for you — begin a fresh order whenever
        you&rsquo;re ready.
      </Panel>

      <Cta href={brand.siteUrl}>Return to the shop</Cta>
    </EmailLayout>
  );
}

OrderCancelled.PreviewProps = {
  ...mockBase,
  reason: "Payment wasn't completed within 30 minutes.",
  refundNote: "any store credit you used has been returned",
} satisfies OrderCancelledProps;
