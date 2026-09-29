"use client";

import type { EvacuationRoute, EvacuationSite } from "@/types/forms";

import { EvacuationRoutesForm } from "./EvacuationRoutesForm";
import { EvacuationSitesForm } from "./EvacuationSitesForm";

interface EvacuationTabProps {
  sites: EvacuationSite[];
  routes: EvacuationRoute[];
  onSitesUpdate: (sites: EvacuationSite[]) => void;
  onRoutesUpdate: (routes: EvacuationRoute[]) => void;
  startAddingSites?: boolean;
  startAddingRoutes?: boolean;
}

export function EvacuationTab({
  sites,
  routes,
  onSitesUpdate,
  onRoutesUpdate,
  startAddingSites = false,
  startAddingRoutes = false,
}: EvacuationTabProps) {
  return (
    <div className='space-y-8'>
      <EvacuationSitesForm
        sites={sites}
        startAdding={startAddingSites}
        onUpdate={onSitesUpdate}
      />

      <EvacuationRoutesForm
        routes={routes}
        startAdding={startAddingRoutes}
        onUpdate={onRoutesUpdate}
      />
    </div>
  );
}
