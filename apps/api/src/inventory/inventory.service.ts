import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { CreateMovementDto } from './dto/create-movement.dto';
import { InventoryMovementType, Prisma } from '@prisma/client';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);
  constructor(private prisma: PrismaService) {}

  // ============================================
  // PRODUCTOS
  // ============================================

  async createProduct(createProductDto: CreateProductDto) {
    // Verificar si el SKU ya existe
    const existingProduct = await this.prisma.product.findUnique({
      where: { sku: createProductDto.sku },
    });

    if (existingProduct) {
      throw new ConflictException(`Ya existe un producto con el SKU: ${createProductDto.sku}`);
    }

    return this.prisma.product.create({
      data: createProductDto,
    });
  }

  async findAllProducts(filters?: {
    search?: string;
    category?: string;
    brand?: string;
    vehicleId?: string;
    vehicleVariantId?: string;
    isActive?: boolean;
    includeUniversal?: boolean;
  }) {
    try {
      const where: Prisma.ProductWhereInput = {};

      // Búsqueda por texto (nombre, SKU, partNumber, OEM)
      if (filters?.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { sku: { contains: filters.search, mode: 'insensitive' } },
          { partNumber: { contains: filters.search, mode: 'insensitive' } },
          { oemNumber: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
          { barcode: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      if (filters?.category) {
        where.category = filters.category;
      }

      if (filters?.brand) {
        where.brand = filters.brand;
      }

      if (filters?.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      // ============================================
      // FILTRAR POR COMPATIBILIDAD DE VEHÍCULO
      // ============================================
      if (filters?.vehicleId || filters?.vehicleVariantId) {
        const fitmentWhere: Prisma.PartFitmentWhereInput = {
          isActive: true,
        };

        if (filters.vehicleVariantId) {
          fitmentWhere.vehicleVariantId = filters.vehicleVariantId;
        } else if (filters.vehicleId) {
          fitmentWhere.vehicleId = filters.vehicleId;
        }

        // Si se incluyen universales, usar OR
        if (filters.includeUniversal !== false) {
          where.OR = [
            { fitments: { some: fitmentWhere } },
            { isUniversal: true },
          ];
        } else {
          where.fitments = { some: fitmentWhere };
        }
      } else {
        // Si no hay vehículo seleccionado, mostrar todos los productos
        // (universales y los que tienen compatibilidades)
        // No aplicar filtro de vehículo, mostrar todo
      }

      return this.prisma.product.findMany({
        where,
        include: {
          inventoryItems: {
            include: {
              _count: {
                select: { movements: true },
              },
            },
          },
          fitments: {
            where: { isActive: true },
            include: {
              vehicle: {
                select: {
                  id: true,
                  make: true,
                  model: true,
                  yearFrom: true,
                  yearTo: true,
                },
              },
              vehicleVariant: {
                select: {
                  id: true,
                  trim: true,
                  engine: true,
                  transmission: true,
                },
              },
            },
          },
          _count: {
            select: { inventoryItems: true, movements: true, fitments: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error: any) {
      // Si la tabla no existe, retornar array vacío en lugar de lanzar error
      if (error.code === 'P2021' || error.code === '42P01' || error.message?.includes('does not exist')) {
        this.logger.warn('Las tablas de inventario no existen. Ejecuta la migración: npx prisma migrate dev');
        return [];
      }
      throw error;
    }
  }

  async findProductById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        inventoryItems: {
          include: {
            _count: {
              select: { movements: true },
            },
          },
        },
        movements: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            inventory: true,
            performedByUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        fitments: {
          include: {
            vehicle: true,
            vehicleVariant: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    return product;
  }

  async findProductBySku(sku: string) {
    const product = await this.prisma.product.findUnique({
      where: { sku },
      include: {
        inventoryItems: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Producto con SKU ${sku} no encontrado`);
    }

    return product;
  }

  async updateProduct(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    // Si se actualiza el SKU, verificar que no exista otro producto con ese SKU
    if (updateProductDto.sku && updateProductDto.sku !== product.sku) {
      const existingProduct = await this.prisma.product.findUnique({
        where: { sku: updateProductDto.sku },
      });

      if (existingProduct) {
        throw new ConflictException(`Ya existe un producto con el SKU: ${updateProductDto.sku}`);
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: updateProductDto,
    });
  }

  async deleteProduct(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        inventoryItems: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    // Verificar si hay inventario asociado
    if (product.inventoryItems.length > 0) {
      throw new BadRequestException(
        'No se puede eliminar el producto porque tiene inventario asociado. Primero elimine o ajuste el inventario.',
      );
    }

    return this.prisma.product.delete({
      where: { id },
    });
  }

  // ============================================
  // INVENTARIO
  // ============================================

  async createInventory(createInventoryDto: CreateInventoryDto) {
    // Verificar que el producto existe
    const product = await this.prisma.product.findUnique({
      where: { id: createInventoryDto.productId },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    // Verificar si ya existe inventario para este producto en esta ubicación/almacén
    const existingInventory = await this.prisma.inventory.findFirst({
      where: {
        productId: createInventoryDto.productId,
        location: createInventoryDto.location || null,
        warehouse: createInventoryDto.warehouse || null,
      },
    });

    if (existingInventory) {
      throw new ConflictException(
        'Ya existe inventario para este producto en esta ubicación/almacén. Use actualizar en su lugar.',
      );
    }

    return this.prisma.inventory.create({
      data: {
        ...createInventoryDto,
        quantity: createInventoryDto.quantity || 0,
        minQuantity: createInventoryDto.minQuantity || 0,
      },
      include: {
        product: true,
      },
    });
  }

  async findAllInventory(filters?: {
    productId?: string;
    location?: string;
    warehouse?: string;
    lowStock?: boolean; // Productos con stock bajo (quantity <= minQuantity)
  }) {
    try {
      const where: Prisma.InventoryWhereInput = {};

      if (filters?.productId) {
        where.productId = filters.productId;
      }

      if (filters?.location) {
        where.location = filters.location;
      }

      if (filters?.warehouse) {
        where.warehouse = filters.warehouse;
      }

      // Nota: El filtro de lowStock se manejará después de obtener los resultados
      // porque Prisma no soporta comparaciones directas entre columnas en where

      const inventories = await this.prisma.inventory.findMany({
        where,
        include: {
          product: true,
          _count: {
            select: { movements: true },
          },
        },
        orderBy: [
          { warehouse: 'asc' },
          { location: 'asc' },
          { product: { name: 'asc' } },
        ],
      });

      // Filtrar por stock bajo si se solicita
      if (filters?.lowStock) {
        return inventories.filter(inv => inv.quantity <= inv.minQuantity);
      }

      return inventories;
    } catch (error: any) {
      // Si la tabla no existe, retornar array vacío en lugar de lanzar error
      if (error.code === 'P2021' || error.code === '42P01' || error.message?.includes('does not exist')) {
        this.logger.warn('Las tablas de inventario no existen. Ejecuta la migración: npx prisma migrate dev');
        return [];
      }
      throw error;
    }
  }

  async findInventoryById(id: string) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { id },
      include: {
        product: true,
        movements: {
          take: 50,
          orderBy: { createdAt: 'desc' },
          include: {
            performedByUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!inventory) {
      throw new NotFoundException('Inventario no encontrado');
    }

    return inventory;
  }

  async updateInventory(id: string, updateInventoryDto: UpdateInventoryDto) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { id },
    });

    if (!inventory) {
      throw new NotFoundException('Inventario no encontrado');
    }

    return this.prisma.inventory.update({
      where: { id },
      data: updateInventoryDto,
      include: {
        product: true,
      },
    });
  }

  async deleteInventory(id: string) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { id },
    });

    if (!inventory) {
      throw new NotFoundException('Inventario no encontrado');
    }

    if (inventory.quantity > 0) {
      throw new BadRequestException(
        'No se puede eliminar el inventario porque tiene stock. Primero ajuste la cantidad a 0.',
      );
    }

    return this.prisma.inventory.delete({
      where: { id },
    });
  }

  // ============================================
  // MOVIMIENTOS DE INVENTARIO
  // ============================================

  async createMovement(createMovementDto: CreateMovementDto, performedBy?: string) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { id: createMovementDto.inventoryId },
      include: { product: true },
    });

    if (!inventory) {
      throw new NotFoundException('Inventario no encontrado');
    }

    // Calcular la nueva cantidad según el tipo de movimiento
    let newQuantity = inventory.quantity;
    const movementQuantity = createMovementDto.quantity;

    switch (createMovementDto.type) {
      case InventoryMovementType.IN:
      case InventoryMovementType.RETURN:
        newQuantity += movementQuantity;
        break;
      case InventoryMovementType.OUT:
      case InventoryMovementType.DAMAGED:
      case InventoryMovementType.EXPIRED:
        newQuantity -= movementQuantity;
        if (newQuantity < 0) {
          throw new BadRequestException(
            `No hay suficiente stock. Stock actual: ${inventory.quantity}, intentando descontar: ${movementQuantity}`,
          );
        }
        break;
      case InventoryMovementType.ADJUSTMENT:
        // Para ajustes, la cantidad puede ser positiva o negativa
        newQuantity += movementQuantity;
        if (newQuantity < 0) {
          throw new BadRequestException('El ajuste resultaría en una cantidad negativa');
        }
        break;
      case InventoryMovementType.TRANSFER:
        // Las transferencias requieren lógica adicional (crear movimiento de salida y entrada)
        throw new BadRequestException('Las transferencias deben manejarse con un endpoint específico');
    }

    // Crear el movimiento
    const movement = await this.prisma.inventoryMovement.create({
      data: {
        inventoryId: createMovementDto.inventoryId,
        productId: inventory.productId,
        type: createMovementDto.type,
        quantity: createMovementDto.type === InventoryMovementType.OUT ||
                  createMovementDto.type === InventoryMovementType.DAMAGED ||
                  createMovementDto.type === InventoryMovementType.EXPIRED
          ? -movementQuantity
          : movementQuantity,
        reason: createMovementDto.reason,
        referenceId: createMovementDto.referenceId,
        referenceType: createMovementDto.referenceType,
        performedBy: performedBy,
        notes: createMovementDto.notes,
      },
    });

    // Actualizar la cantidad del inventario
    await this.prisma.inventory.update({
      where: { id: createMovementDto.inventoryId },
      data: {
        quantity: newQuantity,
        ...(createMovementDto.type === InventoryMovementType.IN && {
          lastRestockedAt: new Date(),
        }),
      },
    });

    return this.prisma.inventoryMovement.findUnique({
      where: { id: movement.id },
      include: {
        inventory: {
          include: { product: true },
        },
        product: true,
        performedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async findAllMovements(filters?: {
    inventoryId?: string;
    productId?: string;
    type?: InventoryMovementType;
    referenceId?: string;
    referenceType?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: Prisma.InventoryMovementWhereInput = {};

    if (filters?.inventoryId) {
      where.inventoryId = filters.inventoryId;
    }

    if (filters?.productId) {
      where.productId = filters.productId;
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.referenceId) {
      where.referenceId = filters.referenceId;
    }

    if (filters?.referenceType) {
      where.referenceType = filters.referenceType;
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    return this.prisma.inventoryMovement.findMany({
      where,
      include: {
        inventory: {
          include: { product: true },
        },
        product: true,
        performedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000, // Límite para evitar sobrecarga
    });
  }

  // ============================================
  // MÉTODOS ESPECIALES
  // ============================================

  /**
   * Descuenta inventario cuando se entrega una orden
   */
  async deductInventoryForOrder(orderId: string, productId: string, quantity: number, performedBy?: string) {
    // Buscar inventario disponible para este producto
    const inventoryItems = await this.prisma.inventory.findMany({
      where: {
        productId,
        quantity: { gt: 0 },
      },
      orderBy: { createdAt: 'asc' }, // FIFO: primero en entrar, primero en salir
    });

    if (inventoryItems.length === 0) {
      throw new BadRequestException(`No hay stock disponible para el producto ${productId}`);
    }

    let remainingQuantity = quantity;
    const movements = [];

    for (const inventory of inventoryItems) {
      if (remainingQuantity <= 0) break;

      const deductQuantity = Math.min(remainingQuantity, inventory.quantity);

      // Crear movimiento de salida
      const movement = await this.createMovement(
        {
          inventoryId: inventory.id,
          type: InventoryMovementType.OUT,
          quantity: deductQuantity,
          reason: 'Entrega de pedido',
          referenceId: orderId,
          referenceType: 'ORDER',
          notes: `Descuento automático por entrega de orden ${orderId}`,
        },
        performedBy,
      );

      movements.push(movement);
      remainingQuantity -= deductQuantity;
    }

    if (remainingQuantity > 0) {
      throw new BadRequestException(
        `Stock insuficiente. Faltan ${remainingQuantity} unidades para completar la entrega.`,
      );
    }

    return movements;
  }

  /**
   * Obtiene estadísticas del inventario
   */
  async getInventoryStats() {
    const [totalProducts, inventories, totalValue] = await Promise.all([
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.inventory.findMany({
        include: { product: true },
      }),
      this.prisma.inventory.aggregate({
        _sum: {
          quantity: true,
        },
      }),
    ]);

    const totalInventoryItems = inventories.length;
    const lowStockItems = inventories.filter(inv => inv.quantity <= inv.minQuantity).length;

    // Calcular valor total del inventario
    const totalInventoryValue = inventories.reduce((sum, inv) => {
      const cost = Number(inv.product.cost || 0);
      return sum + inv.quantity * cost;
    }, 0);

    return {
      totalProducts,
      totalInventoryItems,
      lowStockItems,
      totalQuantity: totalValue._sum.quantity || 0,
      totalInventoryValue,
    };
  }

  /**
   * Poblar el inventario con datos de ejemplo
   * Solo para desarrollo/demostración
   */
  async seedInventory() {
    try {
      // Verificar que las tablas existan
      await this.prisma.$queryRaw`SELECT 1 FROM "products" LIMIT 1`;
    } catch (error: any) {
      // Si la tabla no existe, lanzar error descriptivo
      if (error.code === 'P2021' || error.code === '42P01' || 
          error.message?.includes('does not exist') || 
          error.message?.includes('no existe') ||
          error.message?.includes('relation') && error.message?.includes('does not exist')) {
        throw new BadRequestException(
          'Las tablas de inventario no existen. Por favor ejecuta la migración primero: npx prisma migrate dev --name add_inventory_models'
        );
      }
      // Si hay otro error, continuar (puede ser que la tabla esté vacía)
    }

    const productos = [
      {
        sku: 'MOT-FREN-001',
        name: 'Pastillas de Freno Delanteras',
        description: 'Pastillas de freno delanteras para moto, material orgánico, compatible con múltiples modelos',
        category: 'Frenos',
        brand: 'EBC',
        price: new Prisma.Decimal(45.99),
        cost: new Prisma.Decimal(28.00),
        barcode: '1234567890201',
        isActive: true,
      },
      {
        sku: 'MOT-FREN-002',
        name: 'Pastillas de Freno Traseras',
        description: 'Pastillas de freno traseras para moto, alta resistencia al desgaste',
        category: 'Frenos',
        brand: 'EBC',
        price: new Prisma.Decimal(38.99),
        cost: new Prisma.Decimal(24.00),
        barcode: '1234567890202',
        isActive: true,
      },
      {
        sku: 'MOT-DISC-001',
        name: 'Disco de Freno Delantero',
        description: 'Disco de freno delantero 320mm, acero inoxidable, ventilado',
        category: 'Frenos',
        brand: 'Brembo',
        price: new Prisma.Decimal(125.99),
        cost: new Prisma.Decimal(85.00),
        barcode: '1234567890203',
        isActive: true,
      },
      {
        sku: 'MOT-FILT-001',
        name: 'Filtro de Aceite',
        description: 'Filtro de aceite para moto, alta capacidad de filtración, compatible con múltiples modelos',
        category: 'Motor',
        brand: 'K&N',
        price: new Prisma.Decimal(12.99),
        cost: new Prisma.Decimal(7.50),
        barcode: '1234567890204',
        isActive: true,
      },
      {
        sku: 'MOT-FILT-002',
        name: 'Filtro de Aire',
        description: 'Filtro de aire de alto flujo, lavable y reutilizable',
        category: 'Motor',
        brand: 'K&N',
        price: new Prisma.Decimal(45.99),
        cost: new Prisma.Decimal(28.00),
        barcode: '1234567890205',
        isActive: true,
      },
      {
        sku: 'MOT-CAD-001',
        name: 'Cadena de Transmisión',
        description: 'Cadena de transmisión 520, 110 eslabones, con eslabones maestros',
        category: 'Transmisión',
        brand: 'DID',
        price: new Prisma.Decimal(89.99),
        cost: new Prisma.Decimal(55.00),
        barcode: '1234567890206',
        isActive: true,
      },
      {
        sku: 'MOT-PIN-001',
        name: 'Piñón Trasero',
        description: 'Piñón trasero 42 dientes, acero templado, para cadena 520',
        category: 'Transmisión',
        brand: 'JT Sprockets',
        price: new Prisma.Decimal(35.99),
        cost: new Prisma.Decimal(22.00),
        barcode: '1234567890207',
        isActive: true,
      },
      {
        sku: 'MOT-PIN-002',
        name: 'Piñón Delantero',
        description: 'Piñón delantero 15 dientes, acero templado, para cadena 520',
        category: 'Transmisión',
        brand: 'JT Sprockets',
        price: new Prisma.Decimal(28.99),
        cost: new Prisma.Decimal(18.00),
        barcode: '1234567890208',
        isActive: true,
      },
      {
        sku: 'MOT-BAT-001',
        name: 'Batería de Litio',
        description: 'Batería de litio 12V 8Ah, ligera y de larga duración',
        category: 'Eléctrico',
        brand: 'Shorai',
        price: new Prisma.Decimal(189.99),
        cost: new Prisma.Decimal(125.00),
        barcode: '1234567890209',
        isActive: true,
      },
      {
        sku: 'MOT-BULB-001',
        name: 'Bombilla LED H4',
        description: 'Bombilla LED H4 12V, 6000K, alta luminosidad',
        category: 'Eléctrico',
        brand: 'Auxbeam',
        price: new Prisma.Decimal(24.99),
        cost: new Prisma.Decimal(15.00),
        barcode: '1234567890210',
        isActive: true,
      },
      {
        sku: 'MOT-ACE-001',
        name: 'Aceite de Motor 10W-40',
        description: 'Aceite de motor sintético 10W-40, 4 litros, para motos',
        category: 'Lubricantes',
        brand: 'Motul',
        price: new Prisma.Decimal(32.99),
        cost: new Prisma.Decimal(20.00),
        barcode: '1234567890211',
        isActive: true,
      },
      {
        sku: 'MOT-ACE-002',
        name: 'Aceite de Motor 15W-50',
        description: 'Aceite de motor sintético 15W-50, 4 litros, para motos de alto rendimiento',
        category: 'Lubricantes',
        brand: 'Motul',
        price: new Prisma.Decimal(38.99),
        cost: new Prisma.Decimal(24.00),
        barcode: '1234567890212',
        isActive: true,
      },
      {
        sku: 'MOT-ESP-001',
        name: 'Espejos Retrovisores',
        description: 'Par de espejos retrovisores cóncavos, ajustables, montaje universal',
        category: 'Accesorios',
        brand: 'EMGO',
        price: new Prisma.Decimal(45.99),
        cost: new Prisma.Decimal(28.00),
        barcode: '1234567890213',
        isActive: true,
      },
      {
        sku: 'MOT-GRIP-001',
        name: 'Manijas de Goma',
        description: 'Manijas de goma antideslizantes, cómodas y duraderas',
        category: 'Accesorios',
        brand: 'ProGrip',
        price: new Prisma.Decimal(18.99),
        cost: new Prisma.Decimal(12.00),
        barcode: '1234567890214',
        isActive: true,
      },
      {
        sku: 'MOT-ESC-001',
        name: 'Escapamento Completo',
        description: 'Sistema de escape completo, acero inoxidable, mejor rendimiento',
        category: 'Escape',
        brand: 'Yoshimura',
        price: new Prisma.Decimal(599.99),
        cost: new Prisma.Decimal(380.00),
        barcode: '1234567890215',
        isActive: true,
      },
      {
        sku: 'MOT-ESC-002',
        name: 'Silenciador',
        description: 'Silenciador de escape, acero inoxidable, montaje universal',
        category: 'Escape',
        brand: 'Two Brothers',
        price: new Prisma.Decimal(249.99),
        cost: new Prisma.Decimal(160.00),
        barcode: '1234567890216',
        isActive: true,
      },
    ];

    const productosCreados = [];
    for (const productoData of productos) {
      const producto = await this.prisma.product.upsert({
        where: { sku: productoData.sku },
        update: productoData,
        create: productoData,
      });
      productosCreados.push(producto);
    }

    const inventarios = [
      {
        productId: productosCreados[0].id, // Pastillas Freno Delanteras
        quantity: 45,
        minQuantity: 20,
        maxQuantity: 150,
        location: 'A-1-1',
        warehouse: 'Almacén Principal',
        notes: 'Zona de frenos - Alta rotación',
      },
      {
        productId: productosCreados[1].id, // Pastillas Freno Traseras
        quantity: 38,
        minQuantity: 15,
        maxQuantity: 120,
        location: 'A-1-2',
        warehouse: 'Almacén Principal',
        notes: 'Zona de frenos',
      },
      {
        productId: productosCreados[2].id, // Disco Freno Delantero
        quantity: 8, // Stock bajo
        minQuantity: 10,
        maxQuantity: 50,
        location: 'A-1-3',
        warehouse: 'Almacén Principal',
        notes: '⚠️ STOCK BAJO - Requiere reabastecimiento',
      },
      {
        productId: productosCreados[3].id, // Filtro Aceite
        quantity: 120,
        minQuantity: 50,
        maxQuantity: 300,
        location: 'B-1-1',
        warehouse: 'Almacén Secundario',
        notes: 'Producto de alta demanda',
      },
      {
        productId: productosCreados[4].id, // Filtro Aire
        quantity: 25,
        minQuantity: 15,
        maxQuantity: 80,
        location: 'B-1-2',
        warehouse: 'Almacén Secundario',
      },
      {
        productId: productosCreados[5].id, // Cadena Transmisión
        quantity: 6, // Stock bajo
        minQuantity: 5,
        maxQuantity: 25,
        location: 'A-2-1',
        warehouse: 'Almacén Principal',
        notes: 'Producto de alto valor',
      },
      {
        productId: productosCreados[6].id, // Piñón Trasero
        quantity: 35,
        minQuantity: 20,
        maxQuantity: 100,
        location: 'A-2-2',
        warehouse: 'Almacén Principal',
      },
      {
        productId: productosCreados[7].id, // Piñón Delantero
        quantity: 42,
        minQuantity: 25,
        maxQuantity: 120,
        location: 'A-2-3',
        warehouse: 'Almacén Principal',
      },
      {
        productId: productosCreados[8].id, // Batería Litio
        quantity: 15,
        minQuantity: 10,
        maxQuantity: 40,
        location: 'B-2-1',
        warehouse: 'Almacén Secundario',
        notes: 'Producto delicado, almacenar en lugar seco',
      },
      {
        productId: productosCreados[9].id, // Bombilla LED
        quantity: 85,
        minQuantity: 40,
        maxQuantity: 200,
        location: 'B-2-2',
        warehouse: 'Almacén Secundario',
      },
      {
        productId: productosCreados[10].id, // Aceite 10W-40
        quantity: 95,
        minQuantity: 50,
        maxQuantity: 250,
        location: 'A-3-1',
        warehouse: 'Almacén Principal',
        notes: 'Producto de mayor rotación',
      },
      {
        productId: productosCreados[11].id, // Aceite 15W-50
        quantity: 55,
        minQuantity: 30,
        maxQuantity: 150,
        location: 'A-3-2',
        warehouse: 'Almacén Principal',
      },
      {
        productId: productosCreados[12].id, // Espejos Retrovisores
        quantity: 28,
        minQuantity: 15,
        maxQuantity: 80,
        location: 'A-4-1',
        warehouse: 'Almacén Principal',
      },
      {
        productId: productosCreados[13].id, // Manijas Goma
        quantity: 75,
        minQuantity: 40,
        maxQuantity: 200,
        location: 'A-4-2',
        warehouse: 'Almacén Principal',
      },
      {
        productId: productosCreados[14].id, // Escape Completo
        quantity: 4, // Stock bajo
        minQuantity: 3,
        maxQuantity: 15,
        location: 'B-3-1',
        warehouse: 'Almacén Secundario',
        notes: 'Producto de alto valor - Stock limitado',
      },
      {
        productId: productosCreados[15].id, // Silenciador
        quantity: 12,
        minQuantity: 8,
        maxQuantity: 35,
        location: 'B-3-2',
        warehouse: 'Almacén Secundario',
      },
    ];

    const inventariosCreados = [];
    for (const invData of inventarios) {
      try {
        // Primero verificar si ya existe
        const existing = await this.prisma.inventory.findFirst({
          where: {
            productId: invData.productId,
            location: invData.location || null,
            warehouse: invData.warehouse || null,
          },
        });

        if (existing) {
          // Actualizar si existe
          const inventario = await this.prisma.inventory.update({
            where: { id: existing.id },
            data: invData,
          });
          inventariosCreados.push(inventario);
        } else {
          // Crear si no existe
          const inventario = await this.prisma.inventory.create({
            data: invData,
          });
          inventariosCreados.push(inventario);
        }
      } catch (error: any) {
        this.logger.error(`Error creando inventario para producto ${invData.productId}:`, error.message);
        // Continuar con el siguiente aunque falle uno
      }
    }

    return {
      message: 'Datos de ejemplo creados exitosamente',
      productos: productosCreados.length,
      inventarios: inventariosCreados.length,
      detalles: {
        productosCreados: productosCreados.map(p => ({ id: p.id, sku: p.sku, name: p.name })),
        inventariosCreados: inventariosCreados.map(i => ({ 
          id: i.id, 
          productId: i.productId, 
          quantity: i.quantity,
          location: i.location,
          warehouse: i.warehouse
        })),
      },
    };
  }
}

