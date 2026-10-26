import { Suspense } from "react";
import { ExploreScreen } from "../../components/explore-screen";

export default function ExplorePage() {
  return (
    <Suspense fallback={<main style={{ padding: 24 }}>Cargando…</main>}>
      <ExploreScreen />
    </Suspense>
  );
}
