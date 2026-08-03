import { SetMetadata } from '@nestjs/common';
import { ApiScope } from '@prisma/client';

export const REQUIRED_SCOPES = 'required_scopes';

/** Portées exigées par une route de l'API partenaires. */
export const Scopes = (...scopes: ApiScope[]) => SetMetadata(REQUIRED_SCOPES, scopes);
