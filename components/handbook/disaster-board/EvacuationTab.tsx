"use client";

import type { EvacuationRoute, EvacuationSite } from "@/types/forms";

import { EvacuationRoutesForm } from "./EvacuationRoutesForm";
import { EvacuationSitesForm } from "./EvacuationSitesForm";

interface EvacuationTabProps {
  sites: EvacuationSite[];
  routes: EvacuationRoute[];
  onSitesUpdate: (sites: EvacuationSite[]) => void;
  onRoutesUpdate: (routes: EvacuationRoute[]) => void;
}

export function EvacuationTab({
  sites,
  routes,
  onSitesUpdate,
  onRoutesUpdate,
}: EvacuationTabProps) {
  return (
    <div className='space-y-8'>
      <EvacuationSitesForm sites={sites} onUpdate={onSitesUpdate} />

      <EvacuationRoutesForm routes={routes} onUpdate={onRoutesUpdate} />
    </div>
  );
}
