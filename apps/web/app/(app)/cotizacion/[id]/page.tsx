import { QuoteScreen } from "../../../components/quote-screen";

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <QuoteScreen quoteId={id} />;
}