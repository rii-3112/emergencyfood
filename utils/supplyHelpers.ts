import type { ExpiryInfo, Supply } from "@/types";

export function migrateSupplyToExpiryDates(supply: Supply): Supply {
  if (supply.expiryDates && supply.expiryDates.length > 0) {
    return supply;
  }

  const expiryDates: ExpiryInfo[] = [
    {
      date: supply.expiryDate,
      quantity: supply.quantity,
      addedAt: supply.registeredAt?.seconds
        ? new Date(supply.registeredAt.seconds * 1000).toISOString()
        : new Date().toISOString(),
    },
  ];

  return {
    ...supply,
    expiryDates,
  };
}

export function getNearestExpiryDate(supply: Supply): string {
  if (!supply.expiryDates || supply.expiryDates.length === 0) {
    return supply.expiryDate;
  }

  const dates = supply.expiryDates.map((e) => e.date).sort();
  return dates[0];
}

export function sortExpiryDates(expiryDates: ExpiryInfo[]): ExpiryInfo[] {
  return [...expiryDates].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

export function getTotalQuantity(supply: Supply): number {
  if (!supply.expiryDates || supply.expiryDates.length === 0) {
    return supply.quantity;
  }

  return supply.expiryDates.reduce((sum, e) => sum + e.quantity, 0);
}

export function consumeFromOldestLot(
  supply: Supply,
  consumeQuantity: number = 1
): {
  updatedSupply: Supply;
  consumedFrom: ExpiryInfo[];
} {
  const migrated = migrateSupplyToExpiryDates(supply);
  const expiryDates = sortExpiryDates(migrated.expiryDates || []);
  const consumedFrom: ExpiryInfo[] = [];

  let remainingToConsume = consumeQuantity;

  for (let i = 0; i < expiryDates.length && remainingToConsume > 0; i++) {
    const lot = expiryDates[i];
    const consumeFromThis = Math.min(lot.quantity, remainingToConsume);

    consumedFrom.push({
      ...lot,
      quantity: consumeFromThis,
    });

    lot.quantity -= consumeFromThis;
    remainingToConsume -= consumeFromThis;
  }

  const updatedExpiryDates = expiryDates.filter((e) => e.quantity > 0);

  const newTotalQuantity = updatedExpiryDates.reduce(
    (sum, e) => sum + e.quantity,
    0
  );

  return {
    updatedSupply: {
      ...migrated,
      quantity: newTotalQuantity,
      expiryDates: updatedExpiryDates,
      expiryDate:
        updatedExpiryDates.length > 0
          ? getNearestExpiryDate({
              ...migrated,
              expiryDates: updatedExpiryDates,
            })
          : migrated.expiryDate,
      lastConsumedDate: new Date().toISOString(),
      consumptionCount: (migrated.consumptionCount || 0) + consumeQuantity,
    },
    consumedFrom,
  };
}

export function addNewLot(
  supply: Supply,
  newExpiryDate: string,
  newQuantity: number,
  purchasePrice?: number
): Supply {
  const migrated = migrateSupplyToExpiryDates(supply);
  const expiryDates = migrated.expiryDates || [];

  const existingIndex = expiryDates.findIndex((e) => e.date === newExpiryDate);

  if (existingIndex >= 0) {
    expiryDates[existingIndex].quantity += newQuantity;
    if (purchasePrice !== undefined) {
      expiryDates[existingIndex].purchasePrice = purchasePrice;
    }
  } else {
    expiryDates.push({
      date: newExpiryDate,
      quantity: newQuantity,
      addedAt: new Date().toISOString(),
      purchasePrice,
    });
  }

  const newTotalQuantity = expiryDates.reduce((sum, e) => sum + e.quantity, 0);

  const nearestDate = getNearestExpiryDate({
    ...migrated,
    expiryDates,
  });

  return {
    ...migrated,
    quantity: newTotalQuantity,
    expiryDates,
    expiryDate: nearestDate,
  };
}
