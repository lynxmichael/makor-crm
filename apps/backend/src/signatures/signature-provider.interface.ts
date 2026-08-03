/**
 * Couche d'abstraction vers un prestataire de signature électronique.
 *
 * Le CDC impose déjà ce principe pour les passerelles SMS (§2.2) : aucune
 * autre partie du code ne doit connaître le prestataire réel. L'
 * implémentation par défaut est native — signature électronique simple,
 * sans tiers. Passer à Yousign ou DocuSign consistera à fournir une autre
 * implémentation à ce jeton, sans toucher aux modules métier.
 */
export const SIGNATURE_PROVIDER = Symbol('SIGNATURE_PROVIDER');

export interface SignatureDispatchParams {
  requestId: string;
  signerName: string;
  signerEmail: string;
  documentName: string;
  documentBuffer: Buffer;
  signUrl: string;
}

export interface SignatureDispatchResult {
  /** Renseigné quand un prestataire externe prend la main. */
  providerRequestId?: string;
  providerName: string;
}

export interface SignatureProvider {
  /** Transmet la demande au signataire. */
  dispatch(params: SignatureDispatchParams): Promise<SignatureDispatchResult>;
}
