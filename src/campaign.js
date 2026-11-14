// Kampagne als Raumfahrtfirma ohne DOM: Restgeld bleibt und finanziert den nächsten Auftrag.
// Geld in Mio. US-Dollar.

// Neuer Kontostand nach einem Auftrag: Teile bezahlt die Firma, bei Erfolg zahlt der Kunde.
export function settleContract(cash, result, fee) {
  const after = cash - result.spent + (result.success ? fee : 0);
  return Math.round(after * 10) / 10;
}

// Pleite, wenn das Geld nicht mehr für den billigsten möglichen Auftrag reicht
export function isBankrupt(cash, cheapestMission) {
  return cash < cheapestMission;
}
