import { apiFetch } from './client'
import type { Me, StoreInfo, StoreName } from './types'

/** Productcodes en de account-id die bij een aankoop mee moet. */
export const fetchStoreInfo = () => apiFetch<StoreInfo>('/mobile/store')

/**
 * Een aankoop (of herstelde aankoop) aan de website melden. De website controleert hem bij Apple/Google.
 * Fout met status 409 = definitief (bv. hoort bij een ander account); 503 of netwerkfout = later opnieuw proberen.
 */
export const reportPurchase = (store: StoreName, id: string, productId?: string) =>
  apiFetch<{ ok: true; active: boolean; me: Me | null; lessonCredits?: number }>('/mobile/store/purchase', {
    method: 'POST',
    // productId: sinds 8 nov 2026, zodat de website een losse les herkent (eenmalige aankoop).
    body: store === 'apple' ? { store, transactionId: id, productId } : { store, purchaseToken: id, productId },
  })
