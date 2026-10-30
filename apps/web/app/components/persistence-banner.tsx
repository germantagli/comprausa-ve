"use client";

import { getHealth } from "@comprausa/api-client";
import { useEffect, useState, type CSSProperties } from "react";
import { apiBase } from "../lib/api";
import { colors } from "./styles";

/**
 * Warns when the API stores product requests in process memory (demo only).
 * Hidden when health reports postgres/prisma persistence.
 */
export function PersistenceBanner() {
  const [memory, setMemory] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getHealth(apiBase)
      .then((health) => {
        if (!cancelled) {
          setMemory(health.persistence === "memory" || health.productRequests === "memory");
        }
      })
      .catch(() => {
        /* keep hidden if health unreachable */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!memory) {
    return null;
  }

  return (
    <p role="status" style={banner}>
      Modo demostración: las solicitudes se guardan solo en memoria del servidor y se pierden al reiniciar. No es
      PostgreSQL.
    </p>
  );
}

const banner: CSSProperties = {
  background: "#FFF7ED",
  border: "1px solid #FDBA74",
  borderRadius: 12,
  color: "#9A3412",
  fontSize: 13,
  lineHeight: 1.4,
  margin: 0,
  padding: "10px 12px",
};
