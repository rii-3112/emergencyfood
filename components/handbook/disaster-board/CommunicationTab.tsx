"use client";

import type { FamilyAgreement, SafetyConfirmationMethod } from "@/types/forms";

import { FamilyAgreementsForm } from "./FamilyAgreementsForm";
import { SafetyMethodsForm } from "./SafetyMethodsForm";

interface CommunicationTabProps {
  methods: SafetyConfirmationMethod[];
  agreements: FamilyAgreement[];
  onMethodsUpdate: (methods: SafetyConfirmationMethod[]) => void;
  onAgreementsUpdate: (agreements: FamilyAgreement[]) => void;
}

export function CommunicationTab({
  methods,
  agreements,
  onMethodsUpdate,
  onAgreementsUpdate,
}: CommunicationTabProps) {
  return (
    <div className='space-y-8'>
      <SafetyMethodsForm methods={methods} onUpdate={onMethodsUpdate} />

      <FamilyAgreementsForm
        agreements={agreements}
        onUpdate={onAgreementsUpdate}
      />
    </div>
  );
}
