import { OrderStatus } from '@prisma/client';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  CREATED: 'Pedido Creado',
  REQUESTED: 'Solicitado',
  QUOTED: 'Cotizado',
  PAYMENT_PENDING: 'Pago Pendiente',
  PAID: 'Pagado',
  PURCHASED_FROM_STORE: 'Comprado en Tienda',
  ARRIVED_AT_FOREIGN_LOCKER: 'Llegó al Casillero Extranjero',
  IN_TRANSIT_TO_CR: 'En Tránsito a Costa Rica',
  ARRIVED_IN_CR: 'Llegó a Costa Rica',
  IN_CUSTOMS: 'En Aduanas',
  RELEASED_FROM_CUSTOMS: 'Liberado de Aduanas',
  IN_NATIONAL_LOCKER: 'En Casillero Nacional',
  OUT_FOR_DELIVERY: 'En Ruta de Entrega',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};

export const ORDER_STATUS_MESSAGES: Record<OrderStatus, string> = {
  CREATED: 'Tu pedido ha sido creado y está siendo procesado.',
  REQUESTED: 'Tu pedido ha sido solicitado y está en revisión.',
  QUOTED: 'Tu cotización está lista. Revisa los detalles y acepta cuando estés listo.',
  PAYMENT_PENDING: 'Tu pedido está pendiente de pago. Completa el pago para continuar.',
  PAID: 'Tu pago ha sido confirmado. Tu pedido está en proceso.',
  PURCHASED_FROM_STORE: 'Tu artículo ha sido comprado en la tienda y está siendo preparado para envío.',
  ARRIVED_AT_FOREIGN_LOCKER: 'Tu paquete llegó al casillero en el extranjero. Está siendo preparado para envío a Costa Rica.',
  IN_TRANSIT_TO_CR: 'Tu paquete está en camino hacia Costa Rica.',
  ARRIVED_IN_CR: '¡Tu pedido ha llegado a Costa Rica! Está siendo procesado para su entrega.',
  IN_CUSTOMS: 'Tu pedido está en proceso de aduanas. Esto puede tardar algunos días hábiles.',
  RELEASED_FROM_CUSTOMS: 'Tu pedido ha sido liberado de aduanas y está listo para entrega.',
  IN_NATIONAL_LOCKER: 'Tu pedido está en nuestro almacén nacional, listo para ser enviado.',
  OUT_FOR_DELIVERY: '¡Tu pedido está en camino! Será entregado pronto.',
  DELIVERED: '¡Tu pedido ha sido entregado exitosamente! Esperamos que disfrutes tu compra.',
  CANCELLED: 'Tu pedido ha sido cancelado.',
};

export const ORDER_STATUS_EXPLANATIONS: Partial<Record<OrderStatus, string>> = {
  IN_CUSTOMS: 'Tu pedido está siendo revisado por las autoridades aduaneras de Costa Rica. Este proceso es necesario para verificar que el producto cumple con las regulaciones de importación. Normalmente tarda entre 3-7 días hábiles.',
  ARRIVED_IN_CR: 'Tu pedido ha llegado a Costa Rica y está siendo procesado en nuestro centro de distribución. Pronto será enviado a tu dirección.',
  OUT_FOR_DELIVERY: 'Tu pedido está en ruta hacia tu dirección de entrega. El repartidor debería llegar en las próximas horas.',
};

export const ORDER_STATUS_ESTIMATED_DAYS: Partial<Record<OrderStatus, { min: number; max: number }>> = {
  IN_CUSTOMS: { min: 3, max: 7 },
  ARRIVED_AT_FOREIGN_LOCKER: { min: 2, max: 5 },
  IN_TRANSIT_TO_CR: { min: 5, max: 10 },
  ARRIVED_IN_CR: { min: 1, max: 3 },
  RELEASED_FROM_CUSTOMS: { min: 1, max: 2 },
  IN_NATIONAL_LOCKER: { min: 1, max: 2 },
  OUT_FOR_DELIVERY: { min: 1, max: 2 },
};

