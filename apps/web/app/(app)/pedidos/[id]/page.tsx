import { OrderDetailScreen } from "../../../components/orders-screen";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderDetailScreen orderId={id} />;
}
