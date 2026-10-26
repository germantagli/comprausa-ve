"use client";

import { useState } from "react";
import { ProductList, SearchForm, StoreList } from "./catalog-views";
import { pageStyle, titleStyle } from "./styles";

export function ExploreScreen() {
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");

  return (
    <main style={pageStyle}>
      <h1 style={titleStyle}>Explorar</h1>
      <SearchForm value={draft} onChange={setDraft} onSubmit={() => setQuery(draft.trim())} />
      <ProductList query={query} />
      <StoreList title="Tiendas internas" label="Tiendas internas" />
    </main>
  );
}
