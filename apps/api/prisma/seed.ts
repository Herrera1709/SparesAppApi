import { PrismaClient, InventoryMovementType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de datos...');

  // Crear productos de ejemplo
  console.log('📦 Creando productos...');
  
  const productos = [
    {
      sku: 'LAP-DELL-001',
      name: 'Laptop Dell XPS 15',
      description: 'Laptop Dell XPS 15 con procesador Intel i7, 16GB RAM, 512GB SSD',
      category: 'Electrónica',
      brand: 'Dell',
      price: 1299.99,
      cost: 950.00,
      barcode: '1234567890123',
      isActive: true,
    },
    {
      sku: 'PHN-IPH-001',
      name: 'iPhone 15 Pro Max',
      description: 'iPhone 15 Pro Max 256GB, color Natural Titanium',
      category: 'Electrónica',
      brand: 'Apple',
      price: 1199.99,
      cost: 980.00,
      barcode: '1234567890124',
      isActive: true,
    },
    {
      sku: 'TAB-SAM-001',
      name: 'Samsung Galaxy Tab S9',
      description: 'Tablet Samsung Galaxy Tab S9 12.4" 256GB',
      category: 'Electrónica',
      brand: 'Samsung',
      price: 899.99,
      cost: 720.00,
      barcode: '1234567890125',
      isActive: true,
    },
    {
      sku: 'AUD-AIR-001',
      name: 'AirPods Pro 2',
      description: 'AirPods Pro 2da generación con cancelación activa de ruido',
      category: 'Audio',
      brand: 'Apple',
      price: 249.99,
      cost: 180.00,
      barcode: '1234567890126',
      isActive: true,
    },
    {
      sku: 'WAT-APP-001',
      name: 'Apple Watch Series 9',
      description: 'Apple Watch Series 9 GPS 45mm, caja de aluminio',
      category: 'Wearables',
      brand: 'Apple',
      price: 429.99,
      cost: 320.00,
      barcode: '1234567890127',
      isActive: true,
    },
    {
      sku: 'CAM-CAN-001',
      name: 'Cámara Canon EOS R6',
      description: 'Cámara mirrorless Canon EOS R6 con lente 24-105mm',
      category: 'Fotografía',
      brand: 'Canon',
      price: 2499.99,
      cost: 1950.00,
      barcode: '1234567890128',
      isActive: true,
    },
    {
      sku: 'GAM-PS5-001',
      name: 'PlayStation 5',
      description: 'Consola PlayStation 5 con mando inalámbrico DualSense',
      category: 'Gaming',
      brand: 'Sony',
      price: 499.99,
      cost: 380.00,
      barcode: '1234567890129',
      isActive: true,
    },
    {
      sku: 'SPK-SON-001',
      name: 'Altavoz Sonos Era 300',
      description: 'Altavoz inteligente Sonos Era 300 con sonido espacial',
      category: 'Audio',
      brand: 'Sonos',
      price: 449.99,
      cost: 340.00,
      barcode: '1234567890130',
      isActive: true,
    },
    {
      sku: 'MON-LG-001',
      name: 'Monitor LG UltraWide 34"',
      description: 'Monitor LG UltraWide 34" 4K UHD con USB-C',
      category: 'Monitores',
      brand: 'LG',
      price: 599.99,
      cost: 450.00,
      barcode: '1234567890131',
      isActive: true,
    },
    {
      sku: 'KEY-MEC-001',
      name: 'Teclado Mecánico Logitech MX',
      description: 'Teclado mecánico Logitech MX Keys con iluminación RGB',
      category: 'Periféricos',
      brand: 'Logitech',
      price: 149.99,
      cost: 110.00,
      barcode: '1234567890132',
      isActive: true,
    },
    {
      sku: 'MOUS-LOG-001',
      name: 'Mouse Logitech MX Master 3S',
      description: 'Mouse inalámbrico Logitech MX Master 3S',
      category: 'Periféricos',
      brand: 'Logitech',
      price: 99.99,
      cost: 70.00,
      barcode: '1234567890133',
      isActive: true,
    },
    {
      sku: 'DRON-DJI-001',
      name: 'DJI Mini 4 Pro',
      description: 'Dron DJI Mini 4 Pro con cámara 4K y sensor de obstáculos',
      category: 'Drones',
      brand: 'DJI',
      price: 1099.99,
      cost: 850.00,
      barcode: '1234567890134',
      isActive: true,
    },
  ];

  const productosCreados = [];
  for (const productoData of productos) {
    const producto = await prisma.product.upsert({
      where: { sku: productoData.sku },
      update: productoData,
      create: productoData,
    });
    productosCreados.push(producto);
    console.log(`  ✓ Producto creado: ${producto.name}`);
  }

  // Crear registros de inventario
  console.log('\n📊 Creando registros de inventario...');
  
  const inventarios = [
    {
      productId: productosCreados[0].id, // Laptop Dell
      quantity: 25,
      minQuantity: 10,
      maxQuantity: 100,
      location: 'A-1-1',
      warehouse: 'Almacén Principal',
      notes: 'Ubicación en zona de electrónicos principales',
    },
    {
      productId: productosCreados[1].id, // iPhone
      quantity: 50,
      minQuantity: 20,
      maxQuantity: 150,
      location: 'A-1-2',
      warehouse: 'Almacén Principal',
      notes: 'Producto de alta rotación',
    },
    {
      productId: productosCreados[2].id, // Samsung Tab
      quantity: 15,
      minQuantity: 5,
      maxQuantity: 50,
      location: 'A-1-3',
      warehouse: 'Almacén Principal',
    },
    {
      productId: productosCreados[3].id, // AirPods
      quantity: 8, // Stock bajo para demostrar alerta
      minQuantity: 10,
      maxQuantity: 100,
      location: 'A-2-1',
      warehouse: 'Almacén Principal',
      notes: '⚠️ STOCK BAJO - Requiere reabastecimiento',
    },
    {
      productId: productosCreados[4].id, // Apple Watch
      quantity: 30,
      minQuantity: 15,
      maxQuantity: 80,
      location: 'A-2-2',
      warehouse: 'Almacén Principal',
    },
    {
      productId: productosCreados[5].id, // Canon Camera
      quantity: 5, // Stock bajo
      minQuantity: 3,
      maxQuantity: 20,
      location: 'B-1-1',
      warehouse: 'Almacén Secundario',
      notes: 'Producto de alto valor',
    },
    {
      productId: productosCreados[6].id, // PlayStation 5
      quantity: 40,
      minQuantity: 20,
      maxQuantity: 120,
      location: 'A-3-1',
      warehouse: 'Almacén Principal',
    },
    {
      productId: productosCreados[7].id, // Sonos Speaker
      quantity: 18,
      minQuantity: 10,
      maxQuantity: 60,
      location: 'A-3-2',
      warehouse: 'Almacén Principal',
    },
    {
      productId: productosCreados[8].id, // LG Monitor
      quantity: 22,
      minQuantity: 10,
      maxQuantity: 50,
      location: 'B-2-1',
      warehouse: 'Almacén Secundario',
    },
    {
      productId: productosCreados[9].id, // Logitech Keyboard
      quantity: 35,
      minQuantity: 15,
      maxQuantity: 100,
      location: 'A-4-1',
      warehouse: 'Almacén Principal',
    },
    {
      productId: productosCreados[10].id, // Logitech Mouse
      quantity: 45,
      minQuantity: 20,
      maxQuantity: 150,
      location: 'A-4-2',
      warehouse: 'Almacén Principal',
    },
    {
      productId: productosCreados[11].id, // DJI Drone
      quantity: 12,
      minQuantity: 5,
      maxQuantity: 30,
      location: 'B-3-1',
      warehouse: 'Almacén Secundario',
      notes: 'Producto delicado, manejar con cuidado',
    },
  ];

  const inventariosCreados = [];
  for (const invData of inventarios) {
    const inventario = await prisma.inventory.upsert({
      where: {
        productId_location_warehouse: {
          productId: invData.productId,
          location: invData.location || null,
          warehouse: invData.warehouse || null,
        },
      },
      update: invData,
      create: invData,
    });
    inventariosCreados.push(inventario);
    console.log(`  ✓ Inventario creado: ${invData.location} - ${invData.warehouse}`);
  }

  // Crear movimientos de inventario de ejemplo
  console.log('\n📝 Creando movimientos de inventario...');
  
  interface MovementData {
    inventoryId: string;
    productId: string;
    type: InventoryMovementType;
    quantity: number;
    reason?: string;
    referenceId?: string;
    referenceType?: string;
    notes?: string;
  }
  
  const movimientos: MovementData[] = [
    {
      inventoryId: inventariosCreados[0].id,
      productId: productosCreados[0].id,
      type: InventoryMovementType.IN,
      quantity: 30,
      reason: 'Reabastecimiento inicial',
      notes: 'Stock inicial del producto',
    },
    {
      inventoryId: inventariosCreados[0].id,
      productId: productosCreados[0].id,
      type: InventoryMovementType.OUT,
      quantity: 5,
      reason: 'Venta',
      referenceType: 'ORDER',
      notes: 'Venta realizada',
    },
    {
      inventoryId: inventariosCreados[1].id,
      productId: productosCreados[1].id,
      type: InventoryMovementType.IN,
      quantity: 50,
      reason: 'Compra a proveedor',
      notes: 'Lote completo recibido',
    },
    {
      inventoryId: inventariosCreados[3].id,
      productId: productosCreados[3].id,
      type: InventoryMovementType.OUT,
      quantity: 2,
      reason: 'Venta',
      referenceType: 'ORDER',
      notes: 'Stock bajo detectado',
    },
    {
      inventoryId: inventariosCreados[5].id,
      productId: productosCreados[5].id,
      type: InventoryMovementType.IN,
      quantity: 5,
      reason: 'Reabastecimiento',
      notes: 'Producto de alto valor',
    },
    {
      inventoryId: inventariosCreados[6].id,
      productId: productosCreados[6].id,
      type: InventoryMovementType.IN,
      quantity: 40,
      reason: 'Compra a proveedor',
      notes: 'Lote completo',
    },
    {
      inventoryId: inventariosCreados[6].id,
      productId: productosCreados[6].id,
      type: InventoryMovementType.OUT,
      quantity: 10,
      reason: 'Venta',
      referenceType: 'ORDER',
      notes: 'Múltiples ventas',
    },
    {
      inventoryId: inventariosCreados[8].id,
      productId: productosCreados[8].id,
      type: InventoryMovementType.ADJUSTMENT,
      quantity: 2,
      reason: 'Ajuste de inventario',
      notes: 'Corrección por conteo físico',
    },
    {
      inventoryId: inventariosCreados[10].id,
      productId: productosCreados[10].id,
      type: InventoryMovementType.IN,
      quantity: 45,
      reason: 'Reabastecimiento',
      notes: 'Producto de alta demanda',
    },
    {
      inventoryId: inventariosCreados[11].id,
      productId: productosCreados[11].id,
      type: InventoryMovementType.DAMAGED,
      quantity: 1,
      reason: 'Producto dañado en transporte',
      notes: 'Retirar del inventario disponible',
    },
  ];

  // Actualizar las cantidades según los movimientos
  for (const movData of movimientos) {
    const inventory = await prisma.inventory.findUnique({
      where: { id: movData.inventoryId },
    });

    if (inventory) {
      let newQuantity = inventory.quantity;
      const movementQuantity = movData.quantity;
      const movementType: InventoryMovementType = movData.type;
      
      // Calcular nueva cantidad según el tipo
      switch (movementType) {
        case InventoryMovementType.IN:
        case InventoryMovementType.RETURN:
          newQuantity += movementQuantity;
          break;
        case InventoryMovementType.ADJUSTMENT:
          // Los ajustes pueden ser positivos o negativos
          newQuantity += movementQuantity;
          break;
        case InventoryMovementType.OUT:
        case InventoryMovementType.DAMAGED:
        case InventoryMovementType.EXPIRED:
          newQuantity -= movementQuantity;
          break;
      }

      // Determinar cantidad a almacenar (negativa para salidas)
      let quantityToStore: number;
      switch (movementType) {
        case InventoryMovementType.OUT:
        case InventoryMovementType.DAMAGED:
        case InventoryMovementType.EXPIRED:
          quantityToStore = -movementQuantity;
          break;
        default:
          quantityToStore = movementQuantity;
      }

      // Crear el movimiento
      await prisma.inventoryMovement.create({
        data: {
          inventoryId: movData.inventoryId,
          productId: movData.productId,
          type: movementType,
          quantity: quantityToStore,
          reason: movData.reason || null,
          referenceId: movData.referenceId || null,
          referenceType: movData.referenceType || null,
          notes: movData.notes || null,
        },
      });

      // Actualizar la cantidad del inventario
      const updateData: any = {
        quantity: newQuantity,
      };

      if (movementType === InventoryMovementType.IN) {
        updateData.lastRestockedAt = new Date();
      }

      await prisma.inventory.update({
        where: { id: movData.inventoryId },
        data: updateData,
      });

      console.log(`  ✓ Movimiento creado: ${movementType} - ${movementQuantity} unidades`);
    }
  }

  console.log('\n✅ Seed completado exitosamente!');
  console.log(`\n📊 Resumen:`);
  console.log(`   - ${productosCreados.length} productos creados`);
  console.log(`   - ${inventariosCreados.length} registros de inventario creados`);
  console.log(`   - ${movimientos.length} movimientos de inventario creados`);
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

