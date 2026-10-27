import { Suspense } from "react";
import { FiltersScreen } from "../../components/filters-screen";

export default function FiltrosPage() {
  return (
    <Suspense fallback={<p>Cargando…</p>}>
      <FiltersScreen />
    </Suspense>
  );
}
