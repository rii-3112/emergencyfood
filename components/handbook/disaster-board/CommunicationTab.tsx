"use client";

import type { FamilyAgreement, SafetyConfirmationMethod } from "@/types/forms";

import { FamilyAgreementsForm } from "./FamilyAgreementsForm";
import { SafetyMethodsForm } from "./SafetyMethodsForm";

interface CommunicationTabProps {
  methods: SafetyConfirmationMethod[];
  agreements: FamilyAgreement[];
  onMethodsUpdate: (methods: SafetyConfirmationMethod[]) => void;
  onAgreementsUpdate: (agreements: FamilyAgreement[]) => void;
  startAddingMethods?: boolean;
  startAddingAgreements?: boolean;
}

export function CommunicationTab({
  methods,
  agreements,
  onMethodsUpdate,
  onAgreementsUpdate,
  startAddingMethods = false,
  startAddingAgreements = false,
}: CommunicationTabProps) {
  return (
    <div className='space-y-8'>
      <SafetyMethodsForm
        methods={methods}
        startAdding={startAddingMethods}
        onUpdate={onMethodsUpdate}
      />

      <FamilyAgreementsForm
        agreements={agreements}
        startAdding={startAddingAgreements}
        onUpdate={onAgreementsUpdate}
      />
    </div>
  );
}
