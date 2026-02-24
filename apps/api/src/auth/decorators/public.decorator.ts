import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Mark an endpoint as publicly accessible (no JWT required).
 *
 * @example
 * @Public()
 * @Get('status')
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
