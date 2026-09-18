const listeners = new Set();

const dairyProducts = [
  { id: 1, name: "Milk 500ml Packet", sku: "DK-001", unit: "packets", capacity: 80, quantity: 64, lowThreshold: 15, soldToday: 18 },
  { id: 2, name: "Curd 500ml", sku: "DK-002", unit: "packs", capacity: 60, quantity: 22, lowThreshold: 12, soldToday: 9 },
  { id: 3, name: "Butter 100g Packet", sku: "DK-003", unit: "packs", capacity: 50, quantity: 7, lowThreshold: 10, soldToday: 6 },
  { id: 4, name: "Paneer 200g", sku: "DK-004", unit: "packs", capacity: 40, quantity: 5, lowThreshold: 8, soldToday: 7 },
  { id: 5, name: "Cheese 200g Packet", sku: "DK-005", unit: "packets", capacity: 45, quantity: 30, lowThreshold: 12, soldToday: 4 },
];

function notify() {
  listeners.forEach((listener) => listener());
}

export function getDairyProducts() {
  return dairyProducts.map((product) => ({ ...product }));
}

export function subscribeDairyInStock(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function sellDairyProduct(sku, quantity = 1) {
  const product = dairyProducts.find((item) => item.sku === sku);
  if (!product) return false;
  product.quantity = Math.max(0, product.quantity - quantity);
  product.soldToday += quantity;
  notify();
  return true;
}