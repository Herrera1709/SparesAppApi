import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// REPUESTOS REALES POR MARCA/MODELO
// ============================================

// Estructura: { make, model, yearFrom, yearTo, parts: [...] }
const realPartsByVehicle = [
  // TOYOTA COROLLA
  {
    make: 'Toyota',
    model: 'Corolla',
    yearFrom: 2010,
    yearTo: 2024,
    parts: [
      { sku: 'TOY-COR-BRAKE-PAD-F', name: 'Pastillas Freno Delantero', category: 'Frenos', brand: 'Brembo', partNumber: 'P06047', oemNumber: '04465-02120', price: 45.99, cost: 28.00 },
      { sku: 'TOY-COR-BRAKE-PAD-R', name: 'Pastillas Freno Trasero', category: 'Frenos', brand: 'Brembo', partNumber: 'P06048', oemNumber: '04466-02020', price: 42.99, cost: 26.00 },
      { sku: 'TOY-COR-FILTER-OIL', name: 'Filtro Aceite', category: 'Filtros', brand: 'Fram', partNumber: 'PH6607', oemNumber: '90915-YZZF1', price: 8.99, cost: 4.50 },
      { sku: 'TOY-COR-FILTER-AIR', name: 'Filtro Aire', category: 'Filtros', brand: 'K&N', partNumber: '33-2031-2', oemNumber: '17801-0E010', price: 24.99, cost: 15.00 },
      { sku: 'TOY-COR-SPARK-PLUG', name: 'Bujía Iridium', category: 'Motor', brand: 'NGK', partNumber: 'LFR6AIX-11', oemNumber: '90919-01239', price: 12.99, cost: 7.50 },
      { sku: 'TOY-COR-BATTERY', name: 'Batería 12V', category: 'Eléctrico', brand: 'Optima', partNumber: '8004-003', oemNumber: '28800-0E010', price: 189.99, cost: 120.00 },
    ]
  },
  // TOYOTA CAMRY
  {
    make: 'Toyota',
    model: 'Camry',
    yearFrom: 2010,
    yearTo: 2024,
    parts: [
      { sku: 'TOY-CAM-BRAKE-PAD-F', name: 'Pastillas Freno Delantero', category: 'Frenos', brand: 'Brembo', partNumber: 'P06049', oemNumber: '04465-06160', price: 48.99, cost: 30.00 },
      { sku: 'TOY-CAM-FILTER-OIL', name: 'Filtro Aceite', category: 'Filtros', brand: 'Fram', partNumber: 'PH3614', oemNumber: '90915-YZZF1', price: 9.99, cost: 5.00 },
      { sku: 'TOY-CAM-SPARK-PLUG', name: 'Bujía Iridium', category: 'Motor', brand: 'NGK', partNumber: 'ILZKR7B-11', oemNumber: '90919-01239', price: 13.99, cost: 8.00 },
      { sku: 'TOY-CAM-STRUT-F', name: 'Amortiguador Delantero', category: 'Suspensión', brand: 'Monroe', partNumber: '171780', oemNumber: '48510-06210', price: 195.99, cost: 125.00 },
    ]
  },
  // HONDA CIVIC
  {
    make: 'Honda',
    model: 'Civic',
    yearFrom: 2010,
    yearTo: 2024,
    parts: [
      { sku: 'HON-CIV-BRAKE-PAD-F', name: 'Pastillas Freno Delantero', category: 'Frenos', brand: 'Brembo', partNumber: 'P06050', oemNumber: '45022-TBA-A11', price: 46.99, cost: 29.00 },
      { sku: 'HON-CIV-FILTER-OIL', name: 'Filtro Aceite', category: 'Filtros', brand: 'Fram', partNumber: 'PH6607', oemNumber: '15400-PLM-A01', price: 8.99, cost: 4.50 },
      { sku: 'HON-CIV-SPARK-PLUG', name: 'Bujía Iridium', category: 'Motor', brand: 'NGK', partNumber: 'ILZKR7B-11', oemNumber: '98079-56740', price: 12.99, cost: 7.50 },
      { sku: 'HON-CIV-BATTERY', name: 'Batería 12V', category: 'Eléctrico', brand: 'Optima', partNumber: '8004-003', oemNumber: '31500-TBA-A11', price: 189.99, cost: 120.00 },
    ]
  },
  // HONDA ACCORD
  {
    make: 'Honda',
    model: 'Accord',
    yearFrom: 2010,
    yearTo: 2024,
    parts: [
      { sku: 'HON-ACC-BRAKE-PAD-F', name: 'Pastillas Freno Delantero', category: 'Frenos', brand: 'Brembo', partNumber: 'P06051', oemNumber: '45022-T2A-A01', price: 49.99, cost: 31.00 },
      { sku: 'HON-ACC-FILTER-OIL', name: 'Filtro Aceite', category: 'Filtros', brand: 'Fram', partNumber: 'PH3614', oemNumber: '15400-PLM-A01', price: 9.99, cost: 5.00 },
      { sku: 'HON-ACC-SPARK-PLUG', name: 'Bujía Iridium', category: 'Motor', brand: 'NGK', partNumber: 'ILZKR7B-11', oemNumber: '98079-56740', price: 13.99, cost: 8.00 },
    ]
  },
  // FORD F-150
  {
    make: 'Ford',
    model: 'F-150',
    yearFrom: 2010,
    yearTo: 2024,
    parts: [
      { sku: 'FOR-F150-BRAKE-PAD-F', name: 'Pastillas Freno Delantero', category: 'Frenos', brand: 'Brembo', partNumber: 'P06052', oemNumber: 'BC3Z-2001-A', price: 52.99, cost: 33.00 },
      { sku: 'FOR-F150-FILTER-OIL', name: 'Filtro Aceite', category: 'Filtros', brand: 'Motorcraft', partNumber: 'FL-820S', oemNumber: 'FL-820S', price: 9.99, cost: 5.00 },
      { sku: 'FOR-F150-SPARK-PLUG', name: 'Bujía Iridium', category: 'Motor', brand: 'Motorcraft', partNumber: 'SP-580', oemNumber: 'SP-580', price: 14.99, cost: 9.00 },
      { sku: 'FOR-F150-BATTERY', name: 'Batería 12V', category: 'Eléctrico', brand: 'Motorcraft', partNumber: 'BXT-65-750', oemNumber: 'BXT-65-750', price: 199.99, cost: 130.00 },
    ]
  },
  // CHEVROLET SILVERADO
  {
    make: 'Chevrolet',
    model: 'Silverado',
    yearFrom: 2010,
    yearTo: 2024,
    parts: [
      { sku: 'CHE-SIL-BRAKE-PAD-F', name: 'Pastillas Freno Delantero', category: 'Frenos', brand: 'ACDelco', partNumber: '18FR1234', oemNumber: '88909667', price: 48.99, cost: 30.00 },
      { sku: 'CHE-SIL-FILTER-OIL', name: 'Filtro Aceite', category: 'Filtros', brand: 'ACDelco', partNumber: 'PF61', oemNumber: '12640460', price: 9.99, cost: 5.00 },
      { sku: 'CHE-SIL-SPARK-PLUG', name: 'Bujía Iridium', category: 'Motor', brand: 'ACDelco', partNumber: '41-110', oemNumber: '12625036', price: 13.99, cost: 8.00 },
    ]
  },
  // NISSAN ALTIMA
  {
    make: 'Nissan',
    model: 'Altima',
    yearFrom: 2010,
    yearTo: 2024,
    parts: [
      { sku: 'NIS-ALT-BRAKE-PAD-F', name: 'Pastillas Freno Delantero', category: 'Frenos', brand: 'Brembo', partNumber: 'P06053', oemNumber: '41060-1EA0A', price: 47.99, cost: 29.50 },
      { sku: 'NIS-ALT-FILTER-OIL', name: 'Filtro Aceite', category: 'Filtros', brand: 'Fram', partNumber: 'PH6607', oemNumber: '15208-65F0A', price: 8.99, cost: 4.50 },
      { sku: 'NIS-ALT-SPARK-PLUG', name: 'Bujía Iridium', category: 'Motor', brand: 'NGK', partNumber: 'ILZKR7B-11', oemNumber: '22401-1EA0A', price: 12.99, cost: 7.50 },
    ]
  },
  // BMW 3 SERIES
  {
    make: 'BMW',
    model: '3 Series',
    yearFrom: 2010,
    yearTo: 2024,
    parts: [
      { sku: 'BMW-3S-BRAKE-PAD-F', name: 'Pastillas Freno Delantero', category: 'Frenos', brand: 'Brembo', partNumber: 'P06054', oemNumber: '34116798617', price: 89.99, cost: 55.00 },
      { sku: 'BMW-3S-FILTER-OIL', name: 'Filtro Aceite', category: 'Filtros', brand: 'Mann', partNumber: 'HU718X', oemNumber: '11427566325', price: 14.99, cost: 9.00 },
      { sku: 'BMW-3S-SPARK-PLUG', name: 'Bujía Iridium', category: 'Motor', brand: 'NGK', partNumber: 'ILZKR7B-11', oemNumber: '12120039664', price: 18.99, cost: 11.00 },
      { sku: 'BMW-3S-BATTERY', name: 'Batería AGM', category: 'Eléctrico', brand: 'Optima', partNumber: '8014-045', oemNumber: '61217544719', price: 245.99, cost: 160.00 },
    ]
  },
  // MERCEDES-BENZ C-CLASS
  {
    make: 'Mercedes-Benz',
    model: 'C-Class',
    yearFrom: 2010,
    yearTo: 2024,
    parts: [
      { sku: 'MB-C-BRAKE-PAD-F', name: 'Pastillas Freno Delantero', category: 'Frenos', brand: 'Brembo', partNumber: 'P06055', oemNumber: 'A0004208817', price: 95.99, cost: 60.00 },
      { sku: 'MB-C-FILTER-OIL', name: 'Filtro Aceite', category: 'Filtros', brand: 'Mann', partNumber: 'HU718X', oemNumber: 'A0001802609', price: 15.99, cost: 10.00 },
      { sku: 'MB-C-SPARK-PLUG', name: 'Bujía Iridium', category: 'Motor', brand: 'NGK', partNumber: 'ILZKR7B-11', oemNumber: 'A0001592603', price: 19.99, cost: 12.00 },
    ]
  },
];

// Repuestos universales (aplican a todos los vehículos)
const universalParts = [
  { sku: 'UNIV-BRAKE-FLUID', name: 'Líquido Freno DOT 4', category: 'Frenos', brand: 'Castrol', partNumber: 'BF4-1L', price: 12.99, cost: 7.00, isUniversal: true },
  { sku: 'UNIV-OIL-5W30', name: 'Aceite 5W-30 Sintético', category: 'Lubricantes', brand: 'Mobil 1', partNumber: 'M1-5W30-5QT', price: 28.99, cost: 18.00, isUniversal: true },
  { sku: 'UNIV-OIL-10W30', name: 'Aceite 10W-30', category: 'Lubricantes', brand: 'Valvoline', partNumber: 'VV-10W30-5QT', price: 24.99, cost: 15.00, isUniversal: true },
  { sku: 'UNIV-FUSE-KIT', name: 'Kit Fusibles', category: 'Eléctrico', brand: 'Bussmann', partNumber: 'BP/HHH-ATM', price: 12.99, cost: 7.00, isUniversal: true },
  { sku: 'UNIV-AIR-FRESH', name: 'Ambientador Auto', category: 'Accesorios', brand: 'Febreze', partNumber: 'FRZ-AUTO', price: 4.99, cost: 2.50, isUniversal: true },
];

// Plantillas de repuestos comunes por categoría
const commonPartsTemplates = {
  'Frenos': [
    { name: 'Pastillas Freno Delantero', brand: 'Brembo', basePrice: 45.99, baseCost: 28.00 },
    { name: 'Pastillas Freno Trasero', brand: 'Brembo', basePrice: 42.99, baseCost: 26.00 },
    { name: 'Disco Freno Delantero', brand: 'Brembo', basePrice: 89.99, baseCost: 55.00 },
    { name: 'Disco Freno Trasero', brand: 'Brembo', basePrice: 79.99, baseCost: 48.00 },
  ],
  'Filtros': [
    { name: 'Filtro Aceite', brand: 'Fram', basePrice: 8.99, baseCost: 4.50 },
    { name: 'Filtro Aire', brand: 'K&N', basePrice: 24.99, baseCost: 15.00 },
    { name: 'Filtro Combustible', brand: 'Motorcraft', basePrice: 18.99, baseCost: 11.00 },
    { name: 'Filtro Aire Acondicionado', brand: 'Fram', basePrice: 14.99, baseCost: 8.00 },
  ],
  'Motor': [
    { name: 'Bujía Iridium', brand: 'NGK', basePrice: 12.99, baseCost: 7.50 },
    { name: 'Bobina Encendido', brand: 'Denso', basePrice: 89.99, baseCost: 55.00 },
    { name: 'Correa Distribución', brand: 'Gates', basePrice: 125.99, baseCost: 80.00 },
    { name: 'Bomba Agua', category: 'Motor', brand: 'Gates', basePrice: 95.99, baseCost: 60.00 },
  ],
  'Eléctrico': [
    { name: 'Batería 12V', brand: 'Optima', basePrice: 189.99, baseCost: 120.00 },
    { name: 'Alternador', brand: 'Denso', basePrice: 245.99, baseCost: 160.00 },
    { name: 'Motor Arranque', brand: 'Denso', basePrice: 195.99, baseCost: 125.00 },
  ],
  'Suspensión': [
    { name: 'Amortiguador Delantero', brand: 'Monroe', basePrice: 89.99, baseCost: 55.00 },
    { name: 'Amortiguador Trasero', brand: 'Monroe', basePrice: 79.99, baseCost: 48.00 },
    { name: 'Rótula', brand: 'Moog', basePrice: 45.99, baseCost: 28.00 },
  ],
};

async function main() {
  console.log('🌱 Iniciando seed con repuestos REALES...\n');

  // Obtener todos los vehículos existentes
  const allVehicles = await prisma.vehicle.findMany({
    where: { isActive: true },
    include: { variants: true },
  });

  console.log(`📦 Procesando ${allVehicles.length} vehículos...\n`);

  let totalProducts = 0;
  let totalFitments = 0;

  // Procesar repuestos específicos por vehículo (de la lista realPartsByVehicle)
  for (const vehicleSpec of realPartsByVehicle) {
    const matchingVehicles = allVehicles.filter(v => 
      v.make.toLowerCase() === vehicleSpec.make.toLowerCase() &&
      v.model.toLowerCase() === vehicleSpec.model.toLowerCase() &&
      v.yearFrom <= vehicleSpec.yearTo &&
      v.yearTo >= vehicleSpec.yearFrom
    );

    if (matchingVehicles.length === 0) continue;

    for (const vehicle of matchingVehicles) {
      for (const partData of vehicleSpec.parts) {
        const product = await prisma.product.upsert({
          where: { sku: partData.sku },
          update: partData,
          create: {
            ...partData,
            isUniversal: false,
            isActive: true,
          },
        });
        totalProducts++;

        await prisma.partFitment.upsert({
          where: {
            id: `${product.id}-${vehicle.id}`,
          },
          update: {
            productId: product.id,
            vehicleId: vehicle.id,
            yearFrom: vehicle.yearFrom,
            yearTo: vehicle.yearTo,
            isActive: true,
          },
          create: {
            id: `${product.id}-${vehicle.id}`,
            productId: product.id,
            vehicleId: vehicle.id,
            yearFrom: vehicle.yearFrom,
            yearTo: vehicle.yearTo,
            isActive: true,
          },
        });
        totalFitments++;
      }
    }
  }

  // Generar repuestos comunes para TODOS los vehículos
  console.log('📦 Generando repuestos comunes para todos los vehículos...');
  let partCounter = 1000;
  
  for (const vehicle of allVehicles) {
    // Para cada categoría, crear algunos repuestos
    for (const [category, templates] of Object.entries(commonPartsTemplates)) {
      // Crear 2-3 repuestos por categoría para cada vehículo
      const numParts = Math.floor(Math.random() * 2) + 2;
      const selectedTemplates = templates.sort(() => Math.random() - 0.5).slice(0, numParts);
      
      for (const template of selectedTemplates) {
        const makeCode = vehicle.make.substring(0, 3).toUpperCase();
        const modelCode = vehicle.model.substring(0, 3).toUpperCase();
        const partCode = template.name.substring(0, 3).toUpperCase().replace(/\s/g, '');
        const sku = `${makeCode}-${modelCode}-${partCode}-${partCounter}`;
        
        // Generar códigos realistas
        const partNumber = `${template.brand.substring(0, 2).toUpperCase()}-${Math.floor(Math.random() * 9000) + 1000}`;
        const oemNumber = `${makeCode}${Math.floor(Math.random() * 900000) + 100000}`;
        
        const product = await prisma.product.upsert({
          where: { sku },
          update: {},
          create: {
            sku,
            name: `${template.name} ${vehicle.make} ${vehicle.model}`,
            category,
            brand: template.brand,
            partNumber,
            oemNumber,
            price: template.basePrice + (Math.random() * 20 - 10),
            cost: template.baseCost + (Math.random() * 10 - 5),
            isUniversal: false,
            isActive: true,
          },
        });
        totalProducts++;

        // Crear compatibilidad
        await prisma.partFitment.create({
          data: {
            productId: product.id,
            vehicleId: vehicle.id,
            yearFrom: vehicle.yearFrom,
            yearTo: vehicle.yearTo,
            isActive: true,
          },
        });
        totalFitments++;
        partCounter++;
      }
    }
  }

  // Crear repuestos universales
  console.log('📦 Creando repuestos universales...');
  for (const partData of universalParts) {
    await prisma.product.upsert({
      where: { sku: partData.sku },
      update: partData,
      create: {
        ...partData,
        isActive: true,
      },
    });
    totalProducts++;
  }

  // Crear inventario para todos los productos
  console.log('📊 Creando inventario...');
  const allProducts = await prisma.product.findMany({
    where: { isActive: true },
  });

  let inventoryCount = 0;
  for (const product of allProducts) {
    const existing = await prisma.inventory.findFirst({
      where: { productId: product.id },
    });

    if (!existing) {
      const quantity = Math.floor(Math.random() * 100) + 10;
      await prisma.inventory.create({
        data: {
          productId: product.id,
          quantity,
          minQuantity: Math.floor(quantity * 0.2),
          maxQuantity: quantity * 2,
          location: `A-${Math.floor(Math.random() * 10) + 1}-${Math.floor(Math.random() * 20) + 1}`,
          warehouse: 'Almacén Principal',
        },
      });
      inventoryCount++;
    }
  }

  console.log('\n✅ Seed completado!\n');
  console.log('📊 Resumen:');
  console.log(`   - ${totalProducts} productos creados/actualizados`);
  console.log(`   - ${totalFitments} compatibilidades creadas`);
  console.log(`   - ${inventoryCount} registros de inventario creados`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

