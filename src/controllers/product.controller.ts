import { Request, Response } from 'express';
import { Product } from '../models/Product.model';

// Datos de ejemplo (en producción esto vendría de una base de datos)
let products: Product[] = [
  {
    id: 1,
    name: 'Filtro de Aceite Original',
    description: 'Filtro de aceite de alta calidad compatible con múltiples modelos de motocicletas. Filtración eficiente y durabilidad garantizada.',
    price: 12500,
    image: 'https://www.knfilters.com/media/wysiwyg/oil-filters/performance_gold.jpg',
    category: 'Filtros',
    brand: 'K&N',
    stock: 15,
    compatibility: ['Honda CBR', 'Yamaha R6', 'Kawasaki Ninja'],
    rating: 4.5,
    reviews: 23
  },
  {
    id: 2,
    name: 'Pastillas de Freno Delanteras',
    description: 'Pastillas de freno de cerámica premium. Excelente poder de frenado y resistencia al desgaste. Compatible con sistemas de freno de disco.',
    price: 18900,
    image: 'https://www.kmmotos.com/cdn/shop/files/KM-CP0123.png?v=1748225147&width=713',
    category: 'Frenos',
    brand: 'EBC',
    stock: 8,
    compatibility: ['Honda CBR', 'Yamaha R1', 'Suzuki GSX'],
    rating: 4.8,
    reviews: 45
  },
  {
    id: 3,
    name: 'Cadena de Transmisión O-Ring',
    description: 'Cadena de transmisión de alta resistencia con sellos O-ring. Lubricación interna permanente y mayor durabilidad.',
    price: 32500,
    image: 'https://m.media-amazon.com/images/I/81YSJVr6B8L.jpg',
    category: 'Transmisión',
    brand: 'DID',
    stock: 12,
    compatibility: ['Honda CBR', 'Yamaha R6', 'Kawasaki Ninja', 'Ducati'],
    rating: 4.7,
    reviews: 67
  },
  {
    id: 4,
    name: 'Aceite Motocicleta 10W-40',
    description: 'Aceite sintético de alto rendimiento para motocicletas. Protección superior del motor y transmisión.',
    price: 15900,
    image: 'https://citas.laguaca.cr/imagenes/MOTUL/05_4091/4091_1.PNG',
    category: 'Lubricantes',
    brand: 'Motul',
    stock: 25,
    compatibility: ['Universal'],
    rating: 4.6,
    reviews: 89
  },
  {
    id: 5,
    name: 'Bujía de Encendido Iridium',
    description: 'Bujía de iridio de alto rendimiento. Mejor combustión, mayor potencia y menor consumo de combustible.',
    price: 8900,
    image: 'https://www.capris.cr/media/catalog/product/cache/2f6b2b7ee41e3a231a46fe73c1b96633/n/g/ngk-dpr8eix-9-bujia-de-encendido-de-iridium-con-resistencia240397_msyoyqkqysrqjhdw.webp',
    category: 'Motor',
    brand: 'NGK',
    stock: 30,
    compatibility: ['Honda CBR', 'Yamaha R6', 'Kawasaki Ninja'],
    rating: 4.9,
    reviews: 112
  },
  {
    id: 6,
    name: 'Amortiguador Trasero Regulable',
    description: 'Amortiguador trasero de gas con ajuste de precarga. Mejora el confort y el rendimiento en carretera.',
    price: 125000,
    image: 'https://www.ramirezmoto.es/admin/pictures/zoom/Amortiguador-trasero-Ohlins-SU789-1.jpg',
    category: 'Suspensión',
    brand: 'Öhlins',
    stock: 5,
    compatibility: ['Yamaha R1', 'Ducati Panigale'],
    rating: 5.0,
    reviews: 34
  },
  {
    id: 7,
    name: 'Neumático Trasero Sport',
    description: 'Neumático de alto rendimiento para uso deportivo. Excelente agarre en seco y mojado.',
    price: 89000,
    image: 'https://dxm.contentcenter.michelin.com/api/wedia/dam/transform/b98rpyxf61b4q4enu14gk4a79o/mo-125_tire_michelin_road-6_ww_set_a_main_1-30_nopad.webp?t=resize&height=500',
    category: 'Neumáticos',
    brand: 'Michelin',
    stock: 10,
    compatibility: ['Universal'],
    rating: 4.8,
    reviews: 156
  },
  {
    id: 8,
    name: 'Kit de Embrague Completo',
    description: 'Kit completo de embrague con discos, muelles y placa de presión. Restauración completa del sistema de embrague.',
    price: 45000,
    image: 'https://m.media-amazon.com/images/I/61lesftaNLL.jpg',
    category: 'Transmisión',
    brand: 'EBC',
    stock: 7,
    compatibility: ['Honda CBR', 'Yamaha R6'],
    rating: 4.6,
    reviews: 28
  }
];

// Obtener todos los productos
export const getAllProducts = (req: Request, res: Response): void => {
  try {
    const { category, brand, search } = req.query;

    let filteredProducts = [...products];

    // Filtrar por categoría
    if (category && typeof category === 'string') {
      filteredProducts = filteredProducts.filter(
        p => p.category.toLowerCase() === category.toLowerCase()
      );
    }

    // Filtrar por marca
    if (brand && typeof brand === 'string') {
      filteredProducts = filteredProducts.filter(
        p => p.brand.toLowerCase() === brand.toLowerCase()
      );
    }

    // Buscar por nombre o descripción
    if (search && typeof search === 'string') {
      const searchLower = search.toLowerCase();
      filteredProducts = filteredProducts.filter(
        p => 
          p.name.toLowerCase().includes(searchLower) ||
          p.description.toLowerCase().includes(searchLower)
      );
    }

    res.json({
      success: true,
      count: filteredProducts.length,
      data: filteredProducts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener productos',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Obtener un producto por ID
export const getProductById = (req: Request, res: Response): void => {
  try {
    const id = parseInt(req.params.id);
    const product = products.find(p => p.id === id);

    if (!product) {
      res.status(404).json({
        success: false,
        message: `Producto con ID ${id} no encontrado`
      });
      return;
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener el producto',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Crear un nuevo producto
export const createProduct = (req: Request, res: Response): void => {
  try {
    const newProduct: Product = {
      id: products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1,
      ...req.body
    };

    products.push(newProduct);

    res.status(201).json({
      success: true,
      data: newProduct
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al crear el producto',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Actualizar un producto
export const updateProduct = (req: Request, res: Response): void => {
  try {
    const id = parseInt(req.params.id);
    const productIndex = products.findIndex(p => p.id === id);

    if (productIndex === -1) {
      res.status(404).json({
        success: false,
        message: `Producto con ID ${id} no encontrado`
      });
      return;
    }

    products[productIndex] = {
      ...products[productIndex],
      ...req.body,
      id // Asegurar que el ID no cambie
    };

    res.json({
      success: true,
      data: products[productIndex]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el producto',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Eliminar un producto
export const deleteProduct = (req: Request, res: Response): void => {
  try {
    const id = parseInt(req.params.id);
    const productIndex = products.findIndex(p => p.id === id);

    if (productIndex === -1) {
      res.status(404).json({
        success: false,
        message: `Producto con ID ${id} no encontrado`
      });
      return;
    }

    products.splice(productIndex, 1);

    res.json({
      success: true,
      message: `Producto con ID ${id} eliminado correctamente`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar el producto',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Obtener productos por categoría
export const getProductsByCategory = (req: Request, res: Response): void => {
  try {
    const category = req.params.category;
    const filteredProducts = products.filter(
      p => p.category.toLowerCase() === category.toLowerCase()
    );

    res.json({
      success: true,
      count: filteredProducts.length,
      data: filteredProducts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener productos por categoría',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

