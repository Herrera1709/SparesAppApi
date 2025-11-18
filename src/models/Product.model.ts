export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  brand: string;
  stock: number;
  compatibility: string[];
  rating: number;
  reviews: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

