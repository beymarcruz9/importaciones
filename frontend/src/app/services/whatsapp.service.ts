import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export type WhatsAppActionType = 'compra' | 'reserva';

@Injectable({
  providedIn: 'root',
})
export class WhatsappService {
  private readonly phone = environment.whatsappPhone; // 59172970461

  /**
   * Genera el enlace directo a la API de WhatsApp con el formato exacto requerido:
   * - Compra: "Hola, quiero comprar el producto [Nombre del Producto] de precio [Precio]."
   * - Reserva: "Hola, quiero reservar el producto [Nombre del Producto] de precio [Precio]."
   */
  /**
   * Genera el enlace directo a la API de WhatsApp con el formato exacto requerido:
   * - Compra: "Hola, quiero comprar el producto [Nombre del Producto] de precio [Precio]."
   * - Reserva: "Hola, quiero reservar el producto [Nombre del Producto] de precio [Precio]."
   * Soporta adicionalmente monto de adelanto para reservas y precio acordado con rebaja.
   */
  generateWhatsAppUrl(
    action: WhatsAppActionType,
    productName: string,
    price: number | string,
    options?: {
      advancePayment?: number;
      customOfferPrice?: number;
    }
  ): string {
    const formattedPrice = typeof price === 'number' ? `Bs ${price.toFixed(2)}` : `Bs ${price}`;

    let message = '';
    if (action === 'compra') {
      if (options?.customOfferPrice && options.customOfferPrice > 0 && options.customOfferPrice !== price) {
        const formattedOffer = `Bs ${options.customOfferPrice.toFixed(2)}`;
        message = `Hola, quiero comprar el producto ${productName} (Precio lista: ${formattedPrice}, precio acordado/rebaja: ${formattedOffer}).`;
      } else {
        message = `Hola, quiero comprar el producto ${productName} de precio ${formattedPrice}.`;
      }
    } else {
      if (options?.advancePayment && options.advancePayment > 0) {
        const formattedAdv = `Bs ${options.advancePayment.toFixed(2)}`;
        message = `Hola, quiero reservar el producto ${productName} de precio ${formattedPrice} con un adelanto de ${formattedAdv}.`;
      } else {
        message = `Hola, quiero reservar el producto ${productName} de precio ${formattedPrice}.`;
      }
    }

    const encodedText = encodeURIComponent(message);
    return `https://wa.me/${this.phone}?text=${encodedText}`;
  }

  /**
   * Genera el enlace directo para contacto general por WhatsApp
   */
  generateGeneralContactUrl(customMessage?: string): string {
    const msg = customMessage || 'Hola, me comunico desde el catálogo de Importadora de productos, quisiera hacer una consulta sobre importaciones.';
    return `https://wa.me/${this.phone}?text=${encodeURIComponent(msg)}`;
  }

  openGeneralChat(customMessage?: string): void {
    window.open(this.generateGeneralContactUrl(customMessage), '_blank', 'noopener,noreferrer');
  }

  /**
   * Abre la conversación de WhatsApp en una pestaña nueva
   */
  openChat(
    action: WhatsAppActionType,
    productName: string,
    price: number | string,
    options?: {
      advancePayment?: number;
      customOfferPrice?: number;
    }
  ): void {
    const url = this.generateWhatsAppUrl(action, productName, price, options);
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
