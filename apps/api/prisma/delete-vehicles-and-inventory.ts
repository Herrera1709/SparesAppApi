/**
 * Script para borrar todo lo relacionado con vehículos e inventario interno:
 * - PartFitment (compatibilidad producto-vehículo)
 * - VehicleVariant, Vehicle
 * - InventoryMovement, Inventory
 * - Product
 *
 * Los pedidos (Order) se mantienen; productId quedará en null.
 * Ejecutar desde apps/api: npx ts-node prisma/delete-vehicles-and-inventory.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Eliminando movimientos de inventario...');
  const delMovements = await prisma.inventoryMovement.deleteMany({});
  console.log(`  Eliminados: ${delMovements.count}`);

  console.log('Eliminando registros de inventario...');
  const delInv = await prisma.inventory.deleteMany({});
  console.log(`  Eliminados: ${delInv.count}`);

  console.log('Eliminando compatibilidades producto-vehículo (PartFitment)...');
  const delFitments = await prisma.partFitment.deleteMany({});
  console.log(`  Eliminados: ${delFitments.count}`);

  console.log('Eliminando variantes de vehículo...');
  const delVariants = await prisma.vehicleVariant.deleteMany({});
  console.log(`  Eliminados: ${delVariants.count}`);

  console.log('Eliminando vehículos...');
  const delVehicles = await prisma.vehicle.deleteMany({});
  console.log(`  Eliminados: ${delVehicles.count}`);

  console.log('Eliminando productos (catálogo interno)...');
  const delProducts = await prisma.product.deleteMany({});
  console.log(`  Eliminados: ${delProducts.count}`);

  console.log('\nListo. Vehículos, fitments, inventario y productos han sido eliminados.');
  console.log('Los pedidos se mantienen (productId en null donde aplicaba).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
